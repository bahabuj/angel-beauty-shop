import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the public-facing site URL.
 *
 * IMPORTANT: Inside the Next.js server, `request.url` resolves to
 * `http://localhost:3000` because Caddy proxies the request. We must
 * use the SITE_URL env var to produce correct redirect URLs for
 * external services (Clover OAuth, payment return URLs, webhooks, etc).
 *
 * Falls back to `request.url` origin only if SITE_URL is not set.
 */
export function getSiteUrl(fallbackOrigin?: string): string {
  return process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || fallbackOrigin || 'http://localhost:3000'
}
