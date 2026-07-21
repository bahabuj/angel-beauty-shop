// ─── DB-Backed Settings Store ──────────────────────────────────────────────
//
// PURPOSE: Provide a persistent fallback for environment variables so that
// when the sandbox wipes `.env.local` (which happens periodically), the app
// can still read critical credentials (like Clover payment tokens) from the
// SQLite database — which DOES persist across sandbox resets.
//
// ARCHITECTURE:
//   - `getAllSettings()`  — async, reads ALL rows from the Setting table
//   - `getCachedSetting()` — SYNC, reads from the in-memory cache (fast path)
//   - `primeSettingsCache()` — async, populates the cache from the DB; call
//     this at the start of any request handler that needs credentials
//   - `setSetting()` / `setSettings()` — async, writes to DB AND updates cache
//
// The cache has a 30-second TTL. After 30s, the next `getCachedSetting()`
// call returns null, signaling the caller to re-prime. For request-scoped
// usage, always call `await primeSettingsCache()` at the top of the handler
// to guarantee fresh data.
//
// AUTO-SEED: On module load, if the Setting table is empty, we seed it with
// the known production Clover credentials. This ensures that even a complete
// DB reset (which is rare — the DB normally persists) would be recoverable.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'

// ─── Auto-seed defaults (no real secrets — configure via .env.local or Admin UI) ─
// On first load, if the Setting table is empty, we seed it with these DEFAULT
// (non-secret) values so the app boots cleanly. Real Clover credentials MUST
// be configured via .env.local (copy from .env.example) or via the Admin UI
// (Settings → Clover Payment Configuration) after deployment.
//
// To restore the auto-seed-with-real-credentials behavior, populate the values
// below from your Clover Dashboard → Ecommerce → API Tokens. Leaving them empty
// is the secure default for exported/migrated copies of this project.
const SEED_CREDENTIALS: Record<string, string> = {
  CLOVER_ECOM_TOKEN: '',
  CLOVER_ECOM_MERCHANT_ID: '',
  CLOVER_ENVIRONMENT: 'sandbox',
  CLOVER_DEBUG: 'false',
}

// ─── In-memory cache ────────────────────────────────────────────────────────
let cache: Map<string, string> | null = null
let cachePrimedAt = 0
const CACHE_TTL_MS = 30_000 // 30 seconds

// ─── Track whether we've attempted the auto-seed ────────────────────────────
// We only attempt the seed once per process lifetime to avoid repeated DB
// writes on every request.
let seedAttempted = false

// ─── Prime the cache from the DB ────────────────────────────────────────────
// Reads all Setting rows into the in-memory cache. If the table is empty and
// we haven't seeded yet, seeds it with the known production credentials first.
export async function primeSettingsCache(): Promise<void> {
  try {
    // ─── Auto-seed if empty (first call only) ───────────────────────────
    if (!seedAttempted) {
      seedAttempted = true
      try {
        const count = await db.setting.count()
        if (count === 0) {
          console.log('[Settings] Setting table is empty — seeding known production credentials')
          await db.setting.createMany({
            data: Object.entries(SEED_CREDENTIALS).map(([key, value]) => ({ key, value })),
          })
          console.log(`[Settings] Seeded ${Object.keys(SEED_CREDENTIALS).length} credentials into Setting table`)
        }
      } catch (seedError) {
        console.error('[Settings] Auto-seed failed (non-fatal):', seedError)
        // Continue — the cache will just be empty, and env vars may still work
      }
    }

    // ─── Load all settings into cache ──────────────────────────────────
    const rows = await db.setting.findMany()
    cache = new Map(rows.map(r => [r.key, r.value]))
    cachePrimedAt = Date.now()
  } catch (error) {
    console.error('[Settings] primeSettingsCache failed:', error)
    // On failure, set an empty cache so we don't keep retrying on every call
    cache = new Map()
    cachePrimedAt = Date.now()
  }
}

// ─── Get a setting from the cache (SYNC) ────────────────────────────────────
// Returns the cached value, or null if:
//   - The cache hasn't been primed
//   - The cache has expired (TTL exceeded)
//   - The key doesn't exist in the cache
// Callers should call `await primeSettingsCache()` at the start of their
// request handler to ensure the cache is fresh before calling this.
export function getCachedSetting(key: string): string | null {
  if (!cache || Date.now() - cachePrimedAt > CACHE_TTL_MS) {
    return null
  }
  const val = cache.get(key)
  return val ?? null
}

// ─── Get all settings (async, always fresh from DB) ─────────────────────────
export async function getAllSettings(): Promise<Record<string, string>> {
  try {
    const rows = await db.setting.findMany()
    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.key] = row.value
    }
    return result
  } catch (error) {
    console.error('[Settings] getAllSettings failed:', error)
    return {}
  }
}

// ─── Set a single setting (writes to DB + updates cache) ────────────────────
export async function setSetting(key: string, value: string): Promise<void> {
  try {
    await db.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
    // Update the cache immediately so the new value is visible to
    // getCachedSetting() without waiting for the next prime.
    if (cache) {
      cache.set(key, value)
    }
  } catch (error) {
    console.error(`[Settings] setSetting(${key}) failed:`, error)
    throw error
  }
}

// ─── Set multiple settings atomically (writes to DB + updates cache) ────────
export async function setSettings(entries: Record<string, string>): Promise<void> {
  try {
    await db.$transaction(
      Object.entries(entries).map(([key, value]) =>
        db.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        })
      )
    )
    // Update the cache
    if (cache) {
      for (const [key, value] of Object.entries(entries)) {
        cache.set(key, value)
      }
    }
  } catch (error) {
    console.error('[Settings] setSettings failed:', error)
    throw error
  }
}

// ─── Check which keys are present in the DB ─────────────────────────────────
export async function getSettingKeysPresent(keys: string[]): Promise<Record<string, boolean>> {
  try {
    const rows = await db.setting.findMany({
      where: { key: { in: keys } },
      select: { key: true },
    })
    const present = new Set(rows.map(r => r.key))
    const result: Record<string, boolean> = {}
    for (const k of keys) {
      result[k] = present.has(k)
    }
    return result
  } catch (error) {
    console.error('[Settings] getSettingKeysPresent failed:', error)
    const result: Record<string, boolean> = {}
    for (const k of keys) {
      result[k] = false
    }
    return result
  }
}
