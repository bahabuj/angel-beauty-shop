/**
 * Remove mockup/seed products from the database.
 *
 * Identifies mockups by: image URLs that start with "/images/products/"
 * (local placeholder images bundled with the repo). Real products uploaded
 * via the admin panel use Cloudinary URLs (https://res.cloudinary.com/...).
 *
 * Idempotent + safe: only deletes products with local placeholder images.
 * Real products with Cloudinary URLs are never touched.
 *
 * Run with: env -u DATABASE_URL -u DIRECT_URL npx tsx scripts/remove-mockup-products.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const all = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, images: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Total products in DB: ${all.length}`)
  console.log('')

  const mockups: typeof all = []
  const real: typeof all = []

  for (const p of all) {
    let images: string[] = []
    try { images = JSON.parse(p.images || '[]') } catch { images = [] }
    const firstImage = images[0] || ''
    // Mockups use local placeholder images under /images/products/
    const isMockup = firstImage.startsWith('/images/products/')
    if (isMockup) {
      mockups.push(p)
    } else {
      real.push(p)
    }
  }

  console.log(`Mockup products to delete: ${mockups.length}`)
  for (const p of mockups) {
    let img = ''
    try { img = JSON.parse(p.images || '[]')[0] || '' } catch {}
    console.log(`  [DELETE]  ${p.name.padEnd(40)}  ${img}`)
  }
  console.log('')
  console.log(`Real products to KEEP: ${real.length}`)
  for (const p of real) {
    let img = ''
    try { img = JSON.parse(p.images || '[]')[0] || '' } catch {}
    console.log(`  [KEEP]    ${p.name.padEnd(40)}  ${img.substring(0, 70)}`)
  }
  console.log('')

  if (mockups.length === 0) {
    console.log('No mockup products found. Nothing to delete.')
    return
  }

  // Delete mockups (variants cascade-delete via the schema relation)
  const ids = mockups.map((p) => p.id)
  const result = await prisma.product.deleteMany({ where: { id: { in: ids } } })
  console.log(`✅ Deleted ${result.count} mockup products.`)

  // Verify
  const remaining = await prisma.product.count()
  console.log(`Remaining products in DB: ${remaining}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
