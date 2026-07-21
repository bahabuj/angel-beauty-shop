/**
 * Atomic .env.local writer
 *
 * Guarantees:
 *   - NEVER overwrites or deletes an existing .env.local file
 *   - Preserves all existing keys, comments, blank lines, and ordering
 *   - Only updates the specified keys (or appends them if absent)
 *   - Writes to a temp file then renames (atomic on same filesystem)
 *   - Preserves file permissions of an existing file
 *
 * If the file does not exist, it is created with mode 0600 (owner read/write only).
 */

import { readFileSync, writeFileSync, renameSync, existsSync, statSync, chmodSync, unlinkSync } from 'fs'
import { join } from 'path'

const ENV_LOCAL_PATH = join(process.cwd(), '.env.local')

/**
 * Parse .env.local into lines, preserving structure.
 * Returns array of { type, key, value, raw } for each line.
 */
function parseEnvFile(content: string): Array<
  | { type: 'comment' | 'blank'; raw: string }
  | { type: 'kv'; key: string; value: string; raw: string }
> {
  return content.split('\n').map((line) => {
    if (line.trim() === '') return { type: 'blank' as const, raw: line }
    if (line.trim().startsWith('#')) return { type: 'comment' as const, raw: line }

    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) return { type: 'comment' as const, raw: line }

    const key = line.slice(0, eqIdx).trim()
    let value = line.slice(eqIdx + 1)
    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    return { type: 'kv' as const, key, value, raw: line }
  })
}

/**
 * Quote a value for .env.local. Uses double quotes if the value contains
 * spaces, #, or special chars. Otherwise writes bare.
 */
function formatValue(value: string): string {
  if (value === '') return ''
  if (/[\s#"'$`\\]/.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return value
}

/**
 * Update specific keys in .env.local without touching anything else.
 *
 * @param updates  Map of { KEY: value }. Keys with empty string values are written as empty.
 * @returns object describing what happened (for API response / logging)
 */
export function updateEnvLocal(updates: Record<string, string>): {
  ok: boolean
  path: string
  created: boolean
  updatedKeys: string[]
  addedKeys: string[]
  totalLinesBefore: number
  totalLinesAfter: number
  error?: string
} {
  const existed = existsSync(ENV_LOCAL_PATH)
  let content = ''
  let lines: ReturnType<typeof parseEnvFile> = []

  if (existed) {
    try {
      content = readFileSync(ENV_LOCAL_PATH, 'utf-8')
      lines = parseEnvFile(content)
    } catch (err) {
      return {
        ok: false,
        path: ENV_LOCAL_PATH,
        created: false,
        updatedKeys: [],
        addedKeys: [],
        totalLinesBefore: 0,
        totalLinesAfter: 0,
        error: `Failed to read existing .env.local: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }

  const totalLinesBefore = lines.length
  const updatedKeys: string[] = []
  const addedKeys: string[] = []

  // Update existing keys
  for (const line of lines) {
    if (line.type !== 'kv') continue
    if (updates.hasOwnProperty(line.key)) {
      const newVal = updates[line.key]
      line.raw = `${line.key}=${formatValue(newVal)}`
      updatedKeys.push(line.key)
    }
  }

  // Add new keys (those not found in existing file)
  for (const [key, value] of Object.entries(updates)) {
    if (!updatedKeys.includes(key)) {
      // Try to insert after the last existing CLOVER_ or matching prefix key, else append
      let insertAt = lines.length
      const prefix = key.split('_')[0] // e.g. "CLOVER" or "NEXT"
      for (let i = lines.length - 1; i >= 0; i--) {
        const l = lines[i]
        if (l.type === 'kv' && l.key.startsWith(prefix)) {
          insertAt = i + 1
          break
        }
      }
      lines.splice(insertAt, 0, {
        type: 'kv',
        key,
        value,
        raw: `${key}=${formatValue(value)}`,
      })
      addedKeys.push(key)
    }
  }

  const joined = lines.map((l) => l.raw).join('\n')
  const newContent = joined.endsWith('\n') ? joined : joined + '\n'
  const totalLinesAfter = lines.length

  // Atomic write: write to temp file, then rename
  const tmpPath = ENV_LOCAL_PATH + '.tmp.' + process.pid
  try {
    writeFileSync(tmpPath, newContent, { mode: 0o600 })

    // Preserve permissions of original file if it existed
    if (existed) {
      try {
        const oldStat = statSync(ENV_LOCAL_PATH)
        chmodSync(tmpPath, oldStat.mode)
      } catch {
        // ignore chmod errors — not critical
      }
    }

    renameSync(tmpPath, ENV_LOCAL_PATH)

    return {
      ok: true,
      path: ENV_LOCAL_PATH,
      created: !existed,
      updatedKeys,
      addedKeys,
      totalLinesBefore,
      totalLinesAfter,
    }
  } catch (err) {
    // Clean up temp file if rename failed
    try {
      if (existsSync(tmpPath)) {
        unlinkSync(tmpPath)
      }
    } catch {}
    return {
      ok: false,
      path: ENV_LOCAL_PATH,
      created: false,
      updatedKeys,
      addedKeys,
      totalLinesBefore,
      totalLinesAfter,
      error: `Failed to write .env.local: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * Read .env.local and return which keys are present (for verification after write).
 * NEVER returns values — only presence.
 */
export function readEnvLocalKeys(keys: string[]): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  for (const k of keys) result[k] = false

  if (!existsSync(ENV_LOCAL_PATH)) return result

  try {
    const content = readFileSync(ENV_LOCAL_PATH, 'utf-8')
    const lines = parseEnvFile(content)
    for (const line of lines) {
      if (line.type === 'kv' && keys.includes(line.key)) {
        result[line.key] = line.value.length > 0
      }
    }
  } catch {
    // ignore — return all-false
  }

  return result
}

/**
 * Does .env.local exist? (For diagnostics — never exposes content.)
 */
export function envLocalExists(): boolean {
  return existsSync(ENV_LOCAL_PATH)
}
