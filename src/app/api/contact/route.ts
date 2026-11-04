import { NextRequest, NextResponse } from 'next/server'
import { sendContactForm } from '@/lib/email'

// ─── POST /api/contact ───────────────────────────────────────────────────
// Receives contact form submissions, validates input, applies rate limiting
// and spam protection, then forwards to the support inbox via Resend.
//
// Security:
//   - Input validation (all fields required, max lengths enforced)
//   - Rate limiting via in-memory IP tracking (5 requests per 10 minutes)
//   - Spam protection: honeypot field + known spam keyword detection
//   - Email address validation (basic format check)
//   - Safe logging (never log full message content to production logs)
// ─────────────────────────────────────────────────────────────────────────

// In-memory rate limiter (per-IP, resets on server restart)
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_MAX = 5 // 5 requests per window
const ipRequests = new Map<string, { count: number; firstAt: number }>()

// Spam keywords to reject
const SPAM_KEYWORDS = ['viagra', 'casino', 'crypto', 'bitcoin', 'loan', 'seo service', 'gambling', 'lottery winner']

// Honeypot field name (hidden field that bots fill but humans don't)
const HONEYPOT_FIELD = 'website' // if this has a value, it's a bot

export async function POST(req: NextRequest) {
  try {
    // ── 1. Rate limiting ──────────────────────────────────────────────────
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const now = Date.now()
    const record = ipRequests.get(ip)

    if (record) {
      if (now - record.firstAt < RATE_LIMIT_WINDOW_MS) {
        if (record.count >= RATE_LIMIT_MAX) {
          return NextResponse.json(
            { success: false, error: 'Too many requests. Please try again in a few minutes.' },
            { status: 429 }
          )
        }
        record.count++
      } else {
        // Window expired — reset
        ipRequests.set(ip, { count: 1, firstAt: now })
      }
    } else {
      ipRequests.set(ip, { count: 1, firstAt: now })
    }

    // ── 2. Parse + validate input ────────────────────────────────────────
    const body = await req.json()
    const { name, email, subject, message, [HONEYPOT_FIELD]: honeypot } = body

    // Honeypot check — if filled, it's a bot
    if (honeypot) {
      // Pretend success so bots don't know they were caught
      return NextResponse.json({ success: true })
    }

    // Required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required.' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 })
    }
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json({ success: false, error: 'Subject is required.' }, { status: 400 })
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Message is required.' }, { status: 400 })
    }

    // Length limits
    if (name.length > 100) {
      return NextResponse.json({ success: false, error: 'Name is too long.' }, { status: 400 })
    }
    if (email.length > 200) {
      return NextResponse.json({ success: false, error: 'Email is too long.' }, { status: 400 })
    }
    if (subject.length > 200) {
      return NextResponse.json({ success: false, error: 'Subject is too long.' }, { status: 400 })
    }
    if (message.length > 5000) {
      return NextResponse.json({ success: false, error: 'Message is too long (max 5000 characters).' }, { status: 400 })
    }

    // Email format validation (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 })
    }

    // ── 3. Spam detection ─────────────────────────────────────────────────
    const fullText = `${name} ${subject} ${message}`.toLowerCase()
    const isSpam = SPAM_KEYWORDS.some(keyword => fullText.includes(keyword))
    if (isSpam) {
      // Pretend success so spammers don't know they were filtered
      console.warn('[contact] Spam detected from IP:', ip)
      return NextResponse.json({ success: true })
    }

    // ── 4. Send email ─────────────────────────────────────────────────────
    const result = await sendContactForm({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    })

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Your message has been sent. We\'ll get back to you soon!' })
    } else {
      console.error('[contact] Email send failed:', result.error)
      return NextResponse.json(
        { success: false, error: 'Failed to send your message. Please try again or email us directly.' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[contact] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
