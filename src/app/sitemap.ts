import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { SITE_CONFIG } from '@/lib/seo'

/**
 * Dynamic sitemap.xml — emits one entry per indexable static route plus
 * one entry per in-stock product.
 *
 * Because routing is hash-based SPA, product URLs use the /#product/slug
 * format. Crawlers do follow hash fragments for indexing when the page
 * content changes (Google renders JS), and including them here signals
 * our preferred URL structure.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_CONFIG.url
  const now = new Date()

  // Static indexable routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${base}/#shop`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${base}/#about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${base}/#contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${base}/#privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${base}/#terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${base}/#shipping`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ]

  // One entry per in-stock product
  let productRoutes: MetadataRoute.Sitemap = []
  try {
    const products = await db.product.findMany({
      where: { stock: { gt: 0 } },
      select: { slug: true, updatedAt: true },
    })
    productRoutes = products.map((p) => ({
      url: `${base}/#product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch (e) {
    // If the DB is unavailable, fall back to the static routes only
    console.error('[sitemap] product query failed:', e)
  }

  return [...staticRoutes, ...productRoutes]
}
