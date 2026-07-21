'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker for permanent client-side caching.
 * On repeat visits, the entire site loads instantly from cache.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    // Only register in production-like contexts to avoid caching dev HMR
    if (process.env.NODE_ENV !== 'production') return

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          // Silently fail — SW is a progressive enhancement
          console.warn('[SW] registration failed:', err)
        })
    }

    // Register after window load so it doesn't compete with initial render
    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}
