import { db } from '@/lib/db'

/**
 * Shared home-data fetcher.
 * Used by:
 *  - Server-side render in src/app/page.tsx  (instant first paint)
 *  - API route /api/home-data                (client refresh / navigation)
 *
 * Optimisations:
 *  - Promise.all runs all 10 queries in parallel (one DB round-trip worth of latency)
 *  - `select` picks only the fields the UI actually renders → smaller payload + faster serialisation
 *  - In-memory cache (5 min TTL) so the very first visitor still gets a fast response
 */

export interface HomeData {
  success: boolean
  featured: unknown[]
  newArrivals: unknown[]
  bestSellers: unknown[]
  promos: unknown[]
  heroSlides: unknown[]
  partners: unknown[]
  transformations: unknown[]
  inspirationItems: unknown[]
  announcementItems: unknown[]
  categories: unknown[]
}

// --- In-memory cache (shared between SSR + API) ---------------------------
let cachedData: HomeData | null = null
let cachedAt = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function getCachedHomeData(): HomeData | null {
  if (cachedData && Date.now() - cachedAt < CACHE_TTL) {
    return cachedData
  }
  return null
}

export function isHomeDataFresh(): boolean {
  return cachedData !== null && Date.now() - cachedAt < CACHE_TTL
}

// Only the fields the home page UI actually renders
// `variants` is included so the storefront can detect multi-variant products
// and render the "From $X" price label, matching the /api/products behaviour.
const PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  price: true,
  comparePrice: true,
  categorySlug: true,
  images: true,
  featured: true,
  newArrival: true,
  bestSeller: true,
  freeShipping: true,
  stock: true,
  description: true,
  variants: {
    orderBy: { order: 'asc' },
  },
} as const

export async function fetchHomeData(): Promise<HomeData> {
  // Return cache immediately if fresh — keeps every visitor fast permanently
  const cached = getCachedHomeData()
  if (cached) return cached

  // Parallel queries: one DB latency window instead of 10 sequential ones.
  const [
    featured,
    newArrivals,
    bestSellers,
    promos,
    heroSlides,
    partners,
    transformations,
    inspirationItems,
    announcementItems,
    categories,
  ] = await Promise.all([
    db.product.findMany({
      where: { featured: true, stock: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      select: PRODUCT_SELECT,
      take: 8,
    }),
    db.product.findMany({
      where: { newArrival: true, stock: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      select: PRODUCT_SELECT,
      take: 8,
    }),
    db.product.findMany({
      where: { bestSeller: true, stock: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      select: PRODUCT_SELECT,
      take: 8,
    }),
    db.promoBanner.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    }),
    db.heroSlide.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    }),
    db.partner.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    }),
    db.transformation.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    }),
    db.inspirationItem.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    }),
    db.announcementItem.findMany({
      orderBy: { order: 'asc' },
    }),
    db.category.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    }),
  ])

  const data: HomeData = {
    success: true,
    featured,
    newArrivals,
    bestSellers,
    promos,
    heroSlides,
    partners,
    transformations,
    inspirationItems,
    announcementItems,
    categories,
  }

  // Populate cache
  cachedData = data
  cachedAt = Date.now()

  return data
}
