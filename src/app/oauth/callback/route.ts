import { NextRequest, NextResponse } from 'next/server'
import { CLOVER_CONFIG, exchangeOAuthCode } from '@/lib/clover'
import { getSiteUrl } from '@/lib/utils'

// ─── Clover OAuth Callback ──────────────────────────────────────────────────
//
// GET /oauth/callback
//
// Handles THREE different Clover redirect scenarios:
//
// SCENARIO 1 — App Launch (no `code`):
//   When a merchant clicks the app in Clover Dashboard or App Market, Clover
//   redirects here with just `merchant_id` and `client_id`. This is NOT an
//   OAuth authorization — it's just an app launch. We must manually redirect
//   the merchant to Clover's OAuth authorize URL to get a `code`.
//
// SCENARIO 2 — OAuth Callback (has `code`):
//   After the merchant authorizes on Clover's consent page, Clover redirects
//   back here with `code`, `merchant_id`, and possibly `country`/`employee_id`.
//   This code is then exchanged for an OAuth access token using
//   POST /oauth/token?client_id=...&client_secret=...&code=...
//
// SCENARIO 3 — OAuth Error:
//   Clover redirects here with an `error` parameter if the merchant denied
//   authorization or something went wrong.
//
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  // ─── Capture all query parameters ─────────────────────────────────────
  const code = searchParams.get('code')
  const merchantId = searchParams.get('merchant_id')
  const country = searchParams.get('country')
  const employeeId = searchParams.get('employee_id')
  const clientId = searchParams.get('client_id')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // ─── Log (sanitised — never print codes/tokens to logs) ────────────
  const allParams: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    allParams[key] = value
  })

  const DEBUG = process.env.CLOVER_DEBUG === 'true'
  if (DEBUG) {
    console.log('[Clover OAuth] Callback received')
    console.log('  merchant_id:      ', merchantId || '(not present)')
    console.log('  country:          ', country || '(not present)')
    console.log('  client_id:        ', clientId || '(not present)')
    console.log('  code present:     ', code ? 'yes' : 'no')
    console.log('  error:            ', error || '(not present)')
  }

  // ─── Handle OAuth error from Clover ───────────────────────────────────
  if (error) {
    console.error(`[Clover OAuth] Error: ${error} — ${errorDescription}`)
    return new NextResponse(buildErrorPage(error, errorDescription, allParams), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // ─── SCENARIO 2: OAuth callback with authorization code ──────────────
  if (code) {
    if (DEBUG) console.log(`[Clover OAuth] Authorization code received for merchant ${merchantId}`)

    // ─── Attempt token exchange ──────────────────────────────────────────
    let accessToken: string | null = null
    let tokenError: string | null = null

    if (!CLOVER_CONFIG.clientSecret) {
      tokenError = 'CLOVER_CLIENT_SECRET is not set in .env.local. Token exchange cannot proceed. Add your app\'s Client Secret from the Clover Developer Dashboard and restart the server.'
      console.warn(`[Clover OAuth] ${tokenError}`)
    } else {
      try {
        const tokenResponse = await exchangeOAuthCode(code)
        accessToken = tokenResponse.access_token
        // Do NOT log the access token. It is shown to the admin in the success page UI only.
        if (DEBUG) console.log(`[Clover OAuth] Access token obtained successfully for merchant ${merchantId}`)
      } catch (err) {
        tokenError = err instanceof Error ? err.message : 'Unknown error during token exchange'
        console.error(`[Clover OAuth] Token exchange failed: ${tokenError}`)
      }
    }

    return new NextResponse(buildSuccessPage({
      code,
      merchantId,
      country,
      employeeId,
      clientId,
      state,
      allParams,
      accessToken,
      tokenError,
    }), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // ─── SCENARIO 1: App launch — no code, redirect to OAuth authorize ───
  //
  // Clover launched the app but didn't perform OAuth. We need to redirect
  // the merchant to Clover's OAuth authorization URL:
  //
  //   GET https://sandbox.dev.clover.com/oauth/authorize
  //     ?client_id={APP_ID}
  //     &response_type=code
  //     &redirect_uri={OUR_CALLBACK_URL}
  //
  // After the merchant consents, Clover will redirect back here with ?code=...
  //

  if (merchantId && clientId) {
    // App launch detected — redirect to OAuth authorize URL
    const siteUrl = getSiteUrl()
    const redirectUri = `${siteUrl}/oauth/callback`
    const cloverBaseUrl = CLOVER_CONFIG.oauthBaseUrl

    const authorizeUrl = `${cloverBaseUrl}/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`

    if (DEBUG) {
      console.log(`[Clover OAuth] App launch detected — merchant ${merchantId}, client ${clientId}`)
      console.log(`[Clover OAuth] Site URL: ${siteUrl}`)
      console.log(`[Clover OAuth] Redirect URI: ${redirectUri}`)
      console.log(`[Clover OAuth] Redirecting to OAuth authorize: ${authorizeUrl}`)
    }

    // Show a brief page explaining what's happening, then auto-redirect
    return new NextResponse(buildLaunchPage({
      merchantId,
      clientId,
      authorizeUrl,
      siteUrl,
      redirectUri,
    }), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // ─── No code, no merchant_id — completely unexpected ──────────────────
  console.error('[Clover OAuth] Unexpected callback — no code and no merchant_id')

  return new NextResponse(buildErrorPage(
    'unexpected_callback',
    'The callback was reached without an authorization code or merchant ID. This is unexpected. Please launch the app from your Clover Dashboard.',
    allParams
  ), {
    status: 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// ─── HTML Page: App Launch → OAuth Redirect ─────────────────────────────────

function buildLaunchPage(params: {
  merchantId: string
  clientId: string
  authorizeUrl: string
  siteUrl: string
  redirectUri: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clover — Connecting Your Account</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      max-width: 560px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    .spinner {
      width: 48px; height: 48px;
      border: 4px solid #dbeafe;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 24px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { color: #1e40af; font-size: 22px; margin-bottom: 8px; }
    .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
    .field {
      margin-bottom: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 14px;
      background: #f9fafb;
      text-align: left;
    }
    .field-label {
      font-size: 10px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.05em;
      color: #9ca3af; margin-bottom: 2px;
    }
    .field-value {
      font-size: 13px; color: #374151;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .field-value.highlight { color: #1e40af; font-weight: 600; }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 32px;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.4); }
    .info {
      margin-top: 20px;
      padding: 12px 14px;
      background: #fefce8;
      border: 1px solid #fde68a;
      border-radius: 8px;
      font-size: 12px;
      color: #854d0e;
      line-height: 1.5;
      text-align: left;
    }
    .info strong { color: #713f12; }
    .debug {
      margin-top: 12px;
      padding: 10px 12px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      font-size: 11px;
      color: #166534;
      line-height: 1.5;
      text-align: left;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Connecting Your Clover Account</h1>
    <p class="subtitle">
      Your app was launched from Clover. Redirecting you to authorize access&hellip;
    </p>

    <div class="field">
      <div class="field-label">Merchant ID</div>
      <div class="field-value highlight">${escapeHtml(params.merchantId)}</div>
    </div>
    <div class="field">
      <div class="field-label">App Client ID</div>
      <div class="field-value">${escapeHtml(params.clientId)}</div>
    </div>

    <a href="${escapeHtml(params.authorizeUrl)}" class="btn">
      Authorize on Clover
    </a>

    <div class="info">
      <strong>What&rsquo;s happening:</strong> Clover launched this app but didn&rsquo;t provide
      an OAuth authorization code. Clicking the button above will redirect you to Clover&rsquo;s
      consent page where you can authorize this app to access your Merchant API.
      After authorization, you&rsquo;ll be returned here with an authorization code that will
      be automatically exchanged for an access token.
    </div>

    <div class="debug">
      redirect_uri: ${escapeHtml(params.redirectUri)}
    </div>
  </div>

  <script>
    // Auto-redirect after 2 seconds
    setTimeout(function() {
      window.location.href = ${JSON.stringify(params.authorizeUrl)};
    }, 2000);
  </script>
</body>
</html>`
}

// ─── HTML Page: OAuth Success (with token exchange result) ───────────────────

function buildSuccessPage(params: {
  code: string
  merchantId: string | null
  country: string | null
  employeeId: string | null
  clientId: string | null
  state: string | null
  allParams: Record<string, string>
  accessToken: string | null
  tokenError: string | null
}): string {
  const maskedCode = params.code.length > 12
    ? params.code.substring(0, 8) + '••••' + params.code.substring(params.code.length - 4)
    : params.code.substring(0, 4) + '••••'

  // Build token exchange status section
  let tokenSection: string
  if (params.accessToken) {
    const maskedToken = params.accessToken.length > 16
      ? params.accessToken.substring(0, 8) + '••••' + params.accessToken.substring(params.accessToken.length - 8)
      : params.accessToken.substring(0, 6) + '••••'
    tokenSection = `
    <div class="success-badge">✅ ACCESS TOKEN OBTAINED</div>
    <div class="field">
      <div class="field-label">Access Token (masked)</div>
      <div class="field-value highlight">${escapeHtml(maskedToken)}</div>
    </div>
    <div class="next-step">
      <strong>🎉 Almost done!</strong> Copy the access token shown in your server console and add it to your <code>.env.local</code> file:<br><br>
      <code>CLOVER_ACCESS_TOKEN=&lt;full-token-from-console&gt;</code><br><br>
      Then restart the dev server. After that, the Payment Links checkout will work.
    </div>`
  } else if (params.tokenError) {
    tokenSection = `
    <div class="error-badge">❌ TOKEN EXCHANGE FAILED</div>
    <div class="field error-field">
      <div class="field-label">Error</div>
      <div class="field-value">${escapeHtml(params.tokenError)}</div>
    </div>
    <div class="warning">
      <strong>The authorization code was received successfully.</strong><br>
      The code has been logged to the server console. You can manually exchange it for an access token using:<br><br>
      <code>POST ${escapeHtml(CLOVER_CONFIG.oauthBaseUrl)}/oauth/token?client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&code=THE_CODE</code>
    </div>`
  } else {
    tokenSection = `
    <div class="warning">
      <strong>⚠ Code is partially masked for security.</strong><br>
      The full authorization code has been logged to the server console.
      This code is short-lived and should be exchanged for an access token promptly.
    </div>
    <div class="next-step">
      <strong>Next step:</strong> The server will attempt to exchange this code for an access token automatically.
      If CLOVER_CLIENT_SECRET is not set, you need to add it to .env.local and re-trigger this flow.
    </div>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clover OAuth — Authorization Received</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%);
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .card {
      background: white; border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      max-width: 640px; width: 100%; padding: 40px;
    }
    .icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #059669);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px; font-size: 32px; color: white;
    }
    h1 { text-align: center; color: #065f46; font-size: 24px; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 28px; }
    .field {
      margin-bottom: 16px; border: 1px solid #e5e7eb;
      border-radius: 8px; padding: 12px 16px; background: #f9fafb;
    }
    .error-field { border-color: #fecaca; background: #fef2f2; }
    .field-label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.05em; color: #6b7280; margin-bottom: 4px;
    }
    .field-value {
      font-size: 14px; color: #111827;
      font-family: 'SF Mono', 'Fira Code', monospace; word-break: break-all;
    }
    .field-value.masked { color: #9ca3af; }
    .field-value.highlight { color: #059669; font-weight: 600; }
    .success-badge {
      display: inline-block; margin-bottom: 16px;
      padding: 6px 16px; border-radius: 20px;
      background: #ecfdf5; border: 1px solid #a7f3d0;
      color: #065f46; font-size: 13px; font-weight: 600;
    }
    .error-badge {
      display: inline-block; margin-bottom: 16px;
      padding: 6px 16px; border-radius: 20px;
      background: #fef2f2; border: 1px solid #fecaca;
      color: #991b1b; font-size: 13px; font-weight: 600;
    }
    .warning {
      margin-top: 20px; padding: 14px 16px; background: #fffbeb;
      border: 1px solid #fde68a; border-radius: 8px;
      font-size: 13px; color: #92400e; line-height: 1.5;
    }
    .warning strong { color: #78350f; }
    .next-step {
      margin-top: 20px; padding: 16px; background: #eff6ff;
      border: 1px solid #bfdbfe; border-radius: 8px;
      font-size: 13px; color: #1e40af; line-height: 1.5;
    }
    .next-step strong { color: #1e3a8a; }
    .next-step code, .warning code {
      background: #1f2937; color: #a5f3fc; padding: 2px 6px;
      border-radius: 4px; font-size: 12px; word-break: break-all;
    }
    .divider { height: 1px; background: #e5e7eb; margin: 20px 0; }
    .raw-params {
      padding: 12px; background: #1f2937; border-radius: 8px;
      color: #a5f3fc; font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Authorization Received</h1>
    <p class="subtitle">Clover OAuth callback was successful</p>

    <div class="field">
      <div class="field-label">Authorization Code</div>
      <div class="field-value masked">${escapeHtml(maskedCode)}</div>
    </div>

    <div class="field">
      <div class="field-label">Merchant ID</div>
      <div class="field-value highlight">${escapeHtml(params.merchantId || 'not provided')}</div>
    </div>

    ${params.country ? `
    <div class="field">
      <div class="field-label">Country</div>
      <div class="field-value">${escapeHtml(params.country)}</div>
    </div>` : ''}

    ${params.employeeId ? `
    <div class="field">
      <div class="field-label">Employee ID</div>
      <div class="field-value">${escapeHtml(params.employeeId)}</div>
    </div>` : ''}

    <div class="divider"></div>

    ${tokenSection}

    <div class="divider"></div>

    <div class="field-label" style="margin-bottom: 8px;">Raw Parameters (for debugging)</div>
    <div class="raw-params">${escapeHtml(JSON.stringify(params.allParams, null, 2))}</div>
  </div>
</body>
</html>`
}

// ─── HTML Page: Error ───────────────────────────────────────────────────────

function buildErrorPage(error: string, description: string | null, allParams: Record<string, string>): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clover OAuth — Error</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%);
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .card {
      background: white; border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      max-width: 520px; width: 100%; padding: 40px;
    }
    .icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px; font-size: 32px; color: white;
    }
    h1 { text-align: center; color: #991b19; font-size: 22px; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 24px; }
    .field {
      margin-bottom: 16px; border: 1px solid #fecaca;
      border-radius: 8px; padding: 12px 16px; background: #fef2f2;
    }
    .field-label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 4px;
    }
    .field-value {
      font-size: 14px; color: #991b19;
      font-family: 'SF Mono', 'Fira Code', monospace; word-break: break-all;
    }
    .divider { height: 1px; background: #fecaca; margin: 20px 0; }
    .raw-params {
      padding: 12px; background: #1f2937; border-radius: 8px;
      color: #a5f3fc; font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✕</div>
    <h1>OAuth Error</h1>
    <p class="subtitle">Clover authorization was not successful</p>
    <div class="field">
      <div class="field-label">Error</div>
      <div class="field-value">${escapeHtml(error)}</div>
    </div>
    ${description ? `
    <div class="field">
      <div class="field-label">Description</div>
      <div class="field-value">${escapeHtml(description)}</div>
    </div>` : ''}
    <div class="divider"></div>
    <div class="field-label" style="margin-bottom: 8px;">Raw Parameters Received</div>
    <div class="raw-params">${escapeHtml(JSON.stringify(allParams, null, 2))}</div>
  </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
