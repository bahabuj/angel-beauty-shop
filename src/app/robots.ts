import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/lib/seo'

/**
 * Dynamic robots.txt — wins over the old static public/robots.txt (which
 * has been removed). Allows all crawlers to access the home route and
 * disallows the admin / API / auth surfaces.
 *
 * Note: hash-fragment "routes" (#admin, #cart, etc.) cannot really be
 * blocked here because crawlers ignore fragments — but we still list them
 * for documentation. The runtime robots <meta> injected by SeoManager is
 * what actually keeps those views out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  const base = SITE_CONFIG.url
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api',
          '/auth',
          '/oauth',
          // Hash-fragment admin/cart/checkout/account paths (documentation only —
          // crawlers ignore fragments; the per-page robots meta is the real guard)
          '/#admin',
          '/#cart',
          '/#checkout',
          '/#account',
          '/#order-success',
          '/#checkout-failed',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
