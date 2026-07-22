// ─── Clover Integration — Configuration & Types ─────────────────────────────
//
// Supports TWO integration paths:
//
// PATH A — Ecommerce API Hosted Checkout (RECOMMENDED for single merchants):
//   - Uses Ecommerce API Private Token as Bearer (NO OAuth required!)
//   - POST /invoicingcheckoutservice/v1/checkouts
//   - Header: X-Clover-Merchant-Id + Authorization: Bearer {private_token}
//   - Merchant ID = Ecommerce merchant ID (shown in Ecommerce API Tokens section)
//
// PATH B — Merchant API Payment Links (for OAuth-based multi-merchant apps):
//   - Uses OAuth access token obtained via /oauth/callback
//   - POST /v3/merchants/{mId}/pay_links
//   - Authorization: Bearer {oauth_access_token}
//   - Merchant ID = POS merchant ID (shown in app launch / Clover Dashboard)
//
// Environment variables:
//   CLOVER_ECOM_TOKEN      — Ecommerce API Private Token (Hosted Checkout Bearer)
//   CLOVER_ECOM_MERCHANT_ID— Ecommerce merchant ID (from Ecommerce API Tokens page)
//   CLOVER_ACCESS_TOKEN    — OAuth access token (alternative auth method)
//   CLOVER_MERCHANT_ID     — POS/Dashboard merchant ID (for Merchant API / OAuth)
//   CLOVER_CLIENT_ID       — App Client ID (from Clover Developer Dashboard)
//   CLOVER_CLIENT_SECRET   — App Client Secret (for OAuth token exchange)
//   CLOVER_ENVIRONMENT     — "sandbox" | "production" (defaults to "sandbox")
// ─────────────────────────────────────────────────────────────────────────────

// ─── API Base URLs ────────────────────────────────────────────────────────────

const merchantSandboxUrl = 'https://apisandbox.dev.clover.com'
const merchantProductionUrl = 'https://api.clover.com'

// ─── Debug Logging ────────────────────────────────────────────────────────────
// Verbose diagnostic logs (request/response bodies, token prefixes, etc.) are
// gated behind the CLOVER_DEBUG env flag so they never run in production.
// `console.error` and `console.warn` are NOT gated — they are legitimate error
// logging and must always fire.
// ─────────────────────────────────────────────────────────────────────────────

const CLOVER_DEBUG = process.env.CLOVER_DEBUG === 'true'

/** Debug-only logger — only fires when CLOVER_DEBUG=true. */
function debug(...args: unknown[]): void {
  if (CLOVER_DEBUG) console.log(...args)
}

// ─── Configuration Object ────────────────────────────────────────────────────
// All secrets come from environment variables (.env.local) FIRST, then fall
// back to the DB-backed Setting table (which persists across sandbox resets).
// This dual-source approach ensures payments keep working even when the
// sandbox wipes .env.local — the DB credentials survive.
// ─────────────────────────────────────────────────────────────────────────────

import { getCachedSetting } from '@/lib/settings-db'

/**
 * Get an env var, falling back to the DB-backed settings cache if the env var
 * is not set. This is the core of the "payment config never disappears" fix.
 *
 * The DB cache is primed by `primeSettingsCache()` which is called at the
 * start of every critical request handler (checkout, setup, checkout-status).
 */
function envWithDbFallback(key: string): string {
  // 1. Try environment variable first (fastest, set by .env.local)
  const envVal = process.env[key]
  if (envVal) return envVal

  // 2. Fall back to DB-backed cache (persists across sandbox resets)
  const dbVal = getCachedSetting(key)
  if (dbVal) return dbVal

  return ''
}

/** Get env var — returns empty string if not set. Logs a warning in production. */
function requireEnv(key: string): string {
  const val = envWithDbFallback(key)
  if (!val && process.env.NODE_ENV === 'production') {
    console.error(`[CLOVER] Missing required env var: ${key}`)
  }
  return val
}

export const CLOVER_CONFIG = {
  merchantSandboxUrl,
  merchantProductionUrl,

  /** Current environment — reads from env var or DB fallback, defaults to sandbox */
  get environment(): 'sandbox' | 'production' {
    return (envWithDbFallback('CLOVER_ENVIRONMENT') as 'sandbox' | 'production') || 'sandbox'
  },

  /** Merchant API base URL based on environment */
  get merchantBaseUrl(): string {
    return this.environment === 'production' ? merchantProductionUrl : merchantSandboxUrl
  },

  /** POS/Dashboard merchant ID (from app launch or Clover Dashboard) */
  get merchantId(): string {
    return envWithDbFallback('CLOVER_MERCHANT_ID')
  },

  /** Ecommerce merchant ID (from Ecommerce API Tokens section — different from POS merchant ID!) */
  get ecomMerchantId(): string {
    return requireEnv('CLOVER_ECOM_MERCHANT_ID')
  },

  /**
   * The merchant ID to use for Hosted Checkout requests.
   * Prefers the Ecommerce merchant ID; falls back to POS merchant ID.
   */
  get checkoutMerchantId(): string {
    return this.ecomMerchantId || this.merchantId
  },

  /** App Client ID (from Clover Developer Dashboard) */
  get clientId(): string {
    return envWithDbFallback('CLOVER_CLIENT_ID')
  },

  /** App Client Secret (for OAuth token exchange) */
  get clientSecret(): string {
    return envWithDbFallback('CLOVER_CLIENT_SECRET')
  },

  /**
   * Ecommerce API Private Token — used as Bearer for Hosted Checkout.
   * Found in: Clover Merchant Dashboard → Ecommerce API Tokens
   * This token works directly WITHOUT OAuth!
   */
  get ecomToken(): string {
    return requireEnv('CLOVER_ECOM_TOKEN')
  },

  /** OAuth access token for Merchant API calls (alternative auth method) */
  get accessToken(): string {
    return envWithDbFallback('CLOVER_ACCESS_TOKEN')
  },

  /**
   * The Bearer token to use for checkout requests.
   * Prefers the Ecommerce API Private Token; falls back to OAuth access token.
   */
  get bearerToken(): string {
    return this.ecomToken || this.accessToken
  },

  /** Whether Clover is configured and ready to create Hosted Checkout sessions */
  get isConfigured(): boolean {
    return !!(this.bearerToken && this.checkoutMerchantId)
  },

  /** Whether we're using the Ecommerce API path (vs OAuth) */
  get isUsingEcomApi(): boolean {
    return !!this.ecomToken
  },

  /** Whether we can verify payments (requires any bearer token) */
  get canVerifyPayments(): boolean {
    return !!this.bearerToken
  },

  /** OAuth base URL for authorize/token endpoints */
  get oauthBaseUrl(): string {
    return this.environment === 'production'
      ? 'https://www.clover.com'
      : 'https://sandbox.dev.clover.com'
  },
} as const

// ─── Payment Statuses ────────────────────────────────────────────────────────

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  CANCELLED: 'cancelled',
} as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES]

// ─── Hosted Checkout Types (Ecommerce API) ──────────────────────────────────

export interface HostedCheckoutLineItem {
  /** Item name */
  name: string
  /** Unit price in CENTS (integer). e.g. $45.00 → 4500 */
  price: number
  /** Item quantity — the Clover Ecommerce Hosted Checkout API requires this field as "unitQty".
   *  Setting this to null/missing causes HTTP 400: "Item quantity can not be null."
   *  If quantity appears doubled in Clover orders, the issue is in the data (order item
   *  quantity), NOT the field name. */
  unitQty: number
  /** Optional note/description */
  note?: string
}

export interface HostedCheckoutRequest {
  /** Customer information */
  customer: {
    email?: string
    firstName?: string
    lastName?: string
    phoneNumber?: string
  }
  /** Shopping cart with line items */
  shoppingCart: {
    lineItems: HostedCheckoutLineItem[]
  }
  /**
   * Optional: redirect URLs after payment (preferred over redirectUrl)
   *
   * NOTE on merchant branding: Clover's Hosted Checkout API does NOT support
   * custom logo or business name properties in the request body. Merchant
   * branding (logo, business name, colors) on the Clover-hosted payment page
   * is configured in the Clover Merchant Dashboard under:
   *   Settings → Branding → Hosted Checkout
   * Upload the Angel Beauty Supply logo there (recommended: 300×300px PNG
   * with transparent background) and set the business name. The branded
   * Hosted Checkout page will then display consistently for all sessions
   * created via this API.
   */
  redirectUrls?: {
    successUrl?: string
    cancelUrl?: string
  }
  /** Optional: legacy redirect URL after payment (redirectUrls is preferred) */
  redirectUrl?: string
  /** Optional: enable tips on checkout page */
  tips?: {
    enabled: boolean
  }
}

export interface HostedCheckoutResponse {
  /** URL for the hosted checkout session — redirect customer here */
  href: string
  /** Unique session identifier */
  checkoutSessionId: string
  /** Time the session was created (ISO 8601 string) */
  createdTime: string
  /** Time when the session expires (ISO 8601 string) */
  expirationTime: string
}

// ─── Legacy Types (kept for backward compat) ────────────────────────────────

export interface CloverPayLinkItem {
  name: string
  amount: number
  quantity?: number
}

export interface CloverPayLinkCreateRequest {
  name: string
  amount: number
  currency: string
  items?: CloverPayLinkItem[]
  reusable?: boolean
  return_url?: string
  expires_in?: number
}

export interface CloverPayLinkCreateResponse {
  id: string
  url: string
  name: string
  amount: number
  currency: string
  reusable: boolean
  active: boolean
  createdTime?: string
  expiresAt?: string
}

export interface CloverCheckoutGetResponse {
  id: string
  href: string
  status: 'created' | 'active' | 'completed' | 'expired'
  amount: number
  currency: string
  createdTime: string
  paymentId?: string
  orderId?: string
  error?: {
    message: string
    code?: string
  }
}

// ─── Detailed Checkout Status (for diagnostics) ──────────────────────────────

export interface CloverPaymentDetail {
  /** Payment ID from Clover */
  paymentId?: string
  /** Payment result: SUCCESS, FAIL, CANCELLED, etc. */
  result?: string
  /** Human-readable decline/failure reason */
  resultInfo?: string
  /** Authorization code from the card issuer */
  authCode?: string
  /** Authorization status: AUTHORIZED, CAPTURED, VOIDED, PENDING */
  authStatus?: string
  /** Gateway response code */
  gatewayResponseCode?: string
  /** Gateway response message */
  gatewayResponseMessage?: string
  /** Processor response code (from cardTransaction) */
  processorResponseCode?: string
  /** Processor response message (from cardTransaction) */
  processorResponseMessage?: string
  /** Card type (VISA, MASTERCARD, etc.) */
  cardType?: string
  /** Last 4 digits of the card */
  last4?: string
  /** Payment amount in cents */
  amount?: number
  /** Currency code */
  currency?: string
  /** Whether the payment was captured */
  captured?: boolean
  /** Whether the payment was voided */
  voided?: boolean
  /** Refund reason if refunded */
  refundReason?: string
  /** Created time */
  createdTime?: string
  /** Trace ID from Clover for debugging */
  traceId?: string
}

export interface CheckoutStatusResult {
  /** Checkout session ID */
  checkoutId: string
  /** Checkout status from Clover */
  checkoutStatus: string
  /** Whether the payment was successful */
  paid: boolean
  /** Payment details (if a payment was attempted) */
  payment?: CloverPaymentDetail
  /** Reason code for failure (if applicable) */
  declineReason?: string
  /** Human-readable message for the customer */
  customerMessage: string
  /** Clover order ID associated with this checkout */
  cloverOrderId?: string
  /** Error code returned by Clover (if any) */
  errorCode?: string
  /** Error message returned by Clover (if any) */
  errorMessage?: string
  /** Reason why no payment was created (if applicable) */
  noPaymentReason?: string
  /** Raw Clover checkout response for debugging */
  rawCheckout?: any
  /** Raw Clover payment response for debugging */
  rawPayment?: any
  /** Raw Clover order response for debugging */
  rawOrder?: any
  /** Verification error (if API calls failed) */
  error?: string
}

/**
 * Map Clover decline/gateway reason codes to human-readable customer messages.
 *
 * Clover returns decline reasons in several places:
 *   - payment.resultInfo           — e.g. "INSUFFICIENT FUNDS", "DECLINED", "EXPIRED CARD"
 *   - payment.cardTransaction.resultInfo — same values, sometimes populated here instead
 *   - payment.cardTransaction.extra.responseCode — ISO 8583 response codes like "51"
 *   - payment.gatewayResponse.responseCode — gateway-specific codes
 *
 * ISO 8583 Response Code Reference (common card decline codes):
 *   05 — Do Not Honor (generic decline)
 *   51 — Insufficient Funds
 *   54 — Expired Card
 *   61 — Exceeds Withdrawal Limit
 *   62 — Restricted Card
 *   65 — Activity Count Limit Exceeded
 *   75 — Allowable PIN Tries Exceeded
 *   82 — CVV/CVC Verification Failed
 *   91 — Issuer Unavailable
 *   96 — System Malfunction
 *   N7 — CVV2 Mismatch
 *   R1 — Revocation of Authorisation
 */
function mapDeclineToCustomerMessage(
  result?: string,
  resultInfo?: string,
  gatewayCode?: string,
  processorCode?: string
): { message: string; reason: string } {
  const info = (resultInfo || '').toLowerCase()
  const code = (gatewayCode || '').toLowerCase()
  const pcode = (processorCode || '').toLowerCase()
  const resultLower = (result || '').toLowerCase()

  // ─── Map ISO 8583 numeric response codes ─────────────────────────────────
  // These come from cardTransaction.extra.responseCode or gatewayResponse.responseCode
  const numericCode = pcode || code
  if (numericCode === '51') {
    return { message: 'Insufficient funds — your card does not have enough balance for this transaction. Please try a different card or add funds.', reason: 'INSUFFICIENT_FUNDS' }
  }
  if (numericCode === '05') {
    return { message: 'Card declined — your bank did not approve this transaction (Do Not Honor). Please try a different card or contact your bank.', reason: 'DO_NOT_HONOR' }
  }
  if (numericCode === '54') {
    return { message: 'Card expired — the card you used has expired. Please try a different card with a valid expiration date.', reason: 'CARD_EXPIRED' }
  }
  if (numericCode === '61' || numericCode === '65') {
    return { message: 'Transaction limit exceeded — this transaction exceeds your card limit. Please try a smaller amount or a different card.', reason: 'LIMIT_EXCEEDED' }
  }
  if (numericCode === '62') {
    return { message: 'Card restricted — this card has been restricted by the issuer. Please try a different card or contact your bank.', reason: 'CARD_DECLINED' }
  }
  if (numericCode === '75') {
    return { message: 'PIN tries exceeded — the allowable number of PIN entry attempts has been exceeded. Please try again later or use a different card.', reason: 'AUTH_FAILED' }
  }
  if (numericCode === '82' || numericCode === 'n7') {
    return { message: 'CVV verification failed — the security code you entered does not match. Please check your card details and try again.', reason: 'INVALID_CVV' }
  }
  if (numericCode === '91') {
    return { message: 'Issuer unavailable — your bank could not be reached to authorize the transaction. Please try again in a few moments.', reason: 'PAYMENT_FAILED' }
  }
  if (numericCode === '96') {
    return { message: 'System error — a technical issue prevented the transaction from being processed. Please try again.', reason: 'PAYMENT_FAILED' }
  }
  if (numericCode === 'r1') {
    return { message: 'Authorization revoked — the card issuer has revoked authorization for this card. Please contact your bank.', reason: 'CARD_DECLINED' }
  }

  // ─── Map text-based decline reasons (resultInfo / gateway codes) ────────
  // Specific decline reasons
  if (info.includes('insufficient') || code.includes('insufficient')) {
    return { message: 'Insufficient funds — your card does not have enough balance for this transaction. Please try a different card or add funds.', reason: 'INSUFFICIENT_FUNDS' }
  }
  if (info.includes('do not honor') || code.includes('do_not_honor')) {
    return { message: 'Card declined — your bank did not approve this transaction (Do Not Honor). Please try a different card or contact your bank.', reason: 'DO_NOT_HONOR' }
  }
  if (info.includes('declined') || code === 'declined') {
    return { message: 'Card declined — your bank declined this transaction. Please try a different card or contact your bank for more information.', reason: 'CARD_DECLINED' }
  }
  if (info.includes('expired') || info.includes('expiration')) {
    return { message: 'Card expired — the card you used has expired. Please try a different card with a valid expiration date.', reason: 'CARD_EXPIRED' }
  }
  if (info.includes('invalid card') || info.includes('invalid_card') || info.includes('invalid number')) {
    return { message: 'Invalid card number — please check your card details and try again.', reason: 'INVALID_CARD' }
  }
  if (info.includes('cvv') || info.includes('cvc') || info.includes('security code') || info.includes('cvv2')) {
    return { message: 'Invalid security code — the CVV/CVC you entered is incorrect. Please try again.', reason: 'INVALID_CVV' }
  }
  if (info.includes('limit') || info.includes('exceed') || info.includes('amount')) {
    return { message: 'Transaction limit exceeded — this transaction exceeds your card limit. Please try a smaller amount or a different card.', reason: 'LIMIT_EXCEEDED' }
  }
  if (info.includes('fraud') || info.includes('suspected') || code.includes('fraud')) {
    return { message: 'Transaction flagged — this transaction was flagged as potentially fraudulent by your bank. Please contact your bank or try a different payment method.', reason: 'FRAUD_SUSPECTED' }
  }
  if (info.includes('restricted') || info.includes('revoked')) {
    return { message: 'Card restricted — this card has been restricted by the issuer. Please try a different card or contact your bank.', reason: 'CARD_DECLINED' }
  }
  if (info.includes('authentication') || code.includes('3ds') || code.includes('authentication')) {
    return { message: 'Authentication failed — the card authentication could not be verified. This may be due to 3D Secure verification failure. Please try again.', reason: 'AUTH_FAILED' }
  }
  if (info.includes('not permitted') || info.includes('not allowed')) {
    return { message: 'Transaction not permitted — this type of transaction is not allowed on your card. Please contact your bank or try a different card.', reason: 'CARD_DECLINED' }
  }
  if (info.includes('lost') || info.includes('stolen')) {
    return { message: 'Card reported lost or stolen — this card has been flagged. Please contact your bank immediately.', reason: 'CARD_DECLINED' }
  }
  if (info.includes('pickup')) {
    return { message: 'Card flagged — the issuer has requested that the card be retained. Please contact your bank immediately.', reason: 'CARD_DECLINED' }
  }
  if (info.includes('cancelled') || resultLower === 'cancelled') {
    return { message: 'Payment cancelled — you cancelled the payment before it was completed.', reason: 'CANCELLED' }
  }
  if (info.includes('timeout') || info.includes('timed out')) {
    return { message: 'Payment timed out — the payment session expired before completion. Please try again.', reason: 'TIMEOUT' }
  }
  if (info.includes('refer to issuer') || info.includes('refer issuer')) {
    return { message: 'Card declined — your bank requires you to contact them regarding this transaction. Please call the number on the back of your card.', reason: 'CARD_DECLINED' }
  }
  if (info.includes('no account') || info.includes('invalid account')) {
    return { message: 'Invalid account — the card account could not be found. Please check your card details or try a different card.', reason: 'INVALID_CARD' }
  }
  if (info.includes('unsupported') || info.includes('not supported')) {
    return { message: 'Unsupported card — this card type is not supported. Please try a different payment method.', reason: 'INVALID_CARD' }
  }

  // ─── Generic result-based mapping ──────────────────────────────────────
  if (resultLower === 'fail' || resultLower === 'failed') {
    return { message: 'Payment declined — the transaction was not approved. Please try a different payment method or contact your bank.', reason: 'PAYMENT_FAILED' }
  }
  if (resultLower === 'cancelled') {
    return { message: 'Payment cancelled — the transaction was cancelled before completion.', reason: 'CANCELLED' }
  }
  if (resultLower === 'success' || resultLower === 'authorized' || resultLower === 'captured') {
    return { message: 'Payment approved — your payment was processed successfully.', reason: 'APPROVED' }
  }

  // Default
  return { message: 'Payment not completed — the transaction could not be finalized. Please try again or use a different payment method.', reason: 'UNKNOWN' }
}

// ─── Webhook Event Types ─────────────────────────────────────────────────────

export interface CloverWebhookEvent {
  id: string
  type:
    | 'CHECKOUT_COMPLETED'
    | 'CHECKOUT_EXPIRED'
    | 'PAYMENT_REFUNDED'
    | 'PAYMENT_UPDATED'
    | 'PAYMENT_CREATED'
    | 'ORDER_UPDATED'
  data: {
    checkoutId?: string
    paymentId?: string
    orderId?: string
    amount?: number
    status?: string
  }
  timestamp: string
}

// ─── Reliable HTTPS Helper ─────────────────────────────────────────────────
//
// Node.js built-in fetch (undici) has intermittent TLS issues in some
// sandbox environments (ECONNRESET during TLS handshake). We use the native
// `https` module instead for reliable connections to the Clover API.
// ─────────────────────────────────────────────────────────────────────────────

import https from 'https'

interface CloverHttpsOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers: Record<string, string>
  body?: string
}

interface CloverHttpsResult {
  status: number
  ok: boolean
  body: string
}

/**
 * Make an HTTPS request using Node's native `https` module.
 * Includes retry logic for transient network/TLS errors.
 */
function cloverHttpsRequest(url: string, options: CloverHttpsOptions, retries = 2): Promise<CloverHttpsResult> {
  return new Promise((resolve, reject) => {
    const attempt = (retriesLeft: number) => {
      const parsedUrl = new URL(url)
      const req = https.request({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method,
        headers: options.headers,
        timeout: 15000, // 15s timeout
      }, (res) => {
        let body = ''
        res.on('data', (chunk: Buffer) => { body += chunk.toString() })
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            body,
          })
        })
      })

      req.on('error', (e: any) => {
        const isTransient = e.code === 'ECONNRESET' || e.code === 'ETIMEDOUT' || e.code === 'ECONNREFUSED' || e.message?.includes('TLS')
        if (isTransient && retriesLeft > 0) {
          console.warn(`[Clover HTTPS] Transient error (${e.code || e.message}), retrying... (${retriesLeft} left)`)
          setTimeout(() => attempt(retriesLeft - 1), 1000)
        } else {
          reject(e)
        }
      })

      req.on('timeout', () => {
        req.destroy()
        if (retriesLeft > 0) {
          console.warn(`[Clover HTTPS] Request timeout, retrying... (${retriesLeft} left)`)
          setTimeout(() => attempt(retriesLeft - 1), 1000)
        } else {
          reject(new Error(`Request to ${url} timed out`))
        }
      })

      if (options.body) {
        req.write(options.body)
      }
      req.end()
    }

    attempt(retries)
  })
}

// ─── Create Hosted Checkout Session ─────────────────────────────────────────

/**
 * Create a Clover Hosted Checkout session.
 *
 * Uses the Ecommerce API /invoicingcheckoutservice/v1/checkouts endpoint
 * with the Ecommerce API Private Token as Bearer and X-Clover-Merchant-Id header.
 *
 * Returns a checkout URL that the customer should be redirected to.
 */
export async function createHostedCheckout(
  request: HostedCheckoutRequest
): Promise<HostedCheckoutResponse> {
  const baseUrl = CLOVER_CONFIG.merchantBaseUrl
  const url = `${baseUrl}/invoicingcheckoutservice/v1/checkouts`

  // ─── Log full config diagnostics ────────────────────────────────
  debug(`[Clover] ══════════════════════════════════════════════════════`)
  debug(`[Clover] CREATE HOSTED CHECKOUT — FULL DIAGNOSTICS`)
  debug(`[Clover] Endpoint:   POST ${url}`)
  debug(`[Clover] Environment:  ${CLOVER_CONFIG.environment}`)
  debug(`[Clover] Merchant ID:  ${CLOVER_CONFIG.checkoutMerchantId}`)
  debug(`[Clover] Auth method:  ${CLOVER_CONFIG.isUsingEcomApi ? 'Ecommerce API Private Token' : 'OAuth Access Token'}`)
  debug(`[Clover] Bearer token: ${CLOVER_CONFIG.bearerToken ? `SET (${CLOVER_CONFIG.bearerToken.substring(0, 8)}...${CLOVER_CONFIG.bearerToken.slice(-4)})` : 'NOT SET'}`)
  debug(`[Clover] Ecom token:   ${CLOVER_CONFIG.ecomToken ? `SET (${CLOVER_CONFIG.ecomToken.substring(0, 8)}...${CLOVER_CONFIG.ecomToken.slice(-4)})` : 'NOT SET'}`)
  debug(`[Clover] Ecom Merc ID: ${CLOVER_CONFIG.ecomMerchantId || 'NOT SET'}`)
  debug(`[Clover] isConfigured: ${CLOVER_CONFIG.isConfigured}`)
  debug(`[Clover] ══════════════════════════════════════════════════════`)

  // ─── Log the request payload (excluding secrets) ────────────────
  debug(`[Clover] ──── REQUEST PAYLOAD TO CLOVER ────`)
  debug(JSON.stringify(request, null, 2))
  debug(`[Clover] ──── END PAYLOAD ────`)

  const response = await cloverHttpsRequest(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOVER_CONFIG.bearerToken}`,
      'X-Clover-Merchant-Id': CLOVER_CONFIG.checkoutMerchantId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  // ─── Log the full raw response from Clover ──────────────────────
  debug(`[Clover] ──── CLOVER RESPONSE ────`)
  debug(`[Clover] HTTP Status: ${response.status}`)
  debug(`[Clover] OK: ${response.ok}`)
  debug(`[Clover] Body: ${response.body}`)
  debug(`[Clover] ──── END RESPONSE ────`)

  if (!response.ok) {
    console.error(`[Clover] ❌ Hosted Checkout FAILED — HTTP ${response.status}`)
    console.error(`[Clover] Full error body: ${response.body}`)

    // Provide helpful error messages for common issues
    if (response.status === 401) {
      throw new Error(
        `Clover authentication failed (401). ${
          CLOVER_CONFIG.isUsingEcomApi
            ? 'The Ecommerce API Private Token is invalid or expired. Get a fresh one from your Clover Merchant Dashboard → Ecommerce API Tokens.'
            : 'The OAuth access token is invalid or expired. Re-authorize via the OAuth flow.'
        } Raw response: ${response.body}`
      )
    }

    if (response.status === 403) {
      throw new Error(
        `Clover access denied (403). Ensure the ${
          CLOVER_CONFIG.isUsingEcomApi
            ? 'Ecommerce API Private Token has HOSTED_CHECKOUT permissions enabled'
            : 'OAuth token has the required permissions for Hosted Checkout'
        }. Raw response: ${response.body}`
      )
    }

    throw new Error(`Clover Hosted Checkout failed: HTTP ${response.status} — ${response.body}`)
  }

  const data = JSON.parse(response.body) as HostedCheckoutResponse
  debug(`[Clover] ✅ Hosted Checkout session created!`)
  debug(`[Clover] checkoutSessionId: ${data.checkoutSessionId}`)
  debug(`[Clover] href (redirect):   ${data.href}`)
  debug(`[Clover] createdTime:       ${data.createdTime}`)
  debug(`[Clover] expirationTime:    ${data.expirationTime}`)

  return data
}

// ─── Comprehensive Checkout Status Retrieval ────────────────────────────────

/**
 * Retrieve comprehensive checkout status with detailed payment diagnostics.
 *
 * This function:
 *   1. Fetches the checkout status from the Ecommerce API
 *   2. If a paymentId exists, fetches full payment details from the Merchant API
 *   3. Extracts decline reasons, auth codes, gateway responses
 *   4. Maps everything to a human-readable customer message
 *
 * Returns a CheckoutStatusResult with all diagnostic info.
 */
export async function getCheckoutStatus(
  checkoutId: string
): Promise<CheckoutStatusResult> {
  debug(`[Clover Diagnostics] ══════════════════════════════════════════════════════`)
  debug(`[Clover Diagnostics] RETRIEVING CHECKOUT STATUS: ${checkoutId}`)

  // Base result
  const baseResult: CheckoutStatusResult = {
    checkoutId,
    checkoutStatus: 'unknown',
    paid: false,
    customerMessage: 'Unable to verify payment status. Please contact support.',
  }

  if (!CLOVER_CONFIG.canVerifyPayments) {
    console.warn('[Clover Diagnostics] No bearer token — cannot retrieve checkout status')
    return { ...baseResult, error: 'Clover bearer token not configured' }
  }

  try {
    // ─── Step 1: Get checkout details from Ecommerce API ──────────────────
    let checkoutData: any = null
    let checkoutStatus = 'unknown'
    let cloverOrderId: string | undefined

    if (CLOVER_CONFIG.isUsingEcomApi) {
      const ecomUrl = `${CLOVER_CONFIG.merchantBaseUrl}/invoicingcheckoutservice/v1/checkouts/${checkoutId}`

      debug(`[Clover Diagnostics] Step 1: Fetching checkout from Ecommerce API`)
      debug(`[Clover Diagnostics]   GET ${ecomUrl}`)

      const ecomResponse = await cloverHttpsRequest(ecomUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CLOVER_CONFIG.bearerToken}`,
          'X-Clover-Merchant-Id': CLOVER_CONFIG.checkoutMerchantId,
          'Content-Type': 'application/json',
        },
      })

      debug(`[Clover Diagnostics]   Ecommerce API response: HTTP ${ecomResponse.status}`)

      if (ecomResponse.ok) {
        checkoutData = JSON.parse(ecomResponse.body)
        checkoutStatus = checkoutData.status || 'unknown'
        cloverOrderId = checkoutData.orderId

        // Log the COMPLETE raw checkout response
        debug(`[Clover Diagnostics]   ── Complete Checkout Response ──`)
        debug(`[Clover Diagnostics]   ${JSON.stringify(checkoutData, null, 2)}`)

        debug(`[Clover Diagnostics]   ── Parsed Fields ──`)
        debug(`[Clover Diagnostics]   checkoutId:     ${checkoutData.id || checkoutId}`)
        debug(`[Clover Diagnostics]   checkoutStatus: ${checkoutStatus}`)
        debug(`[Clover Diagnostics]   paymentId:      ${checkoutData.paymentId || 'NONE'}`)
        debug(`[Clover Diagnostics]   cloverOrderId:  ${checkoutData.orderId || 'NONE'}`)
        debug(`[Clover Diagnostics]   amount:         ${checkoutData.amount || 0}`)
        debug(`[Clover Diagnostics]   currency:       ${checkoutData.currency || 'N/A'}`)
        debug(`[Clover Diagnostics]   customer.email: ${checkoutData.customer?.email || 'N/A'}`)
        debug(`[Clover Diagnostics]   selfLink:       ${checkoutData.self?.href || 'N/A'}`)
      } else {
        console.warn(`[Clover Diagnostics]   Ecommerce API returned HTTP ${ecomResponse.status}`)
        console.warn(`[Clover Diagnostics]   Response body: ${ecomResponse.body}`)
        baseResult.errorCode = String(ecomResponse.status)
        baseResult.errorMessage = ecomResponse.body
      }
    }

    // ─── Step 2: Get payment details from Merchant API ───────────────────
    let paymentDetail: CloverPaymentDetail | undefined
    let rawPayment: any = null

    // If we have a paymentId from the checkout, fetch payment directly
    const paymentId = checkoutData?.paymentId

    if (paymentId) {
      // Direct payment lookup
      const paymentUrl = `${CLOVER_CONFIG.merchantBaseUrl}/v3/merchants/${CLOVER_CONFIG.checkoutMerchantId}/payments/${paymentId}?expand=cardTransaction,gatewayResponse`

      debug(`[Clover Diagnostics] Step 2: Fetching payment details from Merchant API`)
      debug(`[Clover Diagnostics]   GET ${paymentUrl}`)

      const paymentResponse = await cloverHttpsRequest(paymentUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CLOVER_CONFIG.bearerToken}`,
          'Content-Type': 'application/json',
        },
      })

      debug(`[Clover Diagnostics]   Merchant API response: HTTP ${paymentResponse.status}`)

      if (paymentResponse.ok) {
        rawPayment = JSON.parse(paymentResponse.body)
        paymentDetail = extractPaymentDetails(rawPayment)

        // Log the COMPLETE raw payment response
        debug(`[Clover Diagnostics]   ── Complete Payment Response ──`)
        debug(`[Clover Diagnostics]   ${JSON.stringify(rawPayment, null, 2)}`)
      } else {
        console.warn(`[Clover Diagnostics]   Merchant API returned HTTP ${paymentResponse.status}`)
        console.warn(`[Clover Diagnostics]   Response body: ${paymentResponse.body}`)
      }
    } else {
      // No paymentId — search recent payments for checkoutId match
      debug(`[Clover Diagnostics] Step 2: No paymentId in checkout — searching recent payments for checkoutId match`)

      const paymentsUrl = `${CLOVER_CONFIG.merchantBaseUrl}/v3/merchants/${CLOVER_CONFIG.checkoutMerchantId}/payments?limit=10&orderBy=createdTime&orderByDesc=true&expand=cardTransaction,gatewayResponse`

      const paymentsResponse = await cloverHttpsRequest(paymentsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CLOVER_CONFIG.bearerToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (paymentsResponse.ok) {
        const paymentsData = JSON.parse(paymentsResponse.body)
        const payments = paymentsData.elements || []

        debug(`[Clover Diagnostics]   Found ${payments.length} recent payments, searching for checkoutId match`)

        const matchingPayment = payments.find((p: any) =>
          p.externalReferenceId === checkoutId
          || p.order?.externalReferenceId === checkoutId
          || p.note?.includes(checkoutId)
        )

        if (matchingPayment) {
          rawPayment = matchingPayment
          paymentDetail = extractPaymentDetails(matchingPayment)
          debug(`[Clover Diagnostics]   Matched payment: ${matchingPayment.id}, result: ${matchingPayment.result}`)
          debug(`[Clover Diagnostics]   ── Matched Payment Response ──`)
          debug(`[Clover Diagnostics]   ${JSON.stringify(matchingPayment, null, 2)}`)
        } else {
          console.warn(`[Clover Diagnostics]   No payment found matching checkoutId out of ${payments.length} recent payments`)
        }
      }
    }

    // ─── Step 3: If no payment exists, query the Clover order ─────────────
    // When there's no paymentId and no matching payment, the checkout may
    // have expired or the customer abandoned before entering card details.
    // Query the Clover order to understand why no payment was created.
    let rawOrder: any = null
    let noPaymentReason: string | undefined

    if (!paymentDetail && !rawPayment && cloverOrderId) {
      debug(`[Clover Diagnostics] Step 3: No payment found — querying Clover order ${cloverOrderId} for failure reason`)

      const orderUrl = `${CLOVER_CONFIG.merchantBaseUrl}/v3/merchants/${CLOVER_CONFIG.checkoutMerchantId}/orders/${cloverOrderId}?expand=lineItems,payments,discounts`

      try {
        const orderResponse = await cloverHttpsRequest(orderUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${CLOVER_CONFIG.bearerToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (orderResponse.ok) {
          rawOrder = JSON.parse(orderResponse.body)

          // Log the COMPLETE raw order response
          debug(`[Clover Diagnostics]   ── Complete Clover Order Response ──`)
          debug(`[Clover Diagnostics]   ${JSON.stringify(rawOrder, null, 2)}`)

          const orderPayments = rawOrder.payments?.elements || rawOrder.payments || []

          if (orderPayments.length > 0) {
            // There IS a payment on the order we didn't find earlier
            const orderPayment = orderPayments[0]
            debug(`[Clover Diagnostics]   Found payment on Clover order: ${orderPayment.id}, result: ${orderPayment.result}`)
            rawPayment = orderPayment
            paymentDetail = extractPaymentDetails(orderPayment)
          } else {
            // No payments at all on the order — determine why
            const orderState = rawOrder.state || rawOrder.status || 'unknown'
            const orderTotal = rawOrder.total || 0

            if (checkoutStatus === 'expired') {
              noPaymentReason = 'CHECKOUT_EXPIRED'
              console.warn(`[Clover Diagnostics]   Checkout session expired — customer did not complete payment within the time limit`)
            } else if (checkoutStatus === 'cancelled' || orderState === 'cancelled' || orderState === 'canceled') {
              noPaymentReason = 'CANCELLED'
              console.warn(`[Clover Diagnostics]   Checkout was cancelled — customer cancelled the payment flow`)
            } else if (checkoutStatus === 'created' || checkoutStatus === 'pending') {
              noPaymentReason = 'ABANDONED'
              console.warn(`[Clover Diagnostics]   Checkout status is "${checkoutStatus}" — customer likely abandoned before entering payment details`)
            } else {
              noPaymentReason = 'NO_PAYMENT_CREATED'
              console.warn(`[Clover Diagnostics]   No payment on Clover order ${cloverOrderId}. Order state: ${orderState}, total: ${orderTotal}, checkout status: ${checkoutStatus}`)
              console.warn(`[Clover Diagnostics]   Possible reasons: checkout expired, customer abandoned, card entry was not attempted, or payment was rejected before creation`)
            }
          }
        } else {
          console.warn(`[Clover Diagnostics]   Clover order API returned HTTP ${orderResponse.status}`)
          console.warn(`[Clover Diagnostics]   Response: ${orderResponse.body}`)
          noPaymentReason = 'ORDER_LOOKUP_FAILED'
        }
      } catch (orderErr) {
        console.warn(`[Clover Diagnostics]   Error querying Clover order: ${orderErr instanceof Error ? orderErr.message : orderErr}`)
        noPaymentReason = 'ORDER_LOOKUP_ERROR'
      }
    } else if (!paymentDetail && !rawPayment && !cloverOrderId) {
      // No paymentId, no cloverOrderId — nothing to look up
      noPaymentReason = 'NO_CHECKOUT_DATA'
      console.warn(`[Clover Diagnostics]   No checkout data returned — cannot determine payment failure reason`)
      console.warn(`[Clover Diagnostics]   The checkout may have been rejected at creation, or the API token may be invalid`)
    }

    // ─── Step 4: Build result with diagnostics ──────────────────────────
    const isPaid = checkoutStatus === 'completed'
      || paymentDetail?.result === 'SUCCESS'
      || paymentDetail?.authStatus === 'CAPTURED'
      || paymentDetail?.authStatus === 'AUTHORIZED'

    const { message, reason } = mapDeclineToCustomerMessage(
      paymentDetail?.result || checkoutStatus,
      paymentDetail?.resultInfo,
      paymentDetail?.gatewayResponseCode,
      paymentDetail?.processorResponseCode
    )

    const result: CheckoutStatusResult = {
      checkoutId,
      checkoutStatus,
      paid: isPaid,
      payment: paymentDetail,
      declineReason: isPaid ? undefined : reason,
      customerMessage: isPaid ? 'Payment approved — your payment was processed successfully.' : message,
      cloverOrderId,
      errorCode: checkoutData?.errorCode || checkoutData?.error?.code,
      errorMessage: checkoutData?.errorMessage || checkoutData?.error?.message,
      noPaymentReason,
      rawCheckout: checkoutData,
      rawPayment,
      rawOrder,
    }

    // ─── Step 5: Log comprehensive diagnostics ──────────────────────────
    debug(`[Clover Diagnostics] ══════════════════════════════════════════════════════`)
    debug(`[Clover Diagnostics] COMPLETE CHECKOUT STATUS RESULT`)
    debug(`[Clover Diagnostics]   checkoutId:           ${checkoutId}`)
    debug(`[Clover Diagnostics]   checkoutStatus:       ${checkoutStatus}`)
    debug(`[Clover Diagnostics]   paid:                 ${isPaid}`)
    debug(`[Clover Diagnostics]   cloverOrderId:        ${cloverOrderId || 'NONE'}`)
    debug(`[Clover Diagnostics]   paymentId:            ${paymentDetail?.paymentId || 'NONE'}`)
    debug(`[Clover Diagnostics]   paymentResult:        ${paymentDetail?.result || 'N/A'}`)
    debug(`[Clover Diagnostics]   resultInfo:           ${paymentDetail?.resultInfo || 'N/A'}`)
    debug(`[Clover Diagnostics]   authCode:             ${paymentDetail?.authCode || 'N/A'}`)
    debug(`[Clover Diagnostics]   authStatus:           ${paymentDetail?.authStatus || 'N/A'}`)
    debug(`[Clover Diagnostics]   gatewayCode:          ${paymentDetail?.gatewayResponseCode || 'N/A'}`)
    debug(`[Clover Diagnostics]   gatewayMessage:       ${paymentDetail?.gatewayResponseMessage || 'N/A'}`)
    debug(`[Clover Diagnostics]   processorCode:        ${paymentDetail?.processorResponseCode || 'N/A'}`)
    debug(`[Clover Diagnostics]   processorMessage:     ${paymentDetail?.processorResponseMessage || 'N/A'}`)
    debug(`[Clover Diagnostics]   cardType:             ${paymentDetail?.cardType || 'N/A'}`)
    debug(`[Clover Diagnostics]   last4:                ${paymentDetail?.last4 || 'N/A'}`)
    debug(`[Clover Diagnostics]   amount:               ${paymentDetail?.amount || 'N/A'}`)
    debug(`[Clover Diagnostics]   declineReason:        ${result.declineReason || 'N/A'}`)
    debug(`[Clover Diagnostics]   noPaymentReason:      ${noPaymentReason || 'N/A'}`)
    debug(`[Clover Diagnostics]   errorCode:            ${result.errorCode || 'N/A'}`)
    debug(`[Clover Diagnostics]   errorMessage:         ${result.errorMessage || 'N/A'}`)
    debug(`[Clover Diagnostics]   customerMessage:      ${result.customerMessage}`)
    debug(`[Clover Diagnostics] ══════════════════════════════════════════════════════`)

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Clover Diagnostics] ❌ Error retrieving checkout status: ${message}`)
    return {
      ...baseResult,
      error: message,
      customerMessage: 'Unable to verify payment status due to a technical error. Please contact support if you were charged.',
    }
  }
}

/**
 * Extract structured payment details from a raw Clover payment object.
 */
function extractPaymentDetails(raw: any): CloverPaymentDetail {
  const cardTx = raw.cardTransaction || {}
  const gatewayResp = raw.gatewayResponse || raw.gateway || {}
  // cardTransaction.extra often contains the actual processor response code
  const cardExtra = cardTx.extra || {}

  // The processor response code can be in several places:
  // - cardTransaction.extra.responseCode — the actual ISO 8583 code (e.g., "51" = insufficient funds)
  // - gatewayResponse.responseCode — gateway-level code
  // - cardTransaction.entryType — sometimes holds a code
  // - raw.processorResponseCode — direct field
  const processorCode =
    cardExtra.responseCode
    || cardTx.entryType
    || cardTx.referenceId
    || raw.processorResponseCode

  // The processor response message:
  // - cardTransaction.extra.responseMessage — e.g., "NOT SUFFICIENT FUNDS"
  // - cardTransaction.resultInfo — e.g., "INSUFFICIENT FUNDS"
  // - raw.processorResponseMessage
  const processorMessage =
    cardExtra.responseMessage
    || cardTx.resultInfo
    || raw.processorResponseMessage

  return {
    paymentId: raw.id,
    result: raw.result,
    resultInfo: raw.resultInfo || cardTx.resultInfo || raw.declineReason,
    authCode: cardTx.authCode || raw.authCode,
    authStatus: cardTx.state || raw.authorization,
    gatewayResponseCode: gatewayResp.responseCode || gatewayResp.code || raw.gatewayResponseCode,
    gatewayResponseMessage: gatewayResp.responseText || gatewayResp.message || raw.gatewayResponseMessage,
    processorResponseCode: processorCode,
    processorResponseMessage: processorMessage,
    cardType: cardTx.cardType || raw.cardType,
    last4: cardTx.last4 || raw.last4,
    amount: raw.amount || cardTx.amount,
    currency: raw.order?.currency || raw.currency || 'usd',
    captured: cardTx.state === 'CAPTURED' || raw.captured === true,
    voided: raw.voided === true || cardTx.state === 'VOIDED',
    refundReason: raw.refundReason,
    createdTime: raw.createdTime ? new Date(raw.createdTime).toISOString() : undefined,
    traceId: raw.traceId || cardTx.traceId || gatewayResp.traceId || raw.transactionRef,
  }
}

// ─── Verification Helper (legacy, still used by webhook) ────────────────────

interface VerifyResult {
  verified: boolean
  paid: boolean
  checkout?: CloverCheckoutGetResponse
  error?: string
}

/**
 * Verify a Clover Hosted Checkout payment.
 *
 * Strategy:
 *   1. Try Ecommerce API GET /invoicingcheckoutservice/v1/checkouts/{checkoutId}
 *      → May return 404 (Clover doesn't always support this)
 *   2. Fall back to Merchant API GET /v3/merchants/{mId}/payments
 *      → Search recent payments matching the checkoutId as externalReferenceId
 *   3. If both fail, return unverified (the return handler will use URL status)
 */
export async function verifyCloverCheckout(
  checkoutId: string
): Promise<VerifyResult> {
  if (!CLOVER_CONFIG.canVerifyPayments) {
    console.warn('[Clover] Cannot verify payment — no bearer token configured')
    return { verified: false, paid: false, error: 'Clover bearer token not configured' }
  }

  try {
    // ─── Strategy 1: Ecommerce API checkout verification ───────────────
    if (CLOVER_CONFIG.isUsingEcomApi) {
      const ecomUrl = `${CLOVER_CONFIG.merchantBaseUrl}/invoicingcheckoutservice/v1/checkouts/${checkoutId}`

      debug(`[Clover] Strategy 1: Verifying checkout ${checkoutId} via Ecommerce API`)

      const ecomResponse = await cloverHttpsRequest(ecomUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CLOVER_CONFIG.bearerToken}`,
          'X-Clover-Merchant-Id': CLOVER_CONFIG.checkoutMerchantId,
          'Content-Type': 'application/json',
        },
      })

      debug(`[Clover] Strategy 1: Ecommerce API returned HTTP ${ecomResponse.status}`)

      if (ecomResponse.ok) {
        const checkout = JSON.parse(ecomResponse.body)
        const isPaid = checkout.status === 'completed'

        debug(`[Clover] Checkout ${checkoutId} — status: ${checkout.status}, paymentId: ${checkout.paymentId || 'NONE'}, amount: ${checkout.amount || 0}`)

        return {
          verified: true,
          paid: isPaid,
          checkout: {
            id: checkoutId,
            href: checkout.href || '',
            status: checkout.status || 'created',
            amount: checkout.amount || 0,
            currency: checkout.currency || 'usd',
            createdTime: checkout.createdTime || new Date().toISOString(),
            paymentId: checkout.paymentId,
            orderId: checkout.orderId,
          },
        }
      }

      // Ecommerce API returned non-200 (likely 404) — try Merchant API
      debug(`[Clover] Ecommerce API returned ${ecomResponse.status}, trying Merchant API...`)
    }

    // ─── Strategy 2: Merchant API payments verification ────────────────
    // The Ecom token also works with the Merchant API for the ecom merchant.
    // We fetch recent payments and search client-side for the checkoutId
    // because the v3 filter parser can't handle UUIDs with hyphens.
    const merchantId = CLOVER_CONFIG.checkoutMerchantId
    const paymentsUrl = `${CLOVER_CONFIG.merchantBaseUrl}/v3/merchants/${merchantId}/payments?limit=10&orderBy=createdTime&orderByDesc=true`

    debug(`[Clover] Strategy 2: Verifying payment for checkout ${checkoutId} via Merchant API (recent payments)`)

    const paymentsResponse = await cloverHttpsRequest(paymentsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLOVER_CONFIG.bearerToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (paymentsResponse.ok) {
      const paymentsData = JSON.parse(paymentsResponse.body)
      const payments = paymentsData.elements || []

      // Search client-side for a payment matching our checkout ID
      const matchingPayment = payments.find((p: any) => {
        return p.externalReferenceId === checkoutId
          || p.order?.externalReferenceId === checkoutId
          || p.note?.includes(checkoutId)
      })

      if (matchingPayment) {
        const isPaid = matchingPayment.result === 'SUCCESS'

        debug(`[Clover] Payment found for checkout ${checkoutId}: result=${matchingPayment.result}, amount=${matchingPayment.amount}`)

        return {
          verified: true,
          paid: isPaid,
          checkout: {
            id: checkoutId,
            href: '',
            status: isPaid ? 'completed' : 'created',
            amount: matchingPayment.amount || 0,
            currency: matchingPayment.order?.currency || 'usd',
            createdTime: matchingPayment.createdTime ? new Date(matchingPayment.createdTime).toISOString() : new Date().toISOString(),
            paymentId: matchingPayment.id,
            orderId: matchingPayment.order?.id,
          },
        }
      }

      // No payment found yet — checkout may still be in progress
      debug(`[Clover] No payment found for checkout ${checkoutId} — may still be processing`)
      return {
        verified: true,
        paid: false,
        checkout: {
          id: checkoutId,
          href: '',
          status: 'created',
          amount: 0,
          currency: 'usd',
          createdTime: new Date().toISOString(),
        },
      }
    }

    // Merchant API also failed
    console.error(`[Clover] Merchant API verification failed — ${paymentsResponse.status}: ${paymentsResponse.body}`)
    return {
      verified: false,
      paid: false,
      error: `Merchant API returned ${paymentsResponse.status}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Clover] Verification exception:', message)
    return {
      verified: false,
      paid: false,
      error: message,
    }
  }
}

// ─── OAuth Token Exchange Helper ─────────────────────────────────────────────

export interface OAuthTokenResponse {
  access_token: string
  token_type?: string
  scope?: string
  livemode?: boolean
}

/**
 * Exchange an OAuth authorization code for an access token.
 *
 * Calls POST /oauth/token with client_id, client_secret, and code.
 * Returns the access token on success.
 */
export async function exchangeOAuthCode(
  code: string
): Promise<OAuthTokenResponse> {
  const baseUrl = CLOVER_CONFIG.oauthBaseUrl
  const url = `${baseUrl}/oauth/token?client_id=${CLOVER_CONFIG.clientId}&client_secret=${CLOVER_CONFIG.clientSecret}&code=${code}`

  debug(`[Clover OAuth] Exchanging authorization code for access token...`)
  debug(`[Clover OAuth] POST ${baseUrl}/oauth/token`)

  const response = await cloverHttpsRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  debug(`[Clover OAuth] Token exchange response: ${response.status}`)

  if (!response.ok) {
    console.error(`[Clover OAuth] Token exchange failed: ${response.body}`)
    throw new Error(`OAuth token exchange failed: ${response.status} — ${response.body}`)
  }

  const data = JSON.parse(response.body) as OAuthTokenResponse
  debug(`[Clover OAuth] ✅ Access token received (length: ${data.access_token?.length || 0})`)

  return data
}
