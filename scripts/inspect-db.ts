/**
 * Inspect existing tables + row counts in the Supabase DB before pushing schema.
 */
import { PrismaClient } from '@prisma/client'

const DIRECT_URL = 'postgresql://postgres.oxmwnxnnycyfaubwocws:mBzebkYGCWM2SIUW@aws-0-us-west-1.pooler.supabase.com:5432/postgres'

const prisma = new PrismaClient({
  datasources: { db: { url: DIRECT_URL } },
})

async function main() {
  // List all tables in the public schema
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `) as Array<{ table_name: string }>

  console.log(`Tables in public schema: ${tables.length}`)
  for (const t of tables) {
    const name = t.table_name
    // Count rows in each table (use ::regclass to be safe)
    try {
      const countRows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS n FROM "${name}";`
      ) as Array<{ n: number }>
      const n = countRows[0]?.n ?? 0
      console.log(`  ${name.padEnd(30)} ${n} rows`)
    } catch (e: any) {
      console.log(`  ${name.padEnd(30)} (error: ${e.message})`)
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
