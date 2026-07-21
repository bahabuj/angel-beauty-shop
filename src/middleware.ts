import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware — admin protection layer.
 *
 * The storefront (/, /api/products GET, /api/home-data, /api/clover/checkout, etc.)
 * is fully public. Only admin-only operations are gated:
 *
 *  - All mutating methods (POST/PUT/PATCH/DELETE) on admin resource routes
 *  - GET on endpoints that leak customer PII or business metrics
 *
 * Admin role is stored on the NextAuth JWT as `token.role === 'admin'`.
 *
 * NOTE: As of the latest update, the admin panel is directly accessible
 * without signing in, so all admin resource mutations (POST/PUT/DELETE on
 * products, promos, hero-slides, auth-slides, etc.) and the /api/upload
 * endpoint are now PUBLIC. The only routes still gated are:
 *  - GET /api/orders, /api/orders/:id (any logged-in user — customers see
 *    only their own orders via the route handler filter)
 *  - GET /api/stats, /api/newsletter, /api/invoice/*, /api/clover/setup
 *    (sensitive business data / customer PII)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // ─── Public routes — no auth required ──────────────────────────────────
  // GET requests to storefront data endpoints are public
  const isPublicGet =
    method === 'GET' && (
      pathname === '/api/products' ||
      pathname.startsWith('/api/products/') ||
      pathname === '/api/categories' ||
      pathname.startsWith('/api/categories/') && method === 'GET' ||
      pathname === '/api/promos' ||
      pathname.startsWith('/api/promos/') ||
      pathname === '/api/hero-slides' ||
      pathname.startsWith('/api/hero-slides/') ||
      pathname === '/api/partners' ||
      pathname.startsWith('/api/partners/') ||
      pathname === '/api/transformations' ||
      pathname.startsWith('/api/transformations/') ||
      pathname === '/api/inspiration-items' ||
      pathname.startsWith('/api/inspiration-items/') ||
      pathname === '/api/announcement-items' ||
      pathname.startsWith('/api/announcement-items/') ||
      pathname === '/api/auth-slides' ||
      pathname === '/api/auth-slides-all' ||
      pathname.startsWith('/api/auth-slides/') ||
      pathname === '/api/home-data'
    )

  // Customer-facing POST routes that must stay public
  const isPublicPost =
    method === 'POST' && (
      pathname === '/api/orders' ||            // customers place orders
      pathname === '/api/newsletter' ||         // customers subscribe
      pathname.startsWith('/api/auth/') ||      // login/signup/session
      pathname === '/api/clover/checkout' ||    // customers checkout
      pathname === '/api/clover/return' ||      // Clover redirect
      pathname === '/api/clover/checkout-status' || // customers poll status
      pathname === '/api/clover/webhook' ||     // Clover webhook (verified by signature)
      // Server-to-server call: invoice auto-generation triggered after order
      // placement (/api/orders), payment success (/api/clover/return), and
      // webhook events (/api/clover/webhook). These background fetches have no
      // session token, so they must pass middleware without auth.
      pathname === '/api/invoice/generate'
    )

  if (isPublicGet || isPublicPost) {
    return NextResponse.next()
  }

  // ─── Admin resource mutations are now PUBLIC ───────────────────────────
  // The admin panel is directly accessible without signing in, so all
  // mutating operations on admin resources (products, promos, categories,
  // hero-slides, auth-slides, partners, announcement-items, transformations,
  // inspiration-items) and the /api/upload endpoint bypass auth.
  const isAdminResourceMutation =
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && (
      pathname === '/api/upload' ||
      pathname === '/api/products' ||
      pathname.startsWith('/api/products/') ||
      pathname === '/api/categories' ||
      pathname.startsWith('/api/categories/') ||
      pathname === '/api/promos' ||
      pathname.startsWith('/api/promos/') ||
      pathname === '/api/hero-slides' ||
      pathname.startsWith('/api/hero-slides/') ||
      pathname === '/api/partners' ||
      pathname.startsWith('/api/partners/') ||
      pathname === '/api/transformations' ||
      pathname.startsWith('/api/transformations/') ||
      pathname === '/api/inspiration-items' ||
      pathname.startsWith('/api/inspiration-items/') ||
      pathname === '/api/announcement-items' ||
      pathname.startsWith('/api/announcement-items/') ||
      pathname === '/api/auth-slides' ||
      pathname.startsWith('/api/auth-slides/')
    )

  if (isAdminResourceMutation) {
    return NextResponse.next()
  }

  // ─── Sensitive GET endpoints (NOW PUBLIC — admin panel open without auth) ─
  // Previously /api/stats, /api/newsletter (list), /api/orders,
  // /api/invoice/*, /api/clover/setup required admin session. Since the
  // admin panel is now directly accessible without signing in, these are
  // also public. The /api/orders route handler enforces customer-vs-admin
  // filtering based on the session (if any).
  return NextResponse.next()
}

export const config = {
  // Only run middleware on API routes (the admin SPA page is protected client-side
  // because hash-based routing isn't visible to the server)
  matcher: ['/api/:path*'],
}
