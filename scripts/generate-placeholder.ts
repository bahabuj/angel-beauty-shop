/**
 * Generate public/images/products/placeholder.jpg — a 600x600 fallback image
 * used by shop-page, product-detail-page, and home-page when a product image
 * is missing or fails to load.
 *
 * Run: `bun run scripts/generate-placeholder.ts`
 *
 * Implementation:
 *  - Build an SVG with a warm cream background (#F5EFE6) and centered text
 *    "Image Coming Soon" in dark gray (#6B5B4A).
 *  - Rasterize the SVG to JPEG via sharp (sharp supports SVG input natively).
 */

import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import path from 'path'

const OUT_DIR = path.join(process.cwd(), 'public/images/products')
const OUT_FILE = path.join(OUT_DIR, 'placeholder.jpg')

const WIDTH = 600
const HEIGHT = 600

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#F5EFE6"/>
  <text x="50%" y="50%" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="36" font-weight="500" fill="#6B5B4A" text-anchor="middle" dominant-baseline="middle" letter-spacing="2">Image Coming Soon</text>
</svg>`

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  await sharp(Buffer.from(svg))
    .resize(WIDTH, HEIGHT)
    .jpeg({ quality: 90, mozjpeg: false })
    .toFile(OUT_FILE)

  console.log(`✓ ${OUT_FILE} (${WIDTH}x${HEIGHT})`)
}

main().catch((err) => {
  console.error('Placeholder generation failed:', err)
  process.exit(1)
})
