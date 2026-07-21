import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/lib/seo'

/**
 * PWA manifest — exposed at /manifest.webmanifest.
 * Referenced by buildBaseMetadata() via metadata.manifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  const base = SITE_CONFIG.url
  return {
    name: SITE_CONFIG.name,
    short_name: SITE_CONFIG.name,
    description:
      'Premium skincare products designed to help you feel confident, radiant and beautiful.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: SITE_CONFIG.themeColor,
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'en-US',
    categories: ['beauty', 'shopping', 'health'],
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Shop Skincare',
        short_name: 'Shop',
        description: 'Browse the full Angelsbeauty skincare collection',
        url: `${base}/#shop`,
      },
      {
        name: 'About Angelsbeauty',
        short_name: 'About',
        description: 'Learn our story',
        url: `${base}/#about`,
      },
      {
        name: 'Contact Us',
        short_name: 'Contact',
        description: 'Get in touch with the Angelsbeauty team',
        url: `${base}/#contact`,
      },
    ],
  }
}
