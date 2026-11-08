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

// ─── Helpers for partial-update sanitization ─────────────────────────────────
//
// IMPORTANT: the previous implementation of this route defaulted every field
// to a "blank" value when the field was missing from the request body. That
// behavior was destructive: a shipping-only update (e.g. from the Bulk
// Shipping Editor) that sent `{weight, length, width, height, freeShipping}`
// and omitted `images`, `benefits`, `ingredients`, `howToUse`, `featured`,
// `newArrival`, `bestSeller`, etc. would silently overwrite ALL of those
// fields to their "blank" values — wiping Cloudinary image references,
// product descriptions, and featured flags.
//
// The fix: only include a field in the Prisma `update` payload when it was
// explicitly provided in the request body. Prisma treats `undefined` as
// "skip this field", which preserves the existing row value.
//
// Convention for distinguishing "intentional clear" vs "omitted":
//
//   Field omitted from request body    → preserve existing DB value
//   Field present with value `null`     → reject with 400 (ambiguous)
//   Field present with `[]` or `'[]'`   → wipe (intentional clear)
//   Field present with a non-empty value → validate + update

function sanitizeJsonArrayField(
  data: Record<string, unknown>,
  field: string,
  errors: string[],
): void {
  if (!(field in data)) {
    delete data[field]
    return
  }
  const v = data[field]
  if (v === null) {
    errors.push(`Field '${field}' cannot be null. Send an empty array [] to clear, or omit the field to preserve the existing value.`)
    return
  }
  if (Array.isArray(v)) {
    for (const entry of v) {
      if (typeof entry !== 'string') {
        errors.push(`Field '${field}' must be an array of strings. Got: ${typeof entry}`)
        return
      }
    }
    data[field] = JSON.stringify(v)
    return
  }
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      if (!Array.isArray(parsed)) {
        errors.push(`Field '${field}' is a JSON string but does not encode an array.`)
        return
      }
      return
    } catch {
      errors.push(`Field '${field}' is not valid JSON.`)
      return
    }
  }
  errors.push(`Field '${field}' must be an array, a JSON-encoded string, or omitted.`)
}

function sanitizeTextField(
  data: Record<string, unknown>,
  field: string,
): void {
  if (!(field in data)) {
    delete data[field]
    return
  }
  const v = data[field]
  if (v === null) {
    data[field] = ''
    return
  }
  if (typeof v !== 'string') {
    data[field] = String(v)
  }
}

function sanitizeBooleanField(
  data: Record<string, unknown>,
  field: string,
): void {
  if (!(field in data)) {
    delete data[field]
    return
  }
  data[field] = data[field] === true
}

function sanitizeNullableFloat(
  data: Record<string, unknown>,
  field: string,
): void {
  if (!(field in data)) {
    delete data[field]
    return
  }
  const v = data[field]
  if (v === null || v === '' || v === undefined) {
    data[field] = null
    return
  }
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  data[field] = !isNaN(n) && n > 0 ? n : null
}

function sanitizeRequiredFloat(
  data: Record<string, unknown>,
  field: string,
  errors: string[],
): void {
  if (!(field in data)) return
  const v = data[field]
  if (v === null || v === '' || v === undefined) {
    errors.push(`Field '${field}' cannot be null. Omit the field to preserve the existing value.`)
    return
  }
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  if (isNaN(n) || n < 0) {
    errors.push(`Field '${field}' must be a non-negative number.`)
    return
  }
  data[field] = n
}

function sanitizeRequiredInt(
  data: Record<string, unknown>,
  field: string,
  errors: string[],
): void {
  if (!(field in data)) return
  const v = data[field]
  if (v === null || v === '' || v === undefined) {
    errors.push(`Field '${field}' cannot be null. Omit the field to preserve the existing value.`)
    return
  }
  const n = typeof v === 'number' ? v : parseInt(String(v), 10)
  if (isNaN(n) || n < 0) {
    errors.push(`Field '${field}' must be a non-negative integer.`)
    return
  }
  data[field] = n
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const rawVariants = body.variants
    delete body.variants

    const { id: _id, ...data } = body as Record<string, unknown>

    if (data.slug !== undefined) {
      if (typeof data.slug === 'string' && data.slug.trim() !== '') {
        const existing = await db.product.findFirst({
          where: { slug: data.slug, NOT: { id } },
        })
        if (existing) {
          data.slug = `${data.slug}-${Date.now()}`
        }
      } else {
        delete data.slug
      }
    }

    const errors: string[] = []

    sanitizeRequiredFloat(data, 'price', errors)
    if ('comparePrice' in data) {
      const v = data.comparePrice
      if (v === null || v === '') {
        data.comparePrice = null
      } else if (v === undefined) {
        delete data.comparePrice
      } else {
        const n = typeof v === 'number' ? v : parseFloat(String(v))
        if (isNaN(n) || n < 0) errors.push("Field 'comparePrice' must be a non-negative number or null.")
        else data.comparePrice = n
      }
    }
    sanitizeRequiredInt(data, 'stock', errors)

    sanitizeJsonArrayField(data, 'images', errors)
    sanitizeJsonArrayField(data, 'benefits', errors)

    sanitizeTextField(data, 'ingredients')
    sanitizeTextField(data, 'howToUse')
    sanitizeTextField(data, 'description')

    sanitizeBooleanField(data, 'featured')
    sanitizeBooleanField(data, 'newArrival')
    sanitizeBooleanField(data, 'bestSeller')
    sanitizeBooleanField(data, 'freeShipping')

    sanitizeNullableFloat(data, 'weight')
    sanitizeNullableFloat(data, 'length')
    sanitizeNullableFloat(data, 'width')
    sanitizeNullableFloat(data, 'height')

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', validationErrors: errors },
        { status: 400 },
      )
    }

    const updateKeys = Object.keys(data)
    const shippingOnlyKeys = ['weight', 'length', 'width', 'height', 'freeShipping']
    const isShippingOnly =
      updateKeys.length > 0 &&
      updateKeys.every(k => shippingOnlyKeys.includes(k))
    if (isShippingOnly) {
      console.log(
        `[Product PUT] Shipping-only update for ${id}: keys=[${updateKeys.join(',')}]. ` +
        `Other fields (images, description, price, stock, variants) preserved.`
      )
    }

    const product = await db.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.product.update({ where: { id }, data })
      }

      if (rawVariants !== undefined) {
        const variantInputs = normalizeVariants(rawVariants)
        const finalVariants =
          variantInputs.length > 0
            ? variantInputs
            : [buildDefaultVariant(
                (data.price as number | undefined) ?? (await tx.product.findUnique({ where: { id }, select: { price: true } }))?.price ?? 0,
                (data.stock as number | undefined) ?? (await tx.product.findUnique({ where: { id }, select: { stock: true } }))?.stock ?? 0,
                (data.comparePrice as number | null | undefined) ?? (await tx.product.findUnique({ where: { id }, select: { comparePrice: true } }))?.comparePrice ?? null,
              )]
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
    await db.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Product DELETE] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: 'Failed to delete product' }, { status: 500 })
  }
}
