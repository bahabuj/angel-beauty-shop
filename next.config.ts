import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  compress: false,
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
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable HMR polling fallback to prevent full page reloads
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000, // Poll every 1s instead of aggressively
      }
    }
    return config
  },
};

export default nextConfig;
