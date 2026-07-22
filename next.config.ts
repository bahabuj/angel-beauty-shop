import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Disable Fast Refresh fallback to full page reload
  // This prevents HMR websocket failures from causing infinite reload loops
  devIndicators: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Cache optimized images for 1 hour (default 60s). Combined with the
    // immutable Cache-Control headers on /uploads etc., repeat navigations
    // serve optimized images instantly from browser cache.
    minimumCacheTTL: 3600,
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  // Long-cache immutable static assets (images, videos, uploads).
  // Files use timestamped names so they never change — browsers + CDNs can
  // cache for a year, eliminating repeat downloads on navigation.
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/hero/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/products/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
  // ─── Next.js 16 Turbopack ────────────────────────────────────────────────────
  // Next.js 16 enables Turbopack by default for both dev and build. The
  // previous webpack() customization (HMR polling for the sandbox dev server)
  // is no longer needed in production. Declaring an empty `turbopack` config
  // silences the "webpack config without turbopack config" error.
  turbopack: {},
  // ─── Vercel-friendly serverless settings ────────────────────────────────────
  // Prisma client needs to be bundled for serverless. This is the default in
  // Next 16 but explicit here for clarity.
  outputFileTracingIncludes: {
    '/': ['./node_modules/@prisma/client/**', './prisma/**'],
  },
};

export default nextConfig;
