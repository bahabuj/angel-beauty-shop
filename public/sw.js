// Angelsbeauty Service Worker
// Strategy: stale-while-revalidate for pages, cache-first for static assets.
// This makes repeat visits load instantly (from cache) while keeping content fresh.

const CACHE_VERSION = 'ab-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const PAGE_CACHE = `${CACHE_VERSION}-pages`

// Assets that should be cached aggressively (cache-first, long TTL)
const STATIC_PATTERNS = [
  /\/_next\/static\//,
  /\/_next\/image\//,
  /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|eot|css|js)$/i,
  /\/images\//,
  /\/products\//,
  /\/uploads\//,
  /\/fonts\//,
]

// Never cache these
const NEVER_CACHE = [
  /\/api\/clover\//,
  /\/api\/orders/,
  /\/api\/auth\//,
  /\/oauth\//,
  /\/angelsbeauty-admin/,
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      // Pre-cache the most critical assets
      cache.addAll([
        '/',
        '/images/hero/hero-1.png',
        '/images/hero/hero-2.png',
        '/images/hero/hero-3.png',
        '/images/logo.png',
      ]).catch(() => {}) // ignore failures — they'll be cached on demand
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle GET
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return

  // Skip never-cache patterns
  if (NEVER_CACHE.some((p) => p.test(url.pathname))) return

  // Skip Next.js HMR / dev websocket
  if (url.pathname.startsWith('/_next/webpack-hmr')) return

  const isStatic = STATIC_PATTERNS.some((p) => p.test(url.pathname))

  if (isStatic) {
    // Cache-first for static assets (they're hashed, so safe to cache forever)
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Revalidate in background
          fetch(request).then((res) => {
            if (res.ok) {
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, res.clone()))
            }
          }).catch(() => {})
          return cached
        }
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // Stale-while-revalidate for navigation (HTML pages)
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone()
              caches.open(PAGE_CACHE).then((cache) => cache.put(request, clone))
            }
            return res
          })
          .catch(() => cached) // offline fallback

        // Return cache immediately if available, otherwise wait for network
        return cached || fetchPromise
      })
    )
    return
  }

  // Network-first for API (with cache fallback for /api/home-data)
  if (url.pathname.startsWith('/api/home-data')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone()
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
            }
            return res
          })
          .catch(() => cached)
        return cached || fetchPromise
      })
    )
  }
})
