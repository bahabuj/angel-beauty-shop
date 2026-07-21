/**
 * Environment Variable Health Check
 *
 * Reports PRESENT / MISSING status for every environment variable the app uses.
 * NEVER exposes secret values — only key names, presence, and metadata.
 *
 * Used by:
 *   - /api/env-health        (admin Settings page reads this)
 *   - instrumentation.ts     (logs at server startup)
 *   - /api/clover/setup      (pre-flight check before writing credentials)
 */

export type EnvVarCategory =
  | 'required' // app won't boot without it
  | 'payments' // app runs but checkout fails without it
  | 'optional' // has a sensible default
  | 'public' // NEXT_PUBLIC_ prefixed (exposed to browser)

export interface EnvVarSpec {
  key: string
  category: EnvVarCategory
  description: string
  /** True if a single var satisfies the requirement; false if part of an either/or group. */
  standalone?: boolean
  /** Group tag — vars in the same group are alternatives (e.g. ecom vs oauth). */
  group?: 'clover_auth'
}

export interface EnvVarStatus extends EnvVarSpec {
  present: boolean
  length: number
}

/**
 * Master list of every environment variable referenced by the codebase.
 * Source of truth for .env.example, README, health checks, and the
 * Production Environment Checklist.
 */
export const ENV_VARS: readonly EnvVarSpec[] = [
  // ── REQUIRED ──
  {
    key: 'DATABASE_URL',
    category: 'required',
    description: 'SQLite connection string. Prisma throws at runtime if missing.',
    standalone: true,
  },
  {
    key: 'NEXTAUTH_SECRET',
    category: 'required',
    description:
      'Signs NextAuth session JWTs + cookie auth tokens. Generate with `openssl rand -base64 32`. Rotating invalidates all sessions.',
    standalone: true,
  },

  // ── REQUIRED FOR PAYMENTS — Path A: Ecommerce API (recommended) ──
  {
    key: 'CLOVER_ECOM_TOKEN',
    category: 'payments',
    description:
      'Ecommerce API Private Token (Path A). Used as Bearer for Hosted Checkout. Found in Clover Dashboard → Ecommerce → Ecommerce API Tokens.',
    group: 'clover_auth',
  },
  {
    key: 'CLOVER_ECOM_MERCHANT_ID',
    category: 'payments',
    description:
      'Ecommerce merchant ID (Path A). Different from POS merchant ID. Sent as X-Clover-Merchant-Id header.',
    group: 'clover_auth',
  },

  // ── REQUIRED FOR PAYMENTS — Path B: OAuth (alternative) ──
  {
    key: 'CLOVER_ACCESS_TOKEN',
    category: 'payments',
    description:
      'OAuth access token (Path B). Alternative to Ecom Token. Obtained via /oauth/callback flow.',
    group: 'clover_auth',
  },
  {
    key: 'CLOVER_MERCHANT_ID',
    category: 'payments',
    description:
      'POS/Dashboard merchant ID (Path B). Used as fallback for checkoutMerchantId when CLOVER_ECOM_MERCHANT_ID is empty.',
    group: 'clover_auth',
  },
  {
    key: 'CLOVER_CLIENT_ID',
    category: 'payments',
    description:
      'Clover Developer App Client ID (Path B). Used in OAuth authorize URL. Only needed if using OAuth flow.',
    group: 'clover_auth',
  },
  {
    key: 'CLOVER_CLIENT_SECRET',
    category: 'payments',
    description:
      'Clover Developer App Client Secret (Path B). Used in OAuth /oauth/token exchange. Only needed if using OAuth flow.',
    group: 'clover_auth',
  },

  // ── OPTIONAL ──
  {
    key: 'CLOVER_ENVIRONMENT',
    category: 'optional',
    description: '"sandbox" or "production". Defaults to "sandbox".',
    standalone: true,
  },
  {
    key: 'CLOVER_DEBUG',
    category: 'optional',
    description:
      'Set to "true" to enable verbose Clover logging. NEVER enable in production (may log card data). Defaults to false.',
    standalone: true,
  },
  {
    key: 'SITE_URL',
    category: 'optional',
    description:
      'Server-side canonical site URL for Clover redirects, OAuth callbacks, webhooks. Takes precedence over NEXT_PUBLIC_SITE_URL.',
    standalone: true,
  },
  {
    key: 'FIREBASE_PROJECT_ID',
    category: 'optional',
    description:
      'Server-side Firebase project ID for ID-token verification. Falls back to NEXT_PUBLIC_FIREBASE_PROJECT_ID then hardcoded value.',
    standalone: true,
  },

  // ── PUBLIC (NEXT_PUBLIC_ — exposed to browser bundle) ──
  {
    key: 'NEXT_PUBLIC_SITE_URL',
    category: 'public',
    description:
      'Public site URL for SEO canonical URLs, OG tags, JSON-LD. Defaults to https://angelsbeauty.com.',
    standalone: true,
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_API_KEY',
    category: 'public',
    description: 'Firebase web API key. Has hardcoded fallback.',
    standalone: true,
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    category: 'public',
    description: 'Firebase Auth domain. Has hardcoded fallback.',
    standalone: true,
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    category: 'public',
    description: 'Firebase project ID (public). Has hardcoded fallback.',
    standalone: true,
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    category: 'public',
    description: 'Firebase storage bucket. Has hardcoded fallback.',
    standalone: true,
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    category: 'public',
    description: 'Firebase FCM sender ID. Has hardcoded fallback.',
    standalone: true,
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_APP_ID',
    category: 'public',
    description: 'Firebase web app ID. Has hardcoded fallback.',
    standalone: true,
  },
] as const

/**
 * Check presence of a single env var. NEVER returns the value.
 */
function checkVar(key: string): { present: boolean; length: number } {
  const v = process.env[key]
  return { present: !!v && v.length > 0, length: v ? v.length : 0 }
}

/**
 * Get status of every tracked env var. Safe to expose — no values included.
 */
export function getEnvHealth(): EnvVarStatus[] {
  return ENV_VARS.map((spec) => ({
    ...spec,
    ...checkVar(spec.key),
  }))
}

/**
 * Group-based summary: is the payments requirement satisfied by EITHER path?
 * Path A = CLOVER_ECOM_TOKEN + CLOVER_ECOM_MERCHANT_ID
 * Path B = CLOVER_ACCESS_TOKEN + CLOVER_MERCHANT_ID (+ CLIENT_ID/SECRET for OAuth flow)
 */
export interface PaymentsHealth {
  /** Either Path A or Path B is fully configured. */
  configured: boolean
  /** Path A (Ecommerce API) is complete. */
  pathA: boolean
  /** Path B (OAuth) has at least ACCESS_TOKEN + MERCHANT_ID. */
  pathB: boolean
  /** Human-readable explanation of what's missing. */
  message: string
  /** Specific keys that are missing and blocking configuration. */
  missingKeys: string[]
}

export function getPaymentsHealth(statuses: EnvVarStatus[] = getEnvHealth()): PaymentsHealth {
  const get = (key: string) => statuses.find((s) => s.key === key)

  const ecomToken = get('CLOVER_ECOM_TOKEN')
  const ecomMerchantId = get('CLOVER_ECOM_MERCHANT_ID')
  const accessToken = get('CLOVER_ACCESS_TOKEN')
  const merchantId = get('CLOVER_MERCHANT_ID')

  const pathA = !!(ecomToken?.present && ecomMerchantId?.present)
  const pathB = !!(accessToken?.present && merchantId?.present)

  const missingKeys: string[] = []
  if (!pathA && !pathB) {
    // Report what's missing for the recommended path first
    if (ecomToken && !ecomToken.present) missingKeys.push('CLOVER_ECOM_TOKEN')
    if (ecomMerchantId && !ecomMerchantId.present) missingKeys.push('CLOVER_ECOM_MERCHANT_ID')
    if (!pathB) {
      if (accessToken && !accessToken.present) missingKeys.push('CLOVER_ACCESS_TOKEN')
      if (merchantId && !merchantId.present) missingKeys.push('CLOVER_MERCHANT_ID')
    }
  }

  let message: string
  if (pathA) {
    message = 'Clover Ecommerce API (Path A) is configured. Payments are enabled.'
  } else if (pathB) {
    message = 'Clover OAuth (Path B) is configured. Payments are enabled.'
  } else if (missingKeys.length > 0) {
    message = `Payments disabled. Missing: ${missingKeys.join(', ')}. Configure these in Admin → Settings → Clover.`
  } else {
    message = 'Payments disabled. No Clover credentials configured.'
  }

  return {
    configured: pathA || pathB,
    pathA,
    pathB,
    message,
    missingKeys,
  }
}

export interface EnvHealthReport {
  timestamp: string
  nodeEnv: string
  total: number
  present: number
  missing: number
  statuses: EnvVarStatus[]
  payments: PaymentsHealth
  /** True if any REQUIRED var is missing — app may not boot correctly. */
  critical: boolean
  /** True if payments are not configured. */
  paymentsDisabled: boolean
}

/**
 * Full health report. Safe to expose via API — no secret values included.
 */
export function getEnvHealthReport(): EnvHealthReport {
  const statuses = getEnvHealth()
  const present = statuses.filter((s) => s.present).length
  const missing = statuses.length - present
  const payments = getPaymentsHealth(statuses)
  const critical = statuses.some((s) => s.category === 'required' && !s.present)

  return {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'development',
    total: statuses.length,
    present,
    missing,
    statuses,
    payments,
    critical,
    paymentsDisabled: !payments.configured,
  }
}

/**
 * Compact one-line summary for startup logging.
 * Example: "[Env Health] 14/20 present | REQUIRED: OK | PAYMENTS: DISABLED (missing CLOVER_ECOM_TOKEN, CLOVER_ECOM_MERCHANT_ID)"
 */
export function getEnvHealthLogLine(): string {
  const r = getEnvHealthReport()
  const requiredMissing = r.statuses
    .filter((s) => s.category === 'required' && !s.present)
    .map((s) => s.key)
  const requiredStatus = requiredMissing.length === 0 ? 'OK' : `MISSING ${requiredMissing.join(',')}`
  const paymentsStatus = r.payments.configured
    ? r.payments.pathA
      ? 'ENABLED (Ecom API)'
      : 'ENABLED (OAuth)'
    : `DISABLED (missing ${r.payments.missingKeys.join(',') || 'credentials'})`
  return `[Env Health] ${r.present}/${r.total} present | REQUIRED: ${requiredStatus} | PAYMENTS: ${paymentsStatus}`
}
