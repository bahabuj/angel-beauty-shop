import { NextRequest, NextResponse } from 'next/server'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { Readable } from 'stream'

// ─── Database Backup Download ─────────────────────────────────────────────
// Streams the production database backup files.
//
// Supports two formats via the ?format= query parameter:
//   - format=binary (default) → angelsbeauty-production-backup.db (SQLite binary)
//   - format=sql              → angelsbeauty-production-backup.sql (SQL dump)
//
// ⚠️ SECURITY: These backups contain REAL production secrets:
//   - The Setting table has live Clover Ecommerce API credentials
//   - The User table has bcrypt-hashed passwords
// Do NOT expose this route in production. Remove it after migration.
//
// NOTE: Reads from absolute sandbox paths. Update or remove after Trae migration.
//
// STREAMING: Uses `Readable.toWeb()` for proper backpressure handling. See
// /api/download/project/route.ts for full rationale.

const BACKUP_DIR = '/home/z/angelsbeauty-backup'
const FILES = {
  binary: {
    path: `${BACKUP_DIR}/angelsbeauty-production-backup.db`,
    filename: 'angelsbeauty-production-backup.db',
    contentType: 'application/octet-stream',
    description: 'SQLite binary backup',
  },
  sql: {
    path: `${BACKUP_DIR}/angelsbeauty-production-backup.sql`,
    filename: 'angelsbeauty-production-backup.sql',
    contentType: 'application/sql',
    description: 'SQL dump',
  },
} as const

type Format = keyof typeof FILES

export async function GET(req: NextRequest) {
  try {
    // Parse the format from query string
    const formatParam = req.nextUrl.searchParams.get('format') || 'binary'
    const format: Format = formatParam === 'sql' ? 'sql' : 'binary'
    const fileConfig = FILES[format]

    // Verify the file exists
    let stats
    try {
      stats = await stat(fileConfig.path)
    } catch {
      return NextResponse.json(
        {
          error: `${fileConfig.description} not found`,
          details: `Expected at: ${fileConfig.path}`,
          hint: 'Run the database backup process first.',
        },
        { status: 404 }
      )
    }

    if (!stats.isFile()) {
      return NextResponse.json(
        { error: `${fileConfig.description} path is not a file` },
        { status: 500 }
      )
    }

    // Stream the file with proper backpressure via Readable.toWeb()
    const nodeStream = createReadStream(fileConfig.path, {
      highWaterMark: 64 * 1024, // 64 KB chunks (backups are small)
      autoClose: true,
    })

    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': fileConfig.contentType,
        'Content-Disposition': `attachment; filename="${fileConfig.filename}"`,
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('[download/database] Error:', err)
    return NextResponse.json(
      { error: 'Download failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
