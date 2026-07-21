/**
 * SQLite → PostgreSQL one-time data migration.
 *
 * Reads every row from the legacy SQLite database (db/custom.db.sqlite-backup)
 * and inserts it into the Postgres database referenced by DATABASE_URL.
 *
 * Usage:
 *   bun run scripts/migrate-sqlite-to-postgres.ts
 *
 * Idempotent-ish: truncates target tables before inserting (safe to re-run).
 * Preserves original IDs and all field values verbatim (no type coercion)
 * so production displays exactly the same data as local did.
 */
import { Database } from 'bun:sqlite';
import { PrismaClient } from '@prisma/client';
import { resolve } from 'node:path';

const SQLITE_PATH = resolve(process.cwd(), 'db/custom.db.sqlite-backup');
const pg = new PrismaClient();

const TABLES = [
  'User',
  'Category',
  'Product',
  'ProductVariant',
  'Order',
  'NewsletterSubscriber',
  'PromoBanner',
  'AuthSlide',
  'HeroSlide',
  'Partner',
  'AnnouncementItem',
  'Transformation',
  'InspirationItem',
  'Setting',
] as const;

function openSqlite(): Database {
  return new Database(SQLITE_PATH, { readonly: true });
}

function rowsOf(sqlite: Database, table: string): Record<string, unknown>[] {
  const stmt = sqlite.prepare(`SELECT * FROM "${table}"`);
  return stmt.all() as Record<string, unknown>[];
}

const BOOL_FIELDS = new Set([
  'active','featured','newArrival','bestSeller','freeShipping',
  'kenBurns','emailVerified','invoiceSent',
]);
const DATE_FIELDS = new Set([
  'emailVerified','createdAt','updatedAt',
]);

function coerce(value: unknown, fieldName: string): unknown {
  if (value === null || value === undefined) return null;
  if (DATE_FIELDS.has(fieldName)) {
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
      const n = Number(value);
      return Number.isFinite(n) && /^\d+$/.test(value) ? new Date(n) : new Date(value);
    }
    return value;
  }
  if (typeof value === 'number' && (value === 0 || value === 1) && BOOL_FIELDS.has(fieldName)) {
    return value === 1;
  }
  return value;
}

async function migrate() {
  console.log(`[migrate] Source SQLite: ${SQLITE_PATH}`);
  console.log(`[migrate] Target Postgres: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@')}`);

  const sqlite = openSqlite();
  let totalRows = 0;

  console.log('[migrate] Truncating target tables ...');
  await pg.$transaction(
    [...TABLES].reverse().map((t) => pg.$executeRawUnsafe(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE;`))
  );

  for (const table of TABLES) {
    const rows = rowsOf(sqlite, table);
    if (rows.length === 0) {
      console.log(`  ${table}: 0 rows (skipped)`);
      continue;
    }

    const delegate = (pg as unknown as Record<string, {
      createMany: (args: { data: unknown[] }) => Promise<{ count: number }>;
    }>)[table];

    const data = rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) out[k] = coerce(v, k);
      return out;
    });

    const result = await delegate.createMany({ data });
    totalRows += result.count;
    console.log(`  ${table}: ${result.count} rows inserted`);
  }

  sqlite.close();
  console.log(`[migrate] ✅ Done. Total rows migrated: ${totalRows}`);
}

migrate()
  .then(() => pg.$disconnect())
  .catch(async (e) => {
    console.error('[migrate] ❌ Failed:', e);
    await pg.$disconnect();
    process.exit(1);
  });
