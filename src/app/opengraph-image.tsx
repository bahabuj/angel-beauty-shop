import { ImageResponse } from 'next/og'

/**
 * Dynamic OpenGraph image (1200x630 PNG).
 * Served at /opengraph-image by Next.js's metadata file convention.
 *
 * Design:
 *  - Dark gradient background (#1a1a1a → #2d2418)
 *  - Gold circle (#C9A86A, 28px) as the brand mark — drawn with CSS, NOT the
 *    ✦ glyph (Satori can't render that Unicode symbol reliably)
 *  - "Angelsbeauty" wordmark in serif
 *  - "Premium Skincare for Radiant Skin" tagline below in gold
 *
 * Satori notes:
 *  - All layout uses flexbox (no display:inline-block — Satori doesn't support it)
 *  - No external font fetches — falls back to Satori's built-in default
 */

export const runtime = 'edge'

export const alt = 'Angelsbeauty Premium Skincare'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2418 100%)',
          padding: 80,
        }}
      >
        {/* Brand row: gold circle + wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 28,
          }}
        >
          {/* Gold brand mark — CSS-drawn circle (NOT ✦ glyph) */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#C9A86A',
              display: 'flex',
            }}
          />
          <div
            style={{
              display: 'flex',
              fontSize: 96,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-2px',
              fontFamily: 'serif',
            }}
          >
            Angelsbeauty
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            marginTop: 36,
            fontSize: 36,
            color: '#C9A86A',
            letterSpacing: '1px',
          }}
        >
          Premium Skincare for Radiant Skin
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
