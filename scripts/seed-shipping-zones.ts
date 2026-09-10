/**
 * Seed the 11 default shipping zones for Angels Beauty.
 * Idempotent: uses upsert so re-running won't duplicate.
 *
 * Run with: npx tsx /home/z/my-project/angel-beauty-shop/scripts/seed-shipping-zones.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_ZONES = [
  { name: 'United States',          code: 'US',  flag: '🇺🇸', rate: 15.00, estimatedDays: '3-5 business days',  order: 10 },
  { name: 'Canada',                 code: 'CA',  flag: '🇨🇦', rate: 22.00, estimatedDays: '5-7 business days',  order: 20 },
  { name: 'Mexico',                 code: 'MX',  flag: '🇲🇽', rate: 25.00, estimatedDays: '5-7 business days',  order: 30 },
  { name: 'UK & Ireland',           code: 'UK',  flag: '🇬🇧', rate: 35.00, estimatedDays: '7-10 business days', order: 40 },
  { name: 'Europe',                 code: 'EU',  flag: '🇪🇺', rate: 38.00, estimatedDays: '7-12 business days', order: 50 },
  { name: 'Africa',                 code: 'AF',  flag: '🌍', rate: 45.00, estimatedDays: '10-15 business days',order: 60 },
  { name: 'Asia',                   code: 'AS',  flag: '🌏', rate: 42.00, estimatedDays: '10-15 business days',order: 70 },
  { name: 'Australia/New Zealand',  code: 'AU',  flag: '🇦🇺', rate: 48.00, estimatedDays: '10-15 business days',order: 80 },
  { name: 'South America',          code: 'SA',  flag: '🌎', rate: 40.00, estimatedDays: '10-15 business days',order: 90 },
  { name: 'Middle East',            code: 'ME',  flag: '🌍', rate: 38.00, estimatedDays: '7-12 business days', order: 100 },
  { name: 'Other',                  code: 'OTH', flag: '🌐', rate: 50.00, estimatedDays: '15-21 business days',order: 110 },
]

async function main() {
  console.log(`Seeding ${DEFAULT_ZONES.length} shipping zones...`)
  let created = 0, updated = 0
  for (const z of DEFAULT_ZONES) {
    const existing = await prisma.shippingZone.findUnique({ where: { code: z.code } })
    if (existing) {
      await prisma.shippingZone.update({
        where: { code: z.code },
        data: {
          name: z.name,
          flag: z.flag,
          estimatedDays: z.estimatedDays,
          order: z.order,
          // Don't overwrite rate if admin already set one
        },
      })
      updated++
      console.log(`  [updated] ${z.flag} ${z.name} (rate kept at $${existing.rate})`)
    } else {
      await prisma.shippingZone.create({
        data: {
          name: z.name,
          code: z.code,
          flag: z.flag,
          rate: z.rate,
          estimatedDays: z.estimatedDays,
          active: true,
          order: z.order,
        },
      })
      created++
      console.log(`  [created] ${z.flag} ${z.name} ($${z.rate})`)
    }
  }
  console.log('')
  console.log(`Done. Created: ${created} | Updated: ${updated}`)

  const all = await prisma.shippingZone.findMany({ orderBy: { order: 'asc' } })
  console.log(`Total shipping zones in DB: ${all.length}`)
  for (const z of all) {
    console.log(`  ${String(z.order).padStart(3)} | ${z.flag} ${z.name.padEnd(22)} | $${z.rate.toFixed(2)} | ${z.active ? 'active' : 'inactive'}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
