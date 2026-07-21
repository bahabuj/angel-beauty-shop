'use client'

/**
 * SeoManager — client-side <head> updater for the hash-based SPA.
 *
 * Because all "pages" render at a single Next.js route (the hash fragment
 * changes client-side via useNavStore), Next's per-route generateMetadata
 * never fires. SeoManager fills that gap by listening to nav-store changes
 * and updating document.title, meta tags, the canonical link, robots meta,
 * OpenGraph / Twitter tags, and JSON-LD scripts on every soft navigation.
 *
 * Design notes:
 *  - Single useEffect closure (no separate useState + secondary effect —
 *    that pattern triggers react-compiler warnings). Product data is fetched
 *    inside the effect, then applyHead() is called directly.
 *  - Stale JSON-LD <script> blocks are removed on every update before the
 *    new ones are injected so the head never accumulates duplicate schemas.
 *  - robots meta is ALWAYS set explicitly — "index, follow" or "noindex,
 *    nofollow" — so a noindex page that was previously indexable gets
 *    downgraded, and vice versa.
 *  - OG image: home/shop/etc use the branded /opengraph-image; product
 *    pages override with the first product image.
 */

import { useEffect } from 'react'
import { useNavStore } from '@/store/nav-store'
import {
  SITE_CONFIG,
  PAGE_METADATA,
  getProductSeo,
  buildCanonical,
  getBreadcrumbsForPage,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  type SeoProduct,
} from '@/lib/seo'

const JSONLD_MARKER = 'data-seo-jsonld'

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function upsertMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function clearJsonLd() {
  document.head
    .querySelectorAll(`script[type="application/ld+json"][${JSONLD_MARKER}]`)
    .forEach((el) => el.remove())
}

function setJsonLd(scripts: object[]) {
  clearJsonLd()
  for (const data of scripts) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute(JSONLD_MARKER, 'true')
    script.textContent = JSON.stringify(data)
    document.head.appendChild(script)
  }
}

// ---------------------------------------------------------------------------
// Head application
// ---------------------------------------------------------------------------

function resolveOgImage(page: string, product: SeoProduct | null): {
  url: string
  alt: string
} {
  if (page === 'product' && product) {
    try {
      const imgs = JSON.parse(product.images || '[]')
      if (Array.isArray(imgs) && imgs.length > 0 && typeof imgs[0] === 'string') {
        const img: string = imgs[0]
        const url = img.startsWith('http')
          ? img
          : `${SITE_CONFIG.url}${img.startsWith('/') ? '' : '/'}${img}`
        return { url, alt: product.name }
      }
    } catch {
      // fall through to default
    }
  }
  return {
    url: `${SITE_CONFIG.url}${SITE_CONFIG.defaultOgImage}`,
    alt: `${SITE_CONFIG.name} — Premium Skincare`,
  }
}

function applyHead(
  page: string,
  params: Record<string, string>,
  product: SeoProduct | null
) {
  // Resolve PageSeo — product pages use getProductSeo() if we have data,
  // otherwise fall back to the placeholder entry in PAGE_METADATA.
  const seo =
    page === 'product' && product
      ? getProductSeo(product)
      : PAGE_METADATA[page] || PAGE_METADATA.home

  // --- title ---
  document.title = seo.title

  // --- description / keywords ---
  upsertMeta('name', 'description', seo.description)
  const keywords = (seo.keywords || []).join(', ')
  upsertMeta('name', 'keywords', keywords)

  // --- canonical ---
  upsertLink('canonical', buildCanonical(seo.canonicalPath))

  // --- robots — ALWAYS set explicitly ---
  upsertMeta('name', 'robots', seo.noindex ? 'noindex, nofollow' : 'index, follow')

  // --- OpenGraph ---
  const ogImage = resolveOgImage(page, product)
  upsertMeta('property', 'og:type', page === 'product' && product ? 'product' : 'website')
  upsertMeta('property', 'og:site_name', SITE_CONFIG.name)
  upsertMeta('property', 'og:locale', SITE_CONFIG.locale.replace('_', '-'))
  upsertMeta('property', 'og:url', buildCanonical(seo.canonicalPath))
  upsertMeta('property', 'og:title', seo.title)
  upsertMeta('property', 'og:description', seo.description)
  upsertMeta('property', 'og:image', ogImage.url)
  upsertMeta('property', 'og:image:width', String(SITE_CONFIG.ogImageWidth))
  upsertMeta('property', 'og:image:height', String(SITE_CONFIG.ogImageHeight))
  upsertMeta('property', 'og:image:alt', ogImage.alt)

  // --- Twitter ---
  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', seo.title)
  upsertMeta('name', 'twitter:description', seo.description)
  upsertMeta('name', 'twitter:image', ogImage.url)
  upsertMeta('name', 'twitter:image:alt', ogImage.alt)

  // --- JSON-LD scripts ---
  const scripts: object[] = []
  // Organization sitewide
  scripts.push(buildOrganizationJsonLd())
  // WebSite home only
  if (page === 'home') {
    scripts.push(buildWebsiteJsonLd())
  }
  // BreadcrumbList every page
  scripts.push(buildBreadcrumbJsonLd(getBreadcrumbsForPage(page, params)))
  // Product on product detail pages (only if we have product data)
  if (page === 'product' && product) {
    scripts.push(buildProductJsonLd(product))
  }
  setJsonLd(scripts)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SeoManager() {
  const currentPage = useNavStore((s) => s.currentPage)
  const pageParams = useNavStore((s) => s.pageParams)

  useEffect(() => {
    let cancelled = false

    async function run() {
      let product: SeoProduct | null = null

      if (currentPage === 'product' && pageParams.slug) {
        try {
          const res = await fetch(`/api/products/slug/${pageParams.slug}`)
          if (res.ok) {
            const data = await res.json()
            if (data?.success && data.product) {
              product = data.product as SeoProduct
            }
          }
        } catch {
          // network / parsing error — fall back to no-product SEO
        }
      }

      if (!cancelled) {
        applyHead(currentPage, pageParams, product)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [currentPage, pageParams])

  return null
}
