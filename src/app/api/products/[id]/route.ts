import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  normalizeVariants,
  syncVariants,
  recomputeProductCache,
  buildDefaultVariant,
} from '@/lib/variants'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const product = await db.product.findUnique({
      where: { id },
      include: { variants: { orderBy: { order: 'asc' } } },
    })
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    return NextResponse.json({ success: true, product })
  } catch (error: any) {
    console.error('[Product GET] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const rawVariants = body.variants
    delete body.variants

    // Remove id from update data — Prisma doesn't allow updating the id field
    const { id: _id, ...data } = body

    // ── Ensure slug is unique (exclude current product) ──
    if (data.slug) {
      const existing = await db.product.findFirst({
        where: { slug: data.slug, NOT: { id } },
      })
      if (existing) {
        data.slug = `${data.slug}-${Date.now()}`
      }
    }

    // ── Sanitize & default fields ──
    if (typeof data.price === 'string') data.price = parseFloat(data.price) || 0
    if (typeof data.comparePrice === 'string') data.comparePrice = parseFloat(data.comparePrice) || null
    if (data.comparePrice === '') data.comparePrice = null
    if (typeof data.stock === 'string') data.stock = parseInt(data.stock) || 0
    if (!data.images) data.images = '[]'
    if (!data.benefits) data.benefits = '[]'
    if (!data.ingredients) data.ingredients = ''
    if (!data.howToUse) data.howToUse = ''

    // Ensure boolean fields
    data.featured = data.featured === true
    data.newArrival = data.newArrival === true
    data.bestSeller = data.bestSeller === true
    data.freeShipping = data.freeShipping === true

    const product = await db.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data })

      // If variants were provided, sync them and recompute cache.
      // If variants key was provided but empty/invalid, normalizeVariants
      // returns [] — in that case we keep existing variants untouched
      // UNLESS the client explicitly sent an empty array (meaning "clear
      // all variants"), in which case we fall back to a Standard default.
      if (rawVariants !== undefined) {
        const variantInputs = normalizeVariants(rawVariants)
        const finalVariants =
          variantInputs.length > 0
            ? variantInputs
            : [buildDefaultVariant(updated.price, updated.stock, updated.comparePrice)]
        await syncVariants(tx, id, finalVariants)
        await recomputeProductCache(tx, id)
      }

      return tx.product.findUnique({
        where: { id },
        include: { variants: { orderBy: { order: 'asc' } } },
      })
    })

    return NextResponse.json({ success: true, product })
  } catch (error: any) {
    console.error('[Product PUT] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update product' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // Variants are cascade-deleted via the schema relation
    await db.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Product DELETE] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: 'Failed to delete product' }, { status: 500 })
  }
}
