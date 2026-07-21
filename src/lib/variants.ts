import { db } from '@/lib/db'
import type { PrismaClient } from '@prisma/client'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VariantInput {
  id?: string
  name: string
  sku?: string | null
  price: number
  comparePrice?: number | null
  stock: number
  weight?: string | null
  active: boolean
  order: number
}

export interface VariantOutput {
  id: string
  productId: string
  name: string
  sku: string | null
  price: number
  comparePrice: number | null
  stock: number
  weight: string | null
  active: boolean
  order: number
  createdAt: string
  updatedAt: string
}

// ─── Normalize ───────────────────────────────────────────────────────────────

/**
 * Normalize raw variant input coming from the client into a clean
 * VariantInput[]. Handles type coercion, defaults, and filtering of
 * empty/incomplete entries.
 */
export function normalizeVariants(raw: unknown): VariantInput[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((v: any, idx: number): VariantInput | null => {
      if (!v) return null
      const name = String(v.name ?? '').trim()
      // We allow empty-name entries to be dropped only if they have no
      // price either (i.e. truly blank rows the admin hasn't filled in yet).
      // But if there's a price, we keep it and default the name.
      const priceNum = typeof v.price === 'number' ? v.price : parseFloat(String(v.price ?? '0')) || 0
      const stockNum = typeof v.stock === 'number' ? v.stock : parseInt(String(v.stock ?? '0')) || 0

      if (!name && priceNum === 0 && stockNum === 0) return null

      return {
        id: v.id ? String(v.id) : undefined,
        name: name || 'Standard',
        sku: v.sku ? String(v.sku).trim() || null : null,
        price: priceNum,
        comparePrice:
          v.comparePrice === '' || v.comparePrice === null || v.comparePrice === undefined
            ? null
            : typeof v.comparePrice === 'number'
              ? v.comparePrice
              : parseFloat(String(v.comparePrice)) || null,
        stock: stockNum,
        weight: v.weight ? String(v.weight).trim() || null : null,
        active: v.active !== false,
        order: typeof v.order === 'number' ? v.order : idx,
      }
    })
    .filter((v): v is VariantInput => v !== null)
    .map((v, idx) => ({ ...v, order: v.order ?? idx }))
}

// ─── Sync variants within a transaction ──────────────────────────────────────

/**
 * Replace all variants for a product within an existing transaction.
 *
 * Strategy:
 *   - Variants WITHOUT an id → create new
 *   - Variants WITH an id that exist → update
 *   - Variants in DB that are NOT in the input → delete
 *
 * `tx` is a Prisma transaction client so this can run inside $transaction.
 */
export async function syncVariants(
  tx: PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  productId: string,
  inputs: VariantInput[],
): Promise<void> {
  // Fetch existing variants
  const existing = await tx.productVariant.findMany({ where: { productId } })
  const existingIds = new Set(existing.map((v) => v.id))
  const inputIds = new Set(inputs.filter((v) => v.id).map((v) => v.id!))

  // Delete variants that are no longer in the input
  const toDelete = [...existingIds].filter((id) => !inputIds.has(id))
  if (toDelete.length > 0) {
    await tx.productVariant.deleteMany({ where: { id: { in: toDelete } } })
  }

  // Update existing + create new
  for (let i = 0; i < inputs.length; i++) {
    const v = inputs[i]
    const data = {
      name: v.name,
      sku: v.sku,
      price: v.price,
      comparePrice: v.comparePrice,
      stock: v.stock,
      weight: v.weight,
      active: v.active,
      order: i,
    }
    if (v.id && existingIds.has(v.id)) {
      await tx.productVariant.update({ where: { id: v.id }, data })
    } else {
      await tx.productVariant.create({ data: { ...data, productId } })
    }
  }
}

// ─── Recompute product cache (price / stock / comparePrice) ───────────────────

/**
 * Recompute the denormalized cache fields on Product from its variants.
 *
 * Invariants:
 *   - price        = min(variants.price) among ACTIVE variants
 *                    (falls back to min of ALL variants if none active)
 *   - stock        = sum(variants.stock) among ACTIVE variants
 *   - comparePrice = min(variants.comparePrice) among ACTIVE variants that have one
 *                    (null if none)
 *
 * This keeps the Product table usable by legacy code that doesn't know about
 * variants, and powers "From $X" price displays.
 */
export async function recomputeProductCache(
  tx: PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  productId: string,
): Promise<void> {
  const variants = await tx.productVariant.findMany({ where: { productId } })

  const active = variants.filter((v) => v.active)
  const pool = active.length > 0 ? active : variants

  const price = pool.length > 0 ? Math.min(...pool.map((v) => v.price)) : 0
  const stock = pool.reduce((sum, v) => sum + v.stock, 0)
  const comparePrices = pool
    .map((v) => v.comparePrice)
    .filter((p): p is number => p !== null && p !== undefined)
  const comparePrice = comparePrices.length > 0 ? Math.min(...comparePrices) : null

  await tx.product.update({
    where: { id: productId },
    data: { price, stock, comparePrice },
  })
}

// ─── Combined helper (runs in its own transaction) ───────────────────────────

/**
 * Convenience: sync variants + recompute cache in a single transaction.
 */
export async function syncVariantsAndRecompute(
  productId: string,
  inputs: VariantInput[],
): Promise<void> {
  await db.$transaction(async (tx) => {
    await syncVariants(tx, productId, inputs)
    await recomputeProductCache(tx, productId)
  })
}

// ─── Default variant (backward compat) ───────────────────────────────────────

/**
 * Build a single "Standard" default variant from a product's denormalized
 * price/stock. Used when migrating legacy products or when the admin saves a
 * product without specifying any variants.
 */
export function buildDefaultVariant(price: number, stock: number, comparePrice: number | null): VariantInput {
  return {
    name: 'Standard',
    sku: null,
    price,
    comparePrice,
    stock,
    weight: null,
    active: true,
    order: 0,
  }
}
