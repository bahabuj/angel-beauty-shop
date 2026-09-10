/**
 * Add the user's full category list to the angel-beauty-shop DB.
 * Idempotent: uses upsert so re-running won't duplicate or error.
 *
 * This file lives OUTSIDE the repo (in /home/z/my-project/scripts/) so it
 * survives sandbox resets. The bootstrap script copies it into the repo's
 * scripts/ dir before running it with tsx.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
}

interface CatInput { name: string; description: string; order: number }

const MAIN: CatInput[] = [
  { name: 'Face Cream', description: 'Daily face creams for hydration, repair, and anti-aging.', order: 10 },
  { name: 'Lotion', description: 'Body and hand lotions for soft, smooth, moisturized skin.', order: 20 },
  { name: 'Scrubs', description: 'Exfoliating body and face scrubs for renewed radiance.', order: 30 },
  { name: 'Soap and Cleansers', description: 'Soaps, cleansing gels, and foaming washes for clean, fresh skin.', order: 40 },
  { name: 'Masks', description: 'Treatment masks for deep cleansing, hydration, and brightening.', order: 50 },
  { name: 'Body Oils', description: 'Nourishing body oils for silky, glowing skin.', order: 60 },
  { name: 'Serums', description: 'Concentrated serums for targeted skincare concerns.', order: 70 },
  { name: 'Toners', description: 'Balancing toners to prep skin for the rest of your routine.', order: 80 },
  { name: 'Sunscreen', description: 'Broad-spectrum SPF protection for every skin type.', order: 90 },
]
const BUNDLES: CatInput[] = [
  { name: 'Acne Bundle', description: 'Complete acne-fighting routine: cleanse, treat, hydrate, protect.', order: 110 },
  { name: 'Brightening Glow', description: 'Bundle for a brighter, more radiant complexion.', order: 120 },
  { name: 'Caramel Lush', description: 'Rich, warm-toned hydration bundle for luminous skin.', order: 130 },
  { name: 'Lavishing Light', description: 'Lightweight daily luxury bundle for everyday radiance.', order: 140 },
  { name: 'Whitening Lust', description: 'Brightening and whitening bundle for an even, luminous tone.', order: 150 },
  { name: 'Luxury Snow White', description: 'Premium whitening bundle for visible radiance and clarity.', order: 160 },
]
const COLLECTIONS: CatInput[] = [
  { name: 'Tumeric Glow Collection', description: 'Turmeric-infused collection for natural glow and even skin tone.', order: 210 },
]
const ALL = [...MAIN, ...BUNDLES, ...COLLECTIONS]

async function main() {
  console.log(`Adding ${ALL.length} categories...`)
  let created = 0, updated = 0
  for (const c of ALL) {
    const slug = slugify(c.name)
    const existing = await prisma.category.findUnique({ where: { slug } })
    if (existing) {
      await prisma.category.update({
        where: { slug },
        data: { description: existing.description ?? c.description, order: existing.order || c.order, active: true },
      })
      updated++
    } else {
      await prisma.category.create({ data: { name: c.name, slug, description: c.description, order: c.order, active: true } })
      created++
    }
  }
  console.log(`Done. Created: ${created} | Updated: ${updated}`)
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })
