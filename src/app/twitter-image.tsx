import { ImageResponse } from 'next/og'

/**
 * Twitter card image (1200x630 PNG).
 *
 * Next.js image-route handlers cannot re-export `default` from another module
 * (the route loader expects the default export to be defined in this file),
 * so this file duplicates the opengraph-image design. Kept in sync with
 * src/app/opengraph-image.tsx.
 */

export const runtime = 'edge'

export const alt = 'Angelsbeauty Premium Skincare'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default function TwitterImage() {
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
