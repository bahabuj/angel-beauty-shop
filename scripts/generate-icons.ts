/**
 * Generate favicon.ico, icon.png, and apple-icon.png from public/images/logo.png
 * using the `sharp` package (already installed as a project dependency).
 *
 * Run: `bun run scripts/generate-icons.ts`
 *
 * Notes:
 *  - favicon.ico: sharp can't write true ICO format, so we write a 32x32 PNG
 *    with the .ico extension. All modern browsers (Chrome, Firefox, Safari,
 *    Edge) accept PNG-formatted .ico files.
 *  - icon.png: 512x512 (Android/PWA standard).
 *  - apple-icon.png: 180x180 (Apple touch icon standard).
 *  - Transparent background preserved (fit: contain).
 */

import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import path from 'path'

const SRC = path.join(process.cwd(), 'public/images/logo.png')
const OUT_DIR = path.join(process.cwd(), 'public')

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const transparentBg = { r: 255, g: 255, b: 255, alpha: 0 }

  // favicon.ico — 32x32 PNG written with .ico extension
  await sharp(SRC)
    .resize(32, 32, { fit: 'contain', background: transparentBg })
    .png()
    .toFile(path.join(OUT_DIR, 'favicon.ico'))
  console.log('✓ public/favicon.ico (32x32)')

  // icon.png — 512x512
  await sharp(SRC)
    .resize(512, 512, { fit: 'contain', background: transparentBg })
    .png()
    .toFile(path.join(OUT_DIR, 'icon.png'))
  console.log('✓ public/icon.png (512x512)')

  // apple-icon.png — 180x180
  await sharp(SRC)
    .resize(180, 180, { fit: 'contain', background: transparentBg })
    .png()
    .toFile(path.join(OUT_DIR, 'apple-icon.png'))
  console.log('✓ public/apple-icon.png (180x180)')

  console.log('\nAll icons generated successfully.')
}

main().catch((err) => {
  console.error('Icon generation failed:', err)
  process.exit(1)
})
