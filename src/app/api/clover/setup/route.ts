import { NextRequest, NextResponse } from 'next/server'
import { CLOVER_CONFIG, createHostedCheckout } from '@/lib/clover'
import { updateEnvLocal, readEnvLocalKeys, envLocalExists } from '@/lib/env-file'
import { getEnvHealthReport } from '@/lib/env-health'
import { primeSettingsCache, setSettings } from '@/lib/settings-db'
import https from 'https'

// ─── Debug Logging ────────────────────────────────────────────────────────────
const CLOVER_DEBUG = process.env.CLOVER_DEBUG === 'true'
function debug(...args: unknown[]): void {
  if (CLOVER_DEBUG) console.log(...args)
}

// ─── Clover Connection Test & Token Setup ────────────────────────────────────
//   POST /api/clover/setup
//     Body: { tokenType: "ecom" | "oauth", token: string, ecomMerchantId?: string }
//
//   Flow (validate-then-write):
//     1. Validate input shape
//     2. Test credentials against Clover BEFORE writing anything
//     3. If validation passes: persist to .env.local atomically (never overwrite file)
//     4. Set process.env for immediate effect (no restart needed)
//     5. Re-verify by reading .env.local back + checking isConfigured
//     6. Return full diagnostics
//
//   GET /api/clover/setup
//     Returns current config status + connection test (if configured)
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Test Ecommerce API credentials by creating a $0.01 Hosted Checkout session.
 * This is the only way to validate an Ecom Private Token — there's no ping endpoint.
 * The session auto-expires on Clover's side; no payment is ever taken.
 *
 * Throws on failure. Returns checkout session ID on success.
 */
async function testEcomCredentials(token: string, merchantId: string): Promise<string> {
  const baseUrl =
    CLOVER_CONFIG.environment === 'production'
      ? 'https://api.clover.com'
      : 'https://apisandbox.dev.clover.com'

  const url = `${baseUrl}/invoicingcheckoutservice/v1/checkouts`

  const body = JSON.stringify({
    customer: { email: 'test@connection-check.com', firstName: 'Test', lastName: 'Connection' },
    shoppingCart: { lineItems: [{ name: 'Connection Test', price: 1, unitQty: 1 }] },
  })

  return new Promise<string>((resolve, reject) => {
    const parsedUrl = new URL(url)
    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Clover-Merchant-Id': merchantId,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let respBody = ''
        res.on('data', (chunk: Buffer) => {
          respBody += chunk.toString()
        })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = JSON.parse(respBody)
              if (data.id) {
                resolve(data.id as string)
              } else {
                reject(
                  new Error(
                    `Clover returned 2xx but no checkout ID. Response: ${respBody.substring(0, 200)}`
                  )
                )
              }
            } catch {
              reject(new Error(`Clover returned non-JSON 2xx response: ${respBody.substring(0, 200)}`))
            }
          } else {
            let hint = ''
            if (res.statusCode === 401)
              hint = ' — Token is invalid or expired. Verify you copied the PRIVATE token (not the public key) for HOSTED_CHECKOUT integration type.'
            else if (res.statusCode === 403)
              hint = ' — Token is valid but lacks permission for Hosted Checkout, OR the Merchant ID is wrong.'
            else if (res.statusCode === 400)
              hint = ' — Bad request. Usually means the Merchant ID is malformed or does not match the token.'
            reject(
              new Error(
                `Clover rejected credentials (HTTP ${res.statusCode})${hint}\nResponse: ${respBody.substring(0, 300)}`
              )
            )
          }
        })
      }
    )
    req.on('error', (err) => reject(new Error(`Network error testing Clover: ${err.message}`)))
    req.write(body)
    req.end()
  })
}

/**
 * Test OAuth credentials against the Merchant API (lighter than checkout).
 */
async function testOAuthCredentials(
  token: string,
  merchantId: string
): Promise<{ merchantName: string; merchantId: string }> {
  const baseUrl =
    CLOVER_CONFIG.environment === 'production'
      ? 'https://api.clover.com'
      : 'https://apisandbox.dev.clover.com'

  const url = `${baseUrl}/v3/merchants/${merchantId}`

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let respBody = ''
        res.on('data', (chunk: Buffer) => {
          respBody += chunk.toString()
        })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = JSON.parse(respBody)
              resolve({
                merchantName: data.name || 'Unknown',
                merchantId: data.id,
              })
            } catch {
              reject(new Error(`Clover returned non-JSON: ${respBody.substring(0, 200)}`))
            }
          } else {
            reject(
              new Error(
                `Clover OAuth token rejected (HTTP ${res.statusCode}). Response: ${respBody.substring(0, 300)}`
              )
            )
          }
        })
      }
    )
    req.on('error', (err) => reject(new Error(`Network error testing Clover: ${err.message}`)))
    req.end()
  })
}

export async function GET() {
  // Prime the DB settings cache so isConfigured() reflects DB credentials
  // even when .env.local is missing.
  await primeSettingsCache()

  const report = getEnvHealthReport()

  const result = {
    environment: CLOVER_CONFIG.environment,
    merchantId: CLOVER_CONFIG.merchantId || '(not set)',
    ecomMerchantId: CLOVER_CONFIG.ecomMerchantId || '(not set)',
    checkoutMerchantId: CLOVER_CONFIG.checkoutMerchantId || '(not set)',
    clientId: CLOVER_CONFIG.clientId || '(not set)',
    clientSecretSet: !!CLOVER_CONFIG.clientSecret,
    ecomTokenSet: !!CLOVER_CONFIG.ecomToken,
    accessTokenSet: !!CLOVER_CONFIG.accessToken,
    bearerTokenSet: !!CLOVER_CONFIG.bearerToken,
    isConfigured: CLOVER_CONFIG.isConfigured,
    isUsingEcomApi: CLOVER_CONFIG.isUsingEcomApi,
    canVerifyPayments: CLOVER_CONFIG.canVerifyPayments,
    merchantBaseUrl: CLOVER_CONFIG.merchantBaseUrl,
    oauthBaseUrl: CLOVER_CONFIG.oauthBaseUrl,
    envLocalExists: envLocalExists(),
    paymentsHealth: report.payments,
  }

  // If we have a bearer token, test the connection
  let connectionTest: { success: boolean; [key: string]: unknown } | null = null
  if (CLOVER_CONFIG.bearerToken && CLOVER_CONFIG.checkoutMerchantId) {
    try {
      if (CLOVER_CONFIG.isUsingEcomApi) {
        debug('[Clover Setup] Testing Ecommerce API connection via Hosted Checkout...')
        const testCheckout = await createHostedCheckout({
          customer: { email: 'test@connection-check.com', firstName: 'Test', lastName: 'Connection' },
          shoppingCart: { lineItems: [{ name: 'Connection Test', price: 1, unitQty: 1 }] },
        })
        connectionTest = {
          success: true,
          authMethod: 'Ecommerce API Private Token',
          checkoutEndpoint: `${CLOVER_CONFIG.merchantBaseUrl}/invoicingcheckoutservice/v1/checkouts`,
          testCheckoutId: testCheckout.checkoutSessionId,
          note: `✅ Hosted Checkout connection verified! Test session ${testCheckout.checkoutSessionId} created (will auto-expire).`,
        }
      } else {
        debug('[Clover Setup] Testing OAuth connection via Merchant API...')
        const merchant = await testOAuthCredentials(
          CLOVER_CONFIG.bearerToken,
          CLOVER_CONFIG.checkoutMerchantId
        )
        connectionTest = {
          success: true,
          authMethod: 'OAuth Access Token',
          merchantName: merchant.merchantName,
          merchantId: merchant.merchantId,
        }
      }
    } catch (err: any) {
      connectionTest = {
        success: false,
        authMethod: CLOVER_CONFIG.isUsingEcomApi
          ? 'Ecommerce API Private Token'
          : 'OAuth Access Token',
        error: err.message?.substring(0, 400) || 'Connection test failed',
      }
    }
  }

  return NextResponse.json({
    success: true,
    config: result,
    connectionTest,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokenType, token, ecomMerchantId } = body

    // ── Step 1: Validate input ──
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Token is required', step: 'input_validation' },
        { status: 400 }
      )
    }

    if (tokenType === 'ecom') {
      if (!ecomMerchantId || typeof ecomMerchantId !== 'string' || ecomMerchantId.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Ecommerce Merchant ID is required when using the Ecommerce API path',
            step: 'input_validation',
          },
          { status: 400 }
        )
      }
    } else if (tokenType !== 'oauth') {
      return NextResponse.json(
        { success: false, error: 'Invalid tokenType. Use "ecom" or "oauth".', step: 'input_validation' },
        { status: 400 }
      )
    }

    // ── Step 2: Validate credentials against Clover BEFORE writing anything ──
    debug(`[Clover Setup] Step 2: Validating ${tokenType} credentials against Clover...`)

    let validation: { ok: boolean; detail: string; testCheckoutId?: string; merchantName?: string }
    try {
      if (tokenType === 'ecom') {
        const testId = await testEcomCredentials(token.trim(), ecomMerchantId.trim())
        validation = {
          ok: true,
          detail: `Clover accepted the credentials. Test checkout session ${testId} created (auto-expires).`,
          testCheckoutId: testId,
        }
      } else {
        // OAuth path — caller must also provide merchantId via a separate field or env
        const oauthMerchantId =
          (typeof body.merchantId === 'string' && body.merchantId.trim()) ||
          CLOVER_CONFIG.merchantId ||
          ''
        if (!oauthMerchantId) {
          return NextResponse.json(
            {
              success: false,
              error: 'OAuth path requires CLOVER_MERCHANT_ID. Set it in .env.local first or pass merchantId in the body.',
              step: 'input_validation',
            },
            { status: 400 }
          )
        }
        const m = await testOAuthCredentials(token.trim(), oauthMerchantId)
        validation = {
          ok: true,
          detail: `Clover accepted the OAuth token. Merchant: ${m.merchantName} (${m.merchantId}).`,
          merchantName: m.merchantName,
        }
      }
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          error: `Credential validation FAILED. No changes were written to .env.local.\n\n${err.message || err}`,
          step: 'credential_validation',
          validation: { ok: false, detail: err.message || String(err) },
        },
        { status: 400 }
      )
    }

    // ── Step 3: Persist to .env.local atomically (NEVER overwrite existing file) ──
    debug(`[Clover Setup] Step 3: Persisting credentials to .env.local (atomic write)...`)

    const updates: Record<string, string> =
      tokenType === 'ecom'
        ? {
            CLOVER_ECOM_TOKEN: token.trim(),
            CLOVER_ECOM_MERCHANT_ID: ecomMerchantId.trim(),
          }
        : { CLOVER_ACCESS_TOKEN: token.trim() }

    const writeResult = updateEnvLocal(updates)

    if (!writeResult.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Credential validation passed, but failed to persist to .env.local: ${writeResult.error}`,
          step: 'persist',
          validation,
          writeResult,
        },
        { status: 500 }
      )
    }

    // ── Step 4: Set process.env for immediate effect (no restart needed) ──
    debug(`[Clover Setup] Step 4: Setting process.env for immediate effect...`)
    for (const [k, v] of Object.entries(updates)) {
      process.env[k] = v
    }

    // ── Step 4b: ALSO persist to the DB-backed Setting table ──────────────
    // This is the PERMANENT fallback. If the sandbox wipes .env.local, the
    // credentials survive in the SQLite database. The checkout route reads
    // from the DB cache (via envWithDbFallback) when env vars are missing.
    debug(`[Clover Setup] Step 4b: Persisting credentials to DB Setting table...`)
    try {
      await setSettings(updates)
    } catch (dbError) {
      console.error('[Clover Setup] DB persist failed (non-fatal — .env.local already written):', dbError)
      // Non-fatal: the .env.local write succeeded, so the credentials will
      // work at least until the next sandbox reset.
    }

    // ── Step 5: Re-verify by reading .env.local back + checking isConfigured ──
    debug(`[Clover Setup] Step 5: Post-write verification...`)
    const persistedKeys = readEnvLocalKeys(Object.keys(updates))
    const allPersisted = Object.entries(persistedKeys).every(([_, v]) => v === true)
    const nowConfigured = CLOVER_CONFIG.isConfigured

    const verification = {
      allKeysPersistedToEnvLocal: allPersisted,
      isConfiguredAfterWrite: nowConfigured,
      persistedKeys,
      processEnvSet: Object.entries(updates).every(([k]) => !!process.env[k]),
    }

    // ── Step 6: Return full diagnostics ──
    return NextResponse.json({
      success: true,
      message: `Clover ${tokenType === 'ecom' ? 'Ecommerce API' : 'OAuth'} credentials validated and saved successfully.`,
      step: 'complete',
      authMethod: tokenType === 'ecom' ? 'Ecommerce API Private Token' : 'OAuth Access Token',
      validation,
      write: {
        ...writeResult,
        // Don't expose the path with PII — it's always .env.local
        path: writeResult.path.endsWith('.env.local') ? '.env.local' : writeResult.path,
      },
      verification,
      config: {
        environment: CLOVER_CONFIG.environment,
        isConfigured: CLOVER_CONFIG.isConfigured,
        isUsingEcomApi: CLOVER_CONFIG.isUsingEcomApi,
        ecomTokenSet: !!CLOVER_CONFIG.ecomToken,
        ecomMerchantIdSet: !!CLOVER_CONFIG.ecomMerchantId,
        accessTokenSet: !!CLOVER_CONFIG.accessToken,
        merchantIdSet: !!CLOVER_CONFIG.merchantId,
      },
    })
  } catch (error) {
    console.error('[Clover Setup Error]', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Token setup failed.',
        step: 'unknown',
      },
      { status: 500 }
    )
  }
}
