import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRates, isEasyPostConfigured, EasyPostConfigError, EasyPostAPIError } from '@/lib/easypost'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items, address } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart items are required.', code: 'BAD_REQUEST' }, { status: 400 })
    }
    if (!address || !address.street || !address.city || !address.zip) {
      return NextResponse.json({ success: false, error: 'A complete shipping address is required.', code: 'BAD_REQUEST' }, { status: 400 })
    }

    const productIds = items.map((i: any) => i.id).filter(Boolean)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true, name: true, freeShipping: true,
        weight: true, length: true, width: true, height: true,
        variants: { select: { id: true, name: true, weightOz: true, lengthIn: true, widthIn: true, heightIn: true, active: true } },
      },
    })

    // ── Resolve shipping info per cart item (variant-specific or product fallback) ──
    // For each cart item, look up the variant (if variantId is provided) and use
    // its shipping fields. If the variant's fields are null, fall back to the
    // parent product's fields. If both are null, the item is "incomplete".
    interface ResolvedItem {
      productId: string
      variantId: string | null
      name: string
      qty: number
      weightOz: number
      lengthIn: number
      widthIn: number
      heightIn: number
      freeShipping: boolean
    }

    const resolvedItems: ResolvedItem[] = []
    const incompleteItems: string[] = []

    for (const item of items) {
      const product = products.find(p => p.id === item.id)
      if (!product) {
        incompleteItems.push(`Unknown product (${item.id})`)
        continue
      }
      const qty = Math.max(1, item.quantity || 1)
      const variantId = item.variantId || null
      const variant = variantId ? product.variants.find(v => v.id === variantId) : null

      // Determine shipping fields:
      // - If a variant is selected: use ONLY variant fields (no fallback to product)
      //   Per client requirement: "require complete shipping weight and dimensions
      //   for the selected variant. Do not silently fall back to shared parent-product
      //   measurements."
      // - If no variant (product has no variants): use product-level fields
      let weightOz: number | null = null
      let lengthIn: number | null = null
      let widthIn: number | null = null
      let heightIn: number | null = null

      if (variant) {
        // Variant selected — use ONLY variant fields, no product fallback
        weightOz = variant.weightOz
        lengthIn = variant.lengthIn
        widthIn = variant.widthIn
        heightIn = variant.heightIn
      } else if (product.variants.length === 0) {
        // Product has NO variants — use product-level fields
        weightOz = product.weight
        lengthIn = product.length
        widthIn = product.width
        heightIn = product.height
      } else {
        // Product HAS variants but no variantId was sent — this shouldn't happen
        // in normal checkout, but handle gracefully by flagging as incomplete
        weightOz = null
        lengthIn = null
        widthIn = null
        heightIn = null
      }

      // Check completeness
      if (!product.freeShipping && (weightOz == null || weightOz <= 0 || lengthIn == null || lengthIn <= 0 || widthIn == null || widthIn <= 0 || heightIn == null || heightIn <= 0)) {
        const variantLabel = variant ? ` (${variant.name})` : (product.variants.length > 0 ? ' (no variant selected)' : '')
        incompleteItems.push(`"${product.name}${variantLabel}"`)
        continue
      }

      resolvedItems.push({
        productId: product.id,
        variantId,
        name: product.name + (variant ? ` (${variant.name})` : ''),
        qty,
        weightOz: weightOz || 0,
        lengthIn: lengthIn || 0,
        widthIn: widthIn || 0,
        heightIn: heightIn || 0,
        freeShipping: product.freeShipping,
      })
    }

    if (incompleteItems.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing shipping weight/dimensions for: ${incompleteItems.join(', ')}. Please contact support.`,
        code: 'INCOMPLETE_PRODUCTS',
        incompleteProductNames: incompleteItems,
      }, { status: 422 })
    }

    // All free shipping?
    const allFree = resolvedItems.every(item => item.freeShipping)
    if (allFree) {
      return NextResponse.json({
        success: true, shipmentId: null,
        rates: [{ rateId: 'free-shipping', shipmentId: null, carrier: 'Free', service: 'Free Shipping', rate: 0 }],
      })
    }

    if (!isEasyPostConfigured()) {
      return NextResponse.json({ success: false, error: 'Shipping calculation is not available. Please contact support.', code: 'NOT_CONFIGURED' }, { status: 503 })
    }

    // ─── Multi-product parcel calculation ──────────────────────────────
    // This algorithm combines all cart items into a single shipping parcel
    // with realistic dimensions. It does NOT simply use the largest single
    // product's dimensions — it accounts for total volume AND ensures the
    // box is large enough on each axis to physically fit the items.
    //
    // Strategy:
    // 1. Sum total weight (product weight × quantity)
    // 2. Sum total item volume
    // 3. Track the max dimension on each axis across all items
    // 4. Derive box dimensions from volume + ensure each axis fits the
    //    largest item on that axis
    // 5. Add 25% void space for packing material + irregular shapes
    // 6. Round up to nearest inch
    //
    let totalWeightOz = 0
    let totalVolumeCubicIn = 0

    // Track the longest item on each axis (box must fit the biggest item)
    let maxItemLength = 0
    let maxItemWidth = 0
    let maxItemHeight = 0

    // Track total item count (for quantity)
    let totalItemCount = 0

    for (const item of resolvedItems) {
      totalWeightOz += item.weightOz * item.qty
      totalItemCount += item.qty

      const itemL = item.lengthIn
      const itemW = item.widthIn
      const itemH = item.heightIn
      const itemVol = itemL * itemW * itemH

      // Sum volumes × quantity
      totalVolumeCubicIn += itemVol * item.qty

      // Box must accommodate the largest item on each axis
      maxItemLength = Math.max(maxItemLength, itemL)
      maxItemWidth = Math.max(maxItemWidth, itemW)
      maxItemHeight = Math.max(maxItemHeight, itemH)
    }

    if (totalWeightOz <= 0 || totalVolumeCubicIn <= 0) {
      return NextResponse.json({ success: false, error: 'Could not calculate package weight or dimensions.', code: 'BAD_REQUEST' }, { status: 400 })
    }

    // Add 25% void space for packing material, cushioning, and irregular shapes.
    // 20% is minimum for void fill; 25% is safer for mixed product types
    // (bottles, soaps, creams, sets — all have different shapes that don't
    // nest perfectly).
    const packedVolume = totalVolumeCubicIn * 1.25

    // Derive box dimensions from packed volume.
    // Use a 1.3:1:0.7 aspect ratio (typical shipping box proportions).
    const cubeRoot = Math.cbrt(packedVolume)

    // Each axis must be at least as large as the biggest item on that axis,
    // AND at least as large as the volumetric calculation suggests.
    // This handles both "single large item" and "many small items" cases.
    let boxLength = Math.max(maxItemLength, cubeRoot * 1.3)
    let boxWidth = Math.max(maxItemWidth, cubeRoot * 0.9, 4)   // min 4" for handling
    let boxHeight = Math.max(maxItemHeight, cubeRoot * 0.7, 2)  // min 2" for padding

    // For multi-item orders (3+ items), add extra width/height since items
    // don't nest perfectly — bottles are cylindrical, boxes are rectangular,
    // sets are irregular. Add 1 inch per 3 extra items.
    if (totalItemCount > 2) {
      const extraPerAxis = Math.ceil((totalItemCount - 2) / 3)
      boxWidth += extraPerAxis
      boxHeight += extraPerAxis
    }

    // Round up to nearest inch
    boxLength = Math.ceil(boxLength)
    boxWidth = Math.ceil(boxWidth)
    boxHeight = Math.ceil(boxHeight)

    const { shipmentId, rates } = await getRates(
      { street: address.street, city: address.city, state: address.state, zip: address.zip, country: address.country || 'US' },
      { weightOz: totalWeightOz, lengthIn: boxLength, widthIn: boxWidth, heightIn: boxHeight }
    )
    return NextResponse.json({ success: true, shipmentId, rates, parcel: { weightOz: totalWeightOz, lengthIn: boxLength, widthIn: boxWidth, heightIn: boxHeight } })
  } catch (error: any) {
    if (error instanceof EasyPostConfigError) {
      return NextResponse.json({ success: false, error: 'Shipping not configured.', code: 'NOT_CONFIGURED' }, { status: 503 })
    }
    if (error instanceof EasyPostAPIError) {
      console.error('[shipping/rates] EasyPost error:', error.message)
      return NextResponse.json({ success: false, error: error.message, code: 'NO_RATES' }, { status: 502 })
    }
    console.error('[shipping/rates] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: 'Failed to calculate shipping.', code: 'API_ERROR' }, { status: 500 })
  }
}
