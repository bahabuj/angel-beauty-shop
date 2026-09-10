'use client'

import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'

/**
 * Flashing Promotion Marquee Bar
 *
 * Sits just below the navbar. Shows animated promo messages scrolling
 * horizontally with a gold gradient background + subtle pulse animation.
 *
 * Reads from /api/promotions (active promotions only). If no promotions
 * exist, falls back to a generic "Free shipping over $100" message so the
 * bar always has content.
 *
 * Users can dismiss the bar (state persists in localStorage for 24h).
 */

interface Promo {
  id: string
  name: string
  type: string
  discount: number
  couponCode: string
  status: string
}

const FALLBACK_MESSAGES = [
  '✦ Free shipping on orders over $100',
  '✦ New arrivals every week',
  '✦ Premium skincare for radiant beauty',
]

const DISMISS_KEY = 'promo-bar-dismissed'
const DISMISS_TTL = 24 * 60 * 60 * 1000 // 24 hours

export default function PromoMarqueeBar() {
  const [messages, setMessages] = useState<string[]>(FALLBACK_MESSAGES)
  const [dismissed, setDismissed] = useState(false)

  // Load active promotions
  useEffect(() => {
    fetch('/api/promotions?status=active')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.success && Array.isArray(data.promotions)) {
          const promoMsgs = data.promotions
            .filter((p: Promo) => p.status === 'active')
            .map((p: Promo) => {
              if (p.type === 'percentage') return `✦ ${p.discount}% OFF — use code ${p.couponCode}`
              if (p.type === 'fixed') return `✦ $${p.discount} OFF — use code ${p.couponCode}`
              if (p.type === 'shipping') return `✦ FREE SHIPPING — use code ${p.couponCode}`
              return `✦ ${p.name} — code ${p.couponCode}`
            })
          if (promoMsgs.length > 0) {
            setMessages([...promoMsgs, ...FALLBACK_MESSAGES])
          }
        }
      })
      .catch(() => {})
  }, [])

  // Check if dismissed in the last 24h
  useEffect(() => {
    try {
      const ts = localStorage.getItem(DISMISS_KEY)
      if (ts) {
        const age = Date.now() - parseInt(ts)
        if (age < DISMISS_TTL) {
          setDismissed(true)
        } else {
          localStorage.removeItem(DISMISS_KEY)
        }
      }
    } catch {}
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
  }

  if (dismissed) return null

  // Duplicate the messages so the marquee loops seamlessly
  const loop = [...messages, ...messages, ...messages]

  return (
    <div className="relative bg-gradient-to-r from-gold via-gold-light to-gold text-white overflow-hidden">
      {/* Animated shimmer overlay */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          backgroundSize: '200% 100%',
          animation: 'promo-shimmer 3s linear infinite',
        }}
      />
      <div className="relative flex items-center">
        {/* Left badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-black/20 shrink-0 z-10">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Hot</span>
        </div>

        {/* Marquee */}
        <div className="flex-1 overflow-hidden">
          <div
            className="flex whitespace-nowrap"
            style={{
              animation: 'promo-marquee 30s linear infinite',
            }}
          >
            {loop.map((msg, i) => (
              <span
                key={i}
                className="inline-flex items-center px-6 py-2 text-xs font-semibold tracking-wide"
              >
                {msg}
              </span>
            ))}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="shrink-0 px-3 py-2 hover:bg-black/20 transition-colors z-10"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <style>{`
        @keyframes promo-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes promo-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
