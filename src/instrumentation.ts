/**
 * Next.js Instrumentation — runs once on server startup.
 *
 * Performs an environment variable health check and logs the result.
 * NEVER logs secret values — only Present/Missing status.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server, not in the edge build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getEnvHealthLogLine, getEnvHealthReport } = await import('./lib/env-health')
    const { envLocalExists } = await import('./lib/env-file')

    const report = getEnvHealthReport()
    const logLine = getEnvHealthLogLine()

    // Always log the one-line summary
    console.log(logLine)

    // Log details for any missing REQUIRED or payments vars
    const missingRequired = report.statuses.filter(
      (s) => s.category === 'required' && !s.present
    )
    const missingPayments = report.payments.missingKeys

    if (missingRequired.length > 0) {
      console.warn(
        `[Env Health] ⚠️  REQUIRED variables missing: ${missingRequired
          .map((s) => s.key)
          .join(', ')}`
      )
    }

    if (!report.payments.configured) {
      console.warn(
        `[Env Health] ⚠️  Payments DISABLED — missing: ${missingPayments.join(', ') || 'credentials'}.`
      )
      console.warn(
        `[Env Health]    Configure at: Admin → Settings → Clover Payment Configuration`
      )
    }

    if (!envLocalExists()) {
      console.warn(
        `[Env Health] ⚠️  .env.local does not exist. Copy .env.example to .env.local and fill in values.`
      )
    }

    if (report.critical) {
      console.error(
        `[Env Health] ❌ CRITICAL — required env vars missing. App may not function correctly.`
      )
    } else if (!report.payments.configured) {
      console.log(
        `[Env Health] ✅ Required vars OK — payments pending configuration.`
      )
    } else {
      console.log(`[Env Health] ✅ All systems go.`)
    }
  }
}
