import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─── PUT /api/products/:id/variants/:variantId/shipping ───────────────────────
//
// Safely updates ONLY the shipping fields (weightOz, lengthIn, widthIn,
// heightIn) on a single product variant. Does NOT call syncVariants() —
// does NOT add, delete, or modify any other variant on the product.
// Does NOT touch price, stock, name, SKU, active, or any non-shipping field.
//
// This endpoint exists to prevent the data loss bug where saving one
// variant's shipping info via PUT /api/products/:id would call
// syncVariants() and DELETE all other variants not included in the request.
//
// Body: { weightOz?: number|null, lengthIn?: number|null, widthIn?: number|null, heightIn?: number|null }
// ─────────────────────────────────────────────────────────────────────────────

const toNullableFloat = (v: any): number | null | undefined => {
  if (v === undefined) return undefined // don't update this field
  if (v === null || v === '') return null // explicitly clear
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return !isNaN(n) && n > 0 ? n : null
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { id, variantId } = await params
    const body = await req.json()

    // Build update data — only include fields that were provided
    const data: any = {}
    const weightOz = toNullableFloat(body.weightOz)
    const lengthIn = toNullableFloat(body.lengthIn)
    const widthIn = toNullableFloat(body.widthIn)
    const heightIn = toNullableFloat(body.heightIn)

    if (weightOz !== undefined) data.weightOz = weightOz
    if (lengthIn !== undefined) data.lengthIn = lengthIn
    if (widthIn !== undefined) data.widthIn = widthIn
    if (heightIn !== undefined) data.heightIn = heightIn

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No shipping fields provided to update.' },
        { status: 400 }
      )
    }

    // Verify the variant exists and belongs to this product
    const variant = await db.productVariant.findFirst({
      where: { id: variantId, productId: id },
    })

    if (!variant) {
      return NextResponse.json(
        { success: false, error: 'Variant not found on this product.' },
        { status: 404 }
      )
    }

    // Update ONLY the shipping fields — no syncVariants, no collection replacement
    const updated = await db.productVariant.update({
      where: { id: variantId },
      data,
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        weightOz: true,
        lengthIn: true,
        widthIn: true,
        heightIn: true,
      },
    })

    return NextResponse.json({ success: true, variant: updated })
  } catch (error: any) {
    console.error('[Variant Shipping PUT] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Failed to update variant shipping.' },
      { status: 500 }
    )
  }
}
