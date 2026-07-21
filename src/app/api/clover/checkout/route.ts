import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CLOVER_CONFIG, createHostedCheckout, type HostedCheckoutLineItem } from '@/lib/clover'
import { getSiteUrl } from '@/lib/utils'
import { primeSettingsCache } from '@/lib/settings-db'

// ─── Debug Logging ────────────────────────────────────────────────────────────
// Verbose checkout-flow logs are gated behind CLOVER_DEBUG so they never fire
// in production. `console.error` and `console.warn` remain ungated.
// ─────────────────────────────────────────────────────────────────────────────

const CLOVER_DEBUG = process.env.CLOVER_DEBUG === 'true'

/** Debug-only logger — only fires when CLOVER_DEBUG=true. */
function debug(...args: unknown[]): void {
  if (CLOVER_DEBUG) console.log(...args)
}

// ─── Clover Hosted Checkout Route ────────────────────────────────────────────
//
// Creates a Clover Hosted Checkout session using the Ecommerce API.
// The customer is redirected to Clover's hosted payment page where they
// enter payment details securely. No card data ever touches our server.
//
// Required Environment Variables:
//   CLOVER_ECOM_TOKEN       — Ecommerce API Private Token (Bearer for Hosted Checkout)
//   CLOVER_ECOM_MERCHANT_ID — Ecommerce merchant ID (from Ecommerce API Tokens page)
//   OR
//   CLOVER_ACCESS_TOKEN     — OAuth access token (alternative auth)
//   CLOVER_MERCHANT_ID      — POS merchant ID (alternative)
//   CLOVER_ENVIRONMENT      — "sandbox" | "production"
//
// Clover Hosted Checkout API:
//   POST /invoicingcheckoutservice/v1/checkouts
//   Authorization: Bearer {ecom_private_token}
//   X-Clover-Merchant-Id: {ecom_merchant_id}
//   Body: { customer, shoppingCart: { lineItems } }
// ─────────────────────────────────────────────────────────────────────────────

interface CreateCheckoutRequest {
  orderId: string
  items: Array<{
    name: string
    price: number  // in dollars
    quantity: number
    image?: string
  }>
  subtotal: number   // in dollars
  shipping: number   // in dollars
  total: number      // in dollars
  customerEmail: string
  customerName: string
  customerPhone?: string
  address: string
  city: string
  state?: string
  zipCode?: string
  country?: string
}

export async function POST(request: NextRequest) {
  try {
    // ─── Prime DB settings cache BEFORE any config check ─────────────
    // If .env.local was wiped by the sandbox, the DB-backed credentials
    // are the fallback. This await guarantees the cache is populated
    // before isConfigured() is evaluated. Without this, the first request
    // after a server restart would see isConfigured=false even though the
    // credentials exist in the Setting table.
    await primeSettingsCache()

    // ─── Log Clover config state at entry ─────────────────────────────
    debug('[Clover Checkout] ══════════════════════════════════════════════════════')
    debug('[Clover Checkout] CONFIG AT REQUEST TIME:')
    debug(`[Clover Checkout]   CLOVER_ECOM_TOKEN loaded:        ${!!CLOVER_CONFIG.ecomToken}`)
    debug(`[Clover Checkout]   CLOVER_ECOM_TOKEN prefix:        ${CLOVER_CONFIG.ecomToken ? CLOVER_CONFIG.ecomToken.substring(0, 8) + '...' : 'N/A'}`)
    debug(`[Clover Checkout]   CLOVER_ECOM_MERCHANT_ID:          ${CLOVER_CONFIG.ecomMerchantId || 'NOT SET'}`)
    debug(`[Clover Checkout]   CLOVER_ENVIRONMENT:               ${CLOVER_CONFIG.environment}`)
    debug(`[Clover Checkout]   Merchant base URL:                ${CLOVER_CONFIG.merchantBaseUrl}`)
    debug(`[Clover Checkout]   Checkout endpoint:                ${CLOVER_CONFIG.merchantBaseUrl}/invoicingcheckoutservice/v1/checkouts`)
    debug(`[Clover Checkout]   isConfigured:                     ${CLOVER_CONFIG.isConfigured}`)
    debug(`[Clover Checkout]   isUsingEcomApi:                   ${CLOVER_CONFIG.isUsingEcomApi}`)
    debug('[Clover Checkout] ══════════════════════════════════════════════════════')

    // ─── Verify Clover is configured ────────────────────────────────────
    if (!CLOVER_CONFIG.isConfigured) {
      console.error('[Clover Checkout] ❌ NOT CONFIGURED — Bearer token or Merchant ID missing')
      console.error(`[Clover Checkout]   bearerToken set: ${!!CLOVER_CONFIG.bearerToken}`)
      console.error(`[Clover Checkout]   checkoutMerchantId: ${CLOVER_CONFIG.checkoutMerchantId || 'EMPTY'}`)
      return NextResponse.json(
        {
          success: false,
          error: 'Payment system is not configured. Set CLOVER_ECOM_TOKEN and CLOVER_ECOM_MERCHANT_ID in .env.local (or complete OAuth flow for CLOVER_ACCESS_TOKEN).',
          requiresConfig: true,
          debug: {
            ecomTokenSet: !!CLOVER_CONFIG.ecomToken,
            ecomMerchantId: CLOVER_CONFIG.ecomMerchantId || null,
            accessTokenSet: !!CLOVER_CONFIG.accessToken,
            merchantId: CLOVER_CONFIG.merchantId || null,
            environment: CLOVER_CONFIG.environment,
          },
        },
        { status: 503 }
      )
    }

    const body: CreateCheckoutRequest = await request.json()

    debug('[Clover Checkout] Request body received:', {
      orderId: body.orderId,
      itemsCount: body.items?.length || 0,
      subtotal: body.subtotal,
      shipping: body.shipping,
      total: body.total,
      customerEmail: body.customerEmail,
      customerName: body.customerName,
    })

    // ─── Validate required fields ──────────────────────────────────────
    if (!body.orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order items are required' },
        { status: 400 }
      )
    }

    if (typeof body.total !== 'number' || body.total <= 0 || isNaN(body.total)) {
      console.error(`[Clover Checkout] Invalid total: ${body.total} (type: ${typeof body.total})`)
      return NextResponse.json(
        { success: false, error: `Invalid payment amount: ${body.total}` },
        { status: 400 }
      )
    }

    if (!body.customerEmail || !body.customerName) {
      return NextResponse.json(
        { success: false, error: 'Customer name and email are required' },
        { status: 400 }
      )
    }

    // ─── Verify order exists and has pending payment ──────────────────
    const order = await db.order.findUnique({ where: { id: body.orderId } })
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.paymentStatus !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Order payment is already processed' },
        { status: 400 }
      )
    }

    // ─── Detailed total mismatch diagnostics ──────────────────────────
    // Log every value so we can see exactly why totals differ
    const orderItems = (() => { try { return JSON.parse(order.items) } catch { return [] } })()
    const serverSubtotal = order.subtotal
    const serverShipping = order.total - order.subtotal
    const serverTotal = order.total

    debug('[Clover Checkout] ══════════════════════════════════════════════════════')
    debug('[Clover Checkout] TOTAL COMPARISON — FULL BREAKDOWN')
    debug('[Clover Checkout] ── CLIENT VALUES (from checkout page) ──')
    debug(`[Clover Checkout]   Client subtotal:   $${body.subtotal}`)
    debug(`[Clover Checkout]   Client shipping:   $${body.shipping}`)
    debug(`[Clover Checkout]   Client tax:        $0 (not implemented)`)
    debug(`[Clover Checkout]   Client discount:   $0 (not implemented)`)
    debug(`[Clover Checkout]   Client total:      $${body.total}`)
    debug('[Clover Checkout] ── SERVER VALUES (from DB order) ──')
    debug(`[Clover Checkout]   Order subtotal:    $${serverSubtotal}`)
    debug(`[Clover Checkout]   Order shipping:    $${serverShipping}`)
    debug(`[Clover Checkout]   Order tax:         $0 (not implemented)`)
    debug(`[Clover Checkout]   Order discount:    $0 (not implemented)`)
    debug(`[Clover Checkout]   Order total:       $${serverTotal}`)
    debug('[Clover Checkout] ── ITEM-BY-ITEM COMPARISON ──')
    body.items.forEach((item, i) => {
      const dbItem = orderItems[i]
      debug(`[Clover Checkout]   Item ${i + 1}: client price=$${item.price} x ${item.quantity} = $${item.price * item.quantity}` +
        (dbItem ? ` | DB price=$${dbItem.price} x ${dbItem.quantity || item.quantity} = $${dbItem.price * (dbItem.quantity || item.quantity)}` : ' | (no DB match)'))
    })
    debug(`[Clover Checkout]   DIFFERENCE: $${Math.abs(serverTotal - body.total).toFixed(2)}`)
    debug('[Clover Checkout] ══════════════════════════════════════════════════════')

    if (Math.abs(serverTotal - body.total) > 0.01) {
      console.error(`[Clover Checkout] ❌ TOTAL MISMATCH: order.total=$${serverTotal} vs body.total=$${body.total} (diff=$${Math.abs(serverTotal - body.total).toFixed(2)})`)
      console.error('[Clover Checkout] This usually means client cart prices are stale — server overrode them with DB prices in /api/orders')
      return NextResponse.json(
        {
          success: false,
          error: 'Order total does not match. Please refresh and try again.',
          debug: {
            orderTotal: serverTotal,
            clientTotal: body.total,
            difference: Math.abs(serverTotal - body.total),
            orderSubtotal: serverSubtotal,
            clientSubtotal: body.subtotal,
            orderShipping: serverShipping,
            clientShipping: body.shipping,
          },
        },
        { status: 400 }
      )
    }

    // ─── Build line items for Hosted Checkout ─────────────────────────
    // IMPORTANT: We use the SERVER-VALIDATED order items and totals, not the
    // client-submitted values. The /api/orders route already overrode client
    // prices with DB prices. Sending stale client prices to Clover would
    // cause the charge amount to differ from the stored order total.
    const nameParts = body.customerName.trim().split(/\s+/)
    const firstName = nameParts[0] || 'Customer'
    const lastName = nameParts.slice(1).join(' ') || ''

    const parsedOrderItems = (() => {
      try { return JSON.parse(order.items) }
      catch { return body.items } // fallback to client items if parse fails
    })()

    // Use server-validated prices from the stored order items.
    // When a variant was selected, append the variant name so the merchant
    // can see exactly which size the customer purchased (e.g. "Serum (Big)").
    const lineItems: HostedCheckoutLineItem[] = parsedOrderItems.map((item: { name?: string; productName?: string; price: number; quantity?: number; qty?: number; variantName?: string | null }) => {
      const baseName = (item.name || item.productName || 'Product')
      const fullName = item.variantName
        ? `${baseName} (${item.variantName})`
        : baseName
      return {
        name: fullName.substring(0, 100),
        price: Math.round(item.price * 100), // Convert to cents
        unitQty: item.quantity || item.qty || 1,
      }
    })

    // ─── Log each line item for quantity/price diagnostics ───────────────
    debug('[Clover Checkout] ──── LINE ITEMS BUILT FOR SHOPPING CART ────')
    lineItems.forEach((li, i) => {
      debug(`[Clover Checkout]   Line ${i + 1}: name="${li.name}", price=${li.price} cents ($${(li.price / 100).toFixed(2)}), unitQty=${li.unitQty}, lineTotal=$${((li.price * li.unitQty) / 100).toFixed(2)}`)
    })
    const cartTotalCents = lineItems.reduce((sum, li) => sum + li.price * li.unitQty, 0)
    debug(`[Clover Checkout]   Cart total: ${cartTotalCents} cents = $${(cartTotalCents / 100).toFixed(2)}`)
    debug(`[Clover Checkout]   Expected order total: $${serverTotal} = ${Math.round(serverTotal * 100)} cents`)
    if (cartTotalCents !== Math.round(serverTotal * 100)) {
      console.error(`[Clover Checkout] ⚠️ CART TOTAL MISMATCH: cart=${cartTotalCents} cents vs order=${Math.round(serverTotal * 100)} cents — this will cause a discrepancy!`)
    }
    debug('[Clover Checkout] ──── END LINE ITEMS ────')

    // Add shipping as a separate line item if the order total includes shipping
    const orderShipping = serverTotal - serverSubtotal
    debug(`[Clover Checkout] Clover checkout amount: $${serverTotal} (${serverSubtotal} items + ${orderShipping} shipping)`)
    if (orderShipping > 0) {
      lineItems.push({
        name: 'Shipping',
        price: Math.round(orderShipping * 100),
        unitQty: 1,
      })
    }

    // ─── Determine return URLs ─────────────────────────────────────────
    const siteUrl = getSiteUrl()
    const successUrl = `${siteUrl}/api/clover/return?orderId=${order.id}&status=success`
    const cancelUrl = `${siteUrl}/api/clover/return?orderId=${order.id}&status=cancel`

    // ─── Build Hosted Checkout Request ─────────────────────────────────
    const checkoutRequest = {
      customer: {
        email: body.customerEmail,
        firstName,
        lastName,
        phoneNumber: body.customerPhone || undefined,
      },
      shoppingCart: {
        lineItems,
      },
      redirectUrls: {
        successUrl,
        cancelUrl,
      },
      tips: {
        enabled: false,
      },
    }

    // ─── Log the exact payload ────────────────────────────────────────
    debug('[Clover Checkout] ──── EXACT PAYLOAD TO CLOVER ────')
    debug(JSON.stringify(checkoutRequest, null, 2))
    debug('[Clover Checkout] ──── END PAYLOAD ────')

    // ─── Create the Hosted Checkout session ───────────────────────────
    debug(`[Clover Checkout] Creating Hosted Checkout session for order: ${order.id}`)
    debug(`[Clover Checkout] Merchant ID: ${CLOVER_CONFIG.checkoutMerchantId}`)
    debug(`[Clover Checkout] Auth: ${CLOVER_CONFIG.isUsingEcomApi ? 'Ecommerce API Private Token' : 'OAuth Access Token'}`)

    const checkoutData = await createHostedCheckout(checkoutRequest)

    // ─── Update order with Clover checkout session ID ──────────────────
    await db.order.update({
      where: { id: order.id },
      data: {
        cloverCheckoutId: checkoutData.checkoutSessionId,
        paymentStatus: 'processing',
      },
    })

    // The redirect URL is the checkout session href
    const redirectUrl = checkoutData.href

    debug(`[Clover Checkout] ✅ Checkout session created: ${checkoutData.checkoutSessionId}`)
    debug(`[Clover Checkout] Checkout URL: ${redirectUrl}`)

    return NextResponse.json({
      success: true,
      checkoutId: checkoutData.checkoutSessionId,
      redirectUrl,
      status: 'created',
    })

  } catch (error) {
    console.error('[Clover Checkout] ══════════════════════════════════════════════════════')
    console.error('[Clover Checkout] ❌ CHECKOUT ERROR — FULL DETAILS')
    console.error('[Clover Checkout] Error type:', error?.constructor?.name || typeof error)
    console.error('[Clover Checkout] Message:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('[Clover Checkout] Stack:', error.stack)
    }
    console.error('[Clover Checkout] ══════════════════════════════════════════════════════')

    const message = error instanceof Error ? error.message : 'Payment session creation failed. Please try again.'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
