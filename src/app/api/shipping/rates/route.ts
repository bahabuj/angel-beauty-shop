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

    // ─── Packaging Selection ──────────────────────────────────────────────
    // Three packaging options defined by the client:
    //   Envelope:  9.5 × 12.5 × [thickness configurable via env] inches
    //   Small Box: 11.25 × 8.75 × 6 inches
    //   Big Box:   12.25 × 12 × 6 inches
    //
    // Selection logic:
    //   1. Add 25% void space to the total item volume (packing material)
    //   2. Try each package in order of increasing size
    //   3. A package fits if:
    //      a) Its volume >= packed item volume
    //      b) Each of its dimensions >= the max item dimension on that axis
    //   4. If no package fits, return a clear error (not a fabricated dimension)
    //
    // Envelope thickness is configurable via ENVELOPE_THICKNESS_IN env var.
    // If not set, the envelope is skipped (cannot determine fit without thickness).
    //
    const ENVELOPE_THICKNESS = parseFloat(process.env.ENVELOPE_THICKNESS_IN || '0')
    const PACKAGES = [
      { name: 'Envelope',  length: 12.5, width: 9.5,  height: ENVELOPE_THICKNESS, enabled: ENVELOPE_THICKNESS > 0 },
      { name: 'Small Box', length: 11.25, width: 8.75, height: 6,    enabled: true },
      { name: 'Big Box',   length: 12.25, width: 12,   height: 6,    enabled: true },
    ].filter(p => p.enabled)

    if (PACKAGES.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No packaging options are configured. Please contact support.',
        code: 'NO_PACKAGING',
      }, { status: 503 })
    }

    const packedVolume = totalVolumeCubicIn * 1.25 // 25% void space
    let selectedPackage: { name: string; length: number; width: number; height: number } | null = null

    // Sort packages by volume (smallest first) to find the smallest that fits
    const sortedPackages = [...PACKAGES].sort((a, b) =>
      (a.length * a.width * a.height) - (b.length * b.width * b.height)
    )

    for (const pkg of sortedPackages) {
      const pkgVolume = pkg.length * pkg.width * pkg.height
      // Check volume fit
      if (pkgVolume < packedVolume) continue
      // Check dimension fit — the max item dimension on each axis must fit
      // within the package's dimensions (on any orientation)
      const pkgDims = [pkg.length, pkg.width, pkg.height].sort((a, b) => b - a)
      const itemDims = [maxItemLength, maxItemWidth, maxItemHeight].sort((a, b) => b - a)
      // Largest item dimension must fit in largest package dimension, etc.
      if (itemDims[0] > pkgDims[0] || itemDims[1] > pkgDims[1] || itemDims[2] > pkgDims[2]) continue

      selectedPackage = pkg
      break
    }

    if (!selectedPackage) {
      // No package fits — return a clear error, don't fabricate dimensions
      return NextResponse.json({
        success: false,
        error: `This order cannot be packed into the available packaging options. ` +
               `Items require at least ${Math.ceil(maxItemLength)}×${Math.ceil(maxItemWidth)}×${Math.ceil(maxItemHeight)} inches ` +
               `with a total packed volume of ${Math.ceil(packedVolume)} cu.in. ` +
               `Available packages: ${PACKAGES.map(p => `${p.name} (${p.length}×${p.width}×${p.height})`).join(', ')}. ` +
               `Please contact support or split your order.`,
        code: 'NO_FITTING_PACKAGE',
        packedVolume: Math.ceil(packedVolume),
        maxItemDimensions: { length: maxItemLength, width: maxItemWidth, height: maxItemHeight },
        availablePackages: PACKAGES.map(p => ({ name: p.name, length: p.length, width: p.width, height: p.height })),
      }, { status: 422 })
    }

    // Use the selected package's actual dimensions for EasyPost
    const boxLength = selectedPackage.length
    const boxWidth = selectedPackage.width
    const boxHeight = selectedPackage.height

    const { shipmentId, rates } = await getRates(
      { street: address.street, city: address.city, state: address.state, zip: address.zip, country: address.country || 'US' },
      { weightOz: totalWeightOz, lengthIn: boxLength, widthIn: boxWidth, heightIn: boxHeight }
    )
    return NextResponse.json({
      success: true, shipmentId, rates,
      parcel: {
        weightOz: totalWeightOz,
        lengthIn: boxLength, widthIn: boxWidth, heightIn: boxHeight,
        package: selectedPackage.name,
        packedVolume: Math.ceil(packedVolume),
      },
    })
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
