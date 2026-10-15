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
      select: { id: true, name: true, weight: true, length: true, width: true, height: true, freeShipping: true },
    })

    // Flag incomplete products
    const incomplete = products.filter(p =>
      p.weight == null || p.length == null || p.width == null || p.height == null ||
      p.weight <= 0 || p.length <= 0 || p.width <= 0 || p.height <= 0
    )
    if (incomplete.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing shipping weight/dimensions for: ${incomplete.map(p => `"${p.name}"`).join(', ')}. Please contact support.`,
        code: 'INCOMPLETE_PRODUCTS',
        incompleteProductNames: incomplete.map(p => p.name),
      }, { status: 422 })
    }

    // All free shipping?
    const allFree = items.every((item: any) => products.find(p => p.id === item.id)?.freeShipping === true)
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

    for (const item of items) {
      const p = products.find(pr => pr.id === item.id)
      if (!p) continue
      const qty = Math.max(1, item.quantity || 1)
      totalWeightOz += (p.weight || 0) * qty
      totalItemCount += qty

      const itemL = p.length || 0
      const itemW = p.width || 0
      const itemH = p.height || 0
      const itemVol = itemL * itemW * itemH

      // Sum volumes × quantity
      totalVolumeCubicIn += itemVol * qty

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
