/**
 * Central SEO infrastructure for Angelsbeauty.
 *
 * Exports:
 *  - SITE_CONFIG          : brand/site constants (name, URL, social, theme color)
 *  - PAGE_METADATA        : per-route PageSeo entries (title, desc, canonical, noindex)
 *  - getProductSeo(p)     : build PageSeo for a product detail page
 *  - buildCanonical(path) : absolute canonical URL from a canonical path
 *  - buildBaseMetadata()  : Next.js Metadata for layout.tsx
 *  - buildOrganizationJsonLd(), buildWebsiteJsonLd(),
 *    buildBreadcrumbJsonLd(crumbs), buildProductJsonLd(p)
 *  - getBreadcrumbsForPage(page, params)
 *
 * NOTE: routing is hash-based SPA (e.g. /#product/slug). Product canonicals
 * use the logical path "/product/slug" — a stable identifier search engines
 * can use even though the live URL contains a hash fragment.
 */

import type { Metadata } from 'next'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PageSeo {
  title: string
  description: string
  canonicalPath: string
  noindex: boolean
  keywords?: string[]
}

/**
 * Subset of the Prisma Product model that SEO helpers need.
 * Kept loose so any object with these fields works (API payload, DB row, …).
 */
export interface SeoProduct {
  id: string
  name: string
  slug: string
  description: string
  price: number
  comparePrice?: number | null
  categorySlug?: string
  images: string // JSON-encoded string array (Prisma can't store lists directly)
  stock?: number
  benefits?: string
  ingredients?: string
  howToUse?: string
  freeShipping?: boolean
  /**
   * Optional list of product variants. When more than one ACTIVE variant is
   * present, the structured data uses `AggregateOffer` (with lowPrice /
   * highPrice / offerCount) instead of a single `Offer`.
   */
  variants?: SeoProductVariant[]
}

export interface SeoProductVariant {
  id: string
  name: string
  sku?: string | null
  price: number
  comparePrice?: number | null
  stock?: number
  active?: boolean
  order?: number
}

export interface BreadcrumbItem {
  name: string
  url: string
}

// ---------------------------------------------------------------------------
// Site configuration
// ---------------------------------------------------------------------------

export const SITE_CONFIG = {
  name: 'Angelsbeauty',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://angelsbeauty.com').replace(/\/$/, ''),
  defaultOgImage: '/opengraph-image',
  defaultTwitterImage: '/twitter-image',
  contactEmail: 'support@angelsbeauty.com',
  social: {
    instagram: 'https://www.instagram.com/angelsbeauty',
    tiktok: 'https://www.tiktok.com/@angelsbeauty',
  },
  themeColor: '#C9A86A',
  locale: 'en_US',
  ogImageWidth: 1200,
  ogImageHeight: 630,
} as const

// ---------------------------------------------------------------------------
// Per-route metadata
// ---------------------------------------------------------------------------

export const PAGE_METADATA: Record<string, PageSeo> = {
  home: {
    title: 'Angelsbeauty | Premium Skincare for Radiant Skin',
    description:
      'Discover premium skincare products designed to help you feel confident, radiant and beautiful. Shop cleansers, moisturizers, serums and more at Angelsbeauty.',
    canonicalPath: '/',
    noindex: false,
    keywords: [
      'skincare',
      'beauty',
      'premium skincare',
      'Angelsbeauty',
      'cleansers',
      'moisturizers',
      'serums',
      'face masks',
    ],
  },
  shop: {
    title: 'Shop All Skincare | Angelsbeauty',
    description:
      'Browse the full Angelsbeauty skincare collection — cleansers, serums, moisturizers, masks and treatments. Free shipping on select items.',
    canonicalPath: '/#shop',
    noindex: false,
    keywords: [
      'shop skincare',
      'skincare products',
      'buy skincare online',
      'beauty shop',
      'Angelsbeauty shop',
    ],
  },
  product: {
    // Placeholder — real product pages use getProductSeo()
    title: 'Product | Angelsbeauty',
    description: 'Premium skincare product from Angelsbeauty.',
    canonicalPath: '/#shop',
    noindex: false,
  },
  cart: {
    title: 'Your Cart | Angelsbeauty',
    description: 'Review your selected skincare items before checkout.',
    canonicalPath: '/#cart',
    noindex: true,
  },
  checkout: {
    title: 'Secure Checkout | Angelsbeauty',
    description: 'Complete your skincare order securely with Clover payment.',
    canonicalPath: '/#checkout',
    noindex: true,
  },
  about: {
    title: 'About Angelsbeauty | Our Story',
    description:
      'Learn about Angelsbeauty — premium skincare crafted to help you reveal your natural glow and feel radiant every day.',
    canonicalPath: '/#about',
    noindex: false,
    keywords: ['about angelsbeauty', 'skincare brand story', 'beauty founders'],
  },
  contact: {
    title: 'Contact Us | Angelsbeauty',
    description:
      'Reach the Angelsbeauty team — questions about orders, products, or partnerships. We respond within 24 hours.',
    canonicalPath: '/#contact',
    noindex: false,
    keywords: ['contact angelsbeauty', 'skincare support', 'beauty customer service'],
  },
  account: {
    title: 'My Account | Angelsbeauty',
    description: 'Manage your Angelsbeauty account, orders and saved addresses.',
    canonicalPath: '/#account',
    noindex: true,
  },
  admin: {
    title: 'Admin | Angelsbeauty',
    description: 'Angelsbeauty admin dashboard.',
    canonicalPath: '/auth',
    noindex: true,
  },
  'order-success': {
    title: 'Order Confirmed | Angelsbeauty',
    description:
      'Your Angelsbeauty order has been confirmed. Thank you for shopping with us.',
    canonicalPath: '/#order-success',
    noindex: true,
  },
  'checkout-failed': {
    title: 'Payment Failed | Angelsbeauty',
    description:
      'Your payment could not be completed. Please try again or contact support.',
    canonicalPath: '/#checkout-failed',
    noindex: true,
  },
  privacy: {
    title: 'Privacy Policy | Angelsbeauty',
    description:
      'Read the Angelsbeauty privacy policy — how we collect, use and protect your personal data.',
    canonicalPath: '/#privacy',
    noindex: false,
  },
  terms: {
    title: 'Terms of Service | Angelsbeauty',
    description:
      'Read the Angelsbeauty terms of service — the agreement between you and Angelsbeauty.',
    canonicalPath: '/#terms',
    noindex: false,
  },
  shipping: {
    title: 'Shipping & Returns | Angelsbeauty',
    description:
      'Learn about Angelsbeauty shipping options, delivery times and our return policy.',
    canonicalPath: '/#shipping',
    noindex: false,
  },
  '404': {
    title: 'Page Not Found | Angelsbeauty',
    description: 'The page you are looking for could not be found.',
    canonicalPath: '/',
    noindex: true,
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getProductSeo(p: SeoProduct): PageSeo {
  const inStock = !!(p.stock && p.stock > 0)
  return {
    title: `${p.name} | Angelsbeauty`,
    description: p.description || `${p.name} — premium skincare from Angelsbeauty.`,
    canonicalPath: `/product/${p.slug}`,
    noindex: !inStock,
  }
}

export function buildCanonical(canonicalPath: string): string {
  const base = SITE_CONFIG.url
  if (!canonicalPath || canonicalPath === '/') return base
  const path = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`
  return `${base}${path}`
}

// ---------------------------------------------------------------------------
// Base Next.js Metadata (for layout.tsx)
// ---------------------------------------------------------------------------

export function buildBaseMetadata(): Metadata {
  const base = SITE_CONFIG.url
  return {
    metadataBase: new URL(base),
    title: {
      default: PAGE_METADATA.home.title,
      template: `%s | ${SITE_CONFIG.name}`,
    },
    description: PAGE_METADATA.home.description,
    keywords: PAGE_METADATA.home.keywords,
    authors: [{ name: SITE_CONFIG.name }],
    creator: SITE_CONFIG.name,
    publisher: SITE_CONFIG.name,
    applicationName: SITE_CONFIG.name,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: SITE_CONFIG.locale,
      url: base,
      siteName: SITE_CONFIG.name,
      title: PAGE_METADATA.home.title,
      description: PAGE_METADATA.home.description,
      images: [
        {
          url: SITE_CONFIG.defaultOgImage,
          width: SITE_CONFIG.ogImageWidth,
          height: SITE_CONFIG.ogImageHeight,
          alt: `${SITE_CONFIG.name} — Premium Skincare`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: PAGE_METADATA.home.title,
      description: PAGE_METADATA.home.description,
      images: [SITE_CONFIG.defaultTwitterImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    icons: {
      icon: [{ url: '/icon.png', sizes: '512x512', type: 'image/png' }],
      shortcut: [{ url: '/favicon.ico' }],
      apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    manifest: '/manifest.webmanifest',
  }
}

// ---------------------------------------------------------------------------
// JSON-LD builders
// ---------------------------------------------------------------------------

export function buildOrganizationJsonLd() {
  const base = SITE_CONFIG.url
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_CONFIG.name,
    url: base,
    logo: `${base}/images/logo.png`,
    email: SITE_CONFIG.contactEmail,
    sameAs: [SITE_CONFIG.social.instagram, SITE_CONFIG.social.tiktok],
  }
}

export function buildWebsiteJsonLd() {
  const base = SITE_CONFIG.url
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_CONFIG.name,
    url: base,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${base}/#shop?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildBreadcrumbJsonLd(crumbs: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  }
}

export function buildProductJsonLd(p: SeoProduct) {
  const base = SITE_CONFIG.url

  // Parse the JSON-encoded images array
  let images: string[] = []
  try {
    const parsed = JSON.parse(p.images || '[]')
    if (Array.isArray(parsed)) {
      images = parsed
        .filter((img: unknown): img is string => typeof img === 'string' && img.length > 0)
        .map((img: string) =>
          img.startsWith('http') ? img : `${base}${img.startsWith('/') ? '' : '/'}${img}`
        )
    }
  } catch {
    images = []
  }

  const productUrl = `${base}/#product/${p.slug}`

  // Determine active variants — used to decide between Offer and AggregateOffer.
  // `product.price` is a denormalized cache = min(active variant prices), so it
  // serves as `lowPrice` for an AggregateOffer.
  const activeVariants = (p.variants || []).filter(
    (v) => v.active !== false && typeof v.price === 'number'
  )
  const isMultiVariant = activeVariants.length > 1

  let offers: Record<string, unknown>

  if (isMultiVariant) {
    const prices = activeVariants.map((v) => v.price)
    const lowPrice = Math.min(...prices)
    const highPrice = Math.max(...prices)
    offers = {
      '@type': 'AggregateOffer',
      url: productUrl,
      priceCurrency: 'USD',
      lowPrice,
      highPrice,
      offerCount: activeVariants.length,
      availability:
        p.stock && p.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE_CONFIG.name },
    }
    // Preserve comparePrice signal via priceSpecification when the cheapest
    // variant is on sale (lowPrice < its comparePrice, or any variant has one).
    if (p.comparePrice && p.comparePrice > lowPrice) {
      offers.priceSpecification = {
        '@type': 'PriceSpecification',
        price: p.comparePrice,
        priceCurrency: 'USD',
      }
    }
  } else {
    offers = {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'USD',
      price: p.price,
      availability:
        p.stock && p.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE_CONFIG.name },
    }

    if (p.comparePrice && p.comparePrice > p.price) {
      offers.priceSpecification = {
        '@type': 'PriceSpecification',
        price: p.comparePrice,
        priceCurrency: 'USD',
      }
    }
  }

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    sku: p.slug,
    url: productUrl,
    brand: { '@type': 'Brand', name: SITE_CONFIG.name },
    offers,
  }

  if (p.categorySlug) schema.category = p.categorySlug
  if (images.length > 0) schema.image = images
  if (p.freeShipping) {
    offers.shippingDetails = {
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'USD' },
    }
  }

  return schema
}

// ---------------------------------------------------------------------------
// Breadcrumbs per page
// ---------------------------------------------------------------------------

export function getBreadcrumbsForPage(
  page: string,
  params: Record<string, string> = {}
): BreadcrumbItem[] {
  const base = SITE_CONFIG.url
  const home: BreadcrumbItem = { name: 'Home', url: `${base}/` }

  switch (page) {
    case 'home':
      return [home]
    case 'shop':
      return [home, { name: 'Shop', url: `${base}/#shop` }]
    case 'product':
      return [
        home,
        { name: 'Shop', url: `${base}/#shop` },
        { name: 'Product', url: `${base}/#product/${params.slug || ''}` },
      ]
    case 'about':
      return [home, { name: 'About', url: `${base}/#about` }]
    case 'contact':
      return [home, { name: 'Contact', url: `${base}/#contact` }]
    case 'cart':
      return [home, { name: 'Cart', url: `${base}/#cart` }]
    case 'checkout':
      return [
        home,
        { name: 'Cart', url: `${base}/#cart` },
        { name: 'Checkout', url: `${base}/#checkout` },
      ]
    case 'account':
      return [home, { name: 'Account', url: `${base}/#account` }]
    case 'order-success':
      return [home, { name: 'Order Confirmed', url: `${base}/#order-success` }]
    case 'checkout-failed':
      return [home, { name: 'Checkout', url: `${base}/#checkout` }]
    case 'privacy':
      return [home, { name: 'Privacy Policy', url: `${base}/#privacy` }]
    case 'terms':
      return [home, { name: 'Terms of Service', url: `${base}/#terms` }]
    case 'shipping':
      return [home, { name: 'Shipping & Returns', url: `${base}/#shipping` }]
    default:
      return [home]
  }
}
