import { NextResponse } from 'next/server'
import { getEnvHealthReport } from '@/lib/env-health'
import { envLocalExists } from '@/lib/env-file'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/env-health
 *
 * Returns PRESENT / MISSING status for every tracked env var.
 * NEVER exposes secret values — only key names, presence, length, and metadata.
 *
 * Used by the admin Settings page to show which vars are missing.
 */
export async function GET() {
  const report = getEnvHealthReport()

  return NextResponse.json({
    ...report,
    envLocal: {
      exists: envLocalExists(),
      path: '.env.local',
    },
  })
}
