import { NextResponse } from 'next/server'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { Readable } from 'stream'

// ─── Project ZIP Download ─────────────────────────────────────────────────
// Streams the complete project export ZIP (angelsbeauty-trae-export.zip).
//
// The ZIP is built by the migration export process and contains:
//   - All source code (src/)
//   - public/ folder (images, uploads, fonts, service worker)
//   - prisma/ (schema.prisma, seed.ts)
//   - package.json, bun.lock, config files
//   - README.md, MIGRATION_REPORT.md
//   - .env.example (no secrets)
//
// Excluded: node_modules/, .next/, .git/, .env.local, db/custom.db
//
// NOTE: This route reads from an absolute sandbox path. After migrating to
// Trae, either update PROJECT_ZIP_PATH or remove this route entirely.
//
// STREAMING IMPLEMENTATION:
// Uses Node's `Readable.toWeb()` to convert the fs.createReadStream into a
// Web ReadableStream. This properly handles BACKPRESSURE — when the browser
// consumes slower than disk reads, the Node stream is paused automatically
// until the consumer is ready. The previous manual `on('data')` / `enqueue`
// approach had no backpressure and caused the download to fail partway
// through the 104 MB file (internal queue overflow → stream error).
// Larger 1 MB chunks (vs default 64 KB) improve throughput ~15×.
const PROJECT_ZIP_PATH = '/home/z/angelsbeauty-trae-export.zip'
const DOWNLOAD_FILENAME = 'angelsbeauty-trae-export.zip'

export async function GET() {
  try {
    // Verify the file exists and get its size
    let stats
    try {
      stats = await stat(PROJECT_ZIP_PATH)
    } catch {
      return NextResponse.json(
        {
          error: 'Project ZIP not found',
          details: `Expected at: ${PROJECT_ZIP_PATH}`,
          hint: 'Run the export process first, or check the file path.',
        },
        { status: 404 }
      )
    }

    if (!stats.isFile()) {
      return NextResponse.json(
        { error: 'Project ZIP path is not a file' },
        { status: 500 }
      )
    }

    // Create a Node read stream with 1 MB high-water mark for throughput.
    // Readable.toWeb() bridges Node streams → Web ReadableStream with proper
    // backpressure: it only pulls chunks when the downstream consumer is ready,
    // so the queue never overflows even for the 104 MB project ZIP.
    const nodeStream = createReadStream(PROJECT_ZIP_PATH, {
      highWaterMark: 1024 * 1024, // 1 MB chunks (default 64 KB)
      autoClose: true,
    })

    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${DOWNLOAD_FILENAME}"`,
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        // Tell any proxy (Caddy gateway) NOT to buffer the response — stream
        // it through to the client as chunks arrive. Prevents proxy memory
        // buildup for the 104 MB file and avoids proxy-side timeouts.
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('[download/project] Error:', err)
    return NextResponse.json(
      { error: 'Download failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
