/**
 * Regression tests for the Phase R1 fix to src/app/api/products/[id]/route.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  return {
    productUpdate: vi.fn(),
    productFindFirst: vi.fn(),
    productFindUnique: vi.fn(),
    productVariantFindMany: vi.fn(),
    productVariantDeleteMany: vi.fn(),
    productVariantUpsert: vi.fn(),
    productVariantCreate: vi.fn(),
    productVariantUpdate: vi.fn(),
  }
})

const txObject = {
  product: {
    update: mocks.productUpdate,
    findFirst: mocks.productFindFirst,
    findUnique: mocks.productFindUnique,
  },
  productVariant: {
    findMany: mocks.productVariantFindMany,
    deleteMany: mocks.productVariantDeleteMany,
    upsert: mocks.productVariantUpsert,
    create: mocks.productVariantCreate,
    update: mocks.productVariantUpdate,
  },
}

vi.mock('@/lib/db', () => ({
  db: {
    product: {
      update: mocks.productUpdate,
      findFirst: mocks.productFindFirst,
      findUnique: mocks.productFindUnique,
    },
    productVariant: {
      findMany: mocks.productVariantFindMany,
      deleteMany: mocks.productVariantDeleteMany,
      upsert: mocks.productVariantUpsert,
      create: mocks.productVariantCreate,
      update: mocks.productVariantUpdate,
    },
    $transaction: async (fn: (tx: typeof txObject) => unknown) => fn(txObject),
  },
}))

import { PUT } from '@/app/api/products/[id]/route'

const productUpdate = mocks.productUpdate
const productFindFirst = mocks.productFindFirst
const productFindUnique = mocks.productFindUnique
const productVariantDeleteMany = mocks.productVariantDeleteMany
const productVariantUpsert = mocks.productVariantUpsert
const productVariantCreate = mocks.productVariantCreate
const productVariantUpdate = mocks.productVariantUpdate

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/products/test-product-id', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

const PRODUCT_ID = 'test-product-id'

const EXISTING_PRODUCT = {
  id: PRODUCT_ID,
  name: 'Existing Product',
  slug: 'existing-product',
  description: 'Existing description',
  price: 29.99,
  comparePrice: null,
  categorySlug: 'face-cream',
  images: JSON.stringify(['https://res.cloudinary.com/k7248qtu/image/upload/v123/existing.png']),
  benefits: JSON.stringify(['Hydrates', 'Brightens']),
  ingredients: 'Water, Glycerin',
  howToUse: 'Apply morning and night',
  stock: 50,
  featured: true,
  newArrival: false,
  bestSeller: true,
  freeShipping: false,
  weight: 4.5,
  length: 3,
  width: 3,
  height: 3,
  createdAt: new Date('2026-08-01'),
  updatedAt: new Date('2026-11-01'),
  variants: [
    {
      id: 'variant-1',
      productId: PRODUCT_ID,
      name: 'Standard',
      sku: null,
      price: 29.99,
      comparePrice: null,
      stock: 50,
      weight: '50g',
      active: true,
      order: 0,
      createdAt: new Date('2026-08-01'),
      updatedAt: new Date('2026-08-01'),
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  productFindUnique.mockResolvedValue(EXISTING_PRODUCT)
  productFindFirst.mockResolvedValue(null)
  productUpdate.mockResolvedValue(EXISTING_PRODUCT)
})

describe('PUT /api/products/[id] — Phase R1 regression tests', () => {

  it('TEST 1: Shipping-only update preserves existing images', async () => {
    const body = { weight: 6, length: 4, width: 4, height: 4, freeShipping: true }
    const req = makeReq(body)
    const res = await PUT(req, makeParams(PRODUCT_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    expect(productUpdate).toHaveBeenCalledTimes(1)
    const callArg = productUpdate.mock.calls[0][0] as { where: unknown; data: Record<string, unknown> }
    const updateData = callArg.data
    const updateKeys = Object.keys(updateData)

    expect(updateData.weight).toBe(6)
    expect(updateData.length).toBe(4)
    expect(updateData.width).toBe(4)
    expect(updateData.height).toBe(4)
    expect(updateData.freeShipping).toBe(true)

    expect(updateKeys).not.toContain('images')
    expect(updateData.images).toBeUndefined()
    expect(updateKeys).not.toContain('benefits')
    expect(updateKeys).not.toContain('ingredients')
    expect(updateKeys).not.toContain('howToUse')
    expect(updateKeys).not.toContain('description')
    expect(updateKeys).not.toContain('featured')
    expect(updateKeys).not.toContain('newArrival')
    expect(updateKeys).not.toContain('bestSeller')
    expect(updateKeys).not.toContain('price')
    expect(updateKeys).not.toContain('stock')
    expect(updateKeys).not.toContain('comparePrice')
  })

  it('TEST 2: Omitted images do not clear image references', async () => {
    const body = { name: 'Renamed Product', slug: 'renamed-product' }
    const req = makeReq(body)
    const res = await PUT(req, makeParams(PRODUCT_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    expect(productUpdate).toHaveBeenCalledTimes(1)
    const callArg = productUpdate.mock.calls[0][0] as { where: unknown; data: Record<string, unknown> }
    const updateData = callArg.data

    expect(updateData.images).toBeUndefined()
    expect(Object.keys(updateData)).not.toContain('images')
  })

  it('TEST 3a: Explicit image updates work (array form)', async () => {
    const body = {
      images: [
        'https://res.cloudinary.com/k7248qtu/image/upload/v456/new1.png',
        'https://res.cloudinary.com/k7248qtu/image/upload/v456/new2.png',
      ],
    }
    const req = makeReq(body)
    const res = await PUT(req, makeParams(PRODUCT_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    expect(productUpdate).toHaveBeenCalledTimes(1)
    const callArg = productUpdate.mock.calls[0][0] as { where: unknown; data: Record<string, unknown> }
    const updateData = callArg.data

    expect(updateData.images).toBe(
      JSON.stringify([
        'https://res.cloudinary.com/k7248qtu/image/upload/v456/new1.png',
        'https://res.cloudinary.com/k7248qtu/image/upload/v456/new2.png',
      ])
    )
  })

  it('TEST 3b: Explicit image clear ([]) works', async () => {
    const body = { images: [] }
    const req = makeReq(body)
    const res = await PUT(req, makeParams(PRODUCT_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    expect(productUpdate).toHaveBeenCalledTimes(1)
    const callArg = productUpdate.mock.calls[0][0] as { where: unknown; data: Record<string, unknown> }
    const updateData = callArg.data

    expect(updateData.images).toBe('[]')
  })

  it('TEST 3c: images: null is rejected (ambiguous)', async () => {
    const body = { images: null }
    const req = makeReq(body)
    const res = await PUT(req, makeParams(PRODUCT_ID))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.validationErrors).toBeDefined()
    expect(json.validationErrors.some((e: string) => e.includes("'images'"))).toBe(true)

    expect(productUpdate).not.toHaveBeenCalled()
  })

  it('TEST 3d: Pre-encoded JSON string images work', async () => {
    const body = {
      images: JSON.stringify(['https://res.cloudinary.com/k7248qtu/image/upload/v789/str.png']),
    }
    const req = makeReq(body)
    const res = await PUT(req, makeParams(PRODUCT_ID))

    expect(res.status).toBe(200)
    const callArg = productUpdate.mock.calls[0][0] as { where: unknown; data: Record<string, unknown> }
    expect(callArg.data.images).toBe(
      JSON.stringify(['https://res.cloudinary.com/k7248qtu/image/upload/v789/str.png'])
    )
  })

  it('TEST 3e: Invalid images (non-string entries) are rejected', async () => {
    const body = { images: ['ok-string', 12345] }
    const req = makeReq(body)
    const res = await PUT(req, makeParams(PRODUCT_ID))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
    expect(productUpdate).not.toHaveBeenCalled()
  })

  it('TEST 4: Variants unchanged when no `variants` key in body', async () => {
    const body = { weight: 7 }
    const req = makeReq(body)
    const res = await PUT(req, makeParams(PRODUCT_ID))

    expect(res.status).toBe(200)

    expect(productVariantDeleteMany).not.toHaveBeenCalled()
    expect(productVariantUpsert).not.toHaveBeenCalled()
    expect(productVariantCreate).not.toHaveBeenCalled()
    expect(productVariantUpdate).not.toHaveBeenCalled()
  })

  it('TEST 5: freeShipping: false is preserved', async () => {
    const body = { freeShipping: false }
    const req = makeReq(body)
    const res = await PUT(req, makeParams(PRODUCT_ID))

    expect(res.status).toBe(200)
    const callArg = productUpdate.mock.calls[0][0] as { where: unknown; data: Record<string, unknown> }
    expect(callArg.data.freeShipping).toBe(false)
    expect(callArg.data.featured).toBeUndefined()
  })

  it('TEST 6: Empty body returns 200 without touching DB', async () => {
    const body = {}
    const req = makeReq(body)
    const res = await PUT(req, makeParams(PRODUCT_ID))

    expect(res.status).toBe(200)
    expect(productUpdate).not.toHaveBeenCalled()
    expect(productVariantDeleteMany).not.toHaveBeenCalled()
  })

  it('TEST 7: Negative price is rejected', async () => {
    const body = { price: -10 }
    const req = makeReq(body)
    const res = await PUT(req, makeParams(PRODUCT_ID))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
    expect(productUpdate).not.toHaveBeenCalled()
  })

  it('TEST 8: Combined clear images + new shipping works', async () => {
    const body = { images: [], weight: 8, length: 5 }
    const req = makeReq(body)
    const res = await PUT(req, makeParams(PRODUCT_ID))

    expect(res.status).toBe(200)
    const callArg = productUpdate.mock.calls[0][0] as { where: unknown; data: Record<string, unknown> }
    const updateData = callArg.data
    expect(updateData.images).toBe('[]')
    expect(updateData.weight).toBe(8)
    expect(updateData.length).toBe(5)
    expect(updateData.name).toBeUndefined()
    expect(updateData.benefits).toBeUndefined()
  })
})
