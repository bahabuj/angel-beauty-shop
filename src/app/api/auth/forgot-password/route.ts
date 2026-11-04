import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { sendPasswordReset, isEmailConfigured } from '@/lib/email'

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────
//
// Body: { email: string }
//
// Behavior:
//   - If the email is registered, generate a single-use reset token (1h expiry),
//     store it in the PasswordResetToken table, and "email" it to the user.
//   - If the email is NOT registered, do nothing (don't leak registration status).
//   - Always returns 200 with the same generic message either way.
//
// Email delivery:
//   This environment doesn't have SMTP configured, so the reset link is logged
//   to the server console AND returned in the response under `resetUrl` (dev mode).
//   In production, wire this up to a real email service (Resend, SendGrid, etc.)
//   and remove the `resetUrl` from the response.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_TTL_HOURS = 1

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await db.user.findUnique({ where: { email: normalizedEmail } })

    // Always return success — never leak whether the email is registered
    const genericResponse = {
      success: true,
      message: 'If an account exists for that email, a password reset link is on its way.',
    }

    if (!user) {
      // No user — return the same generic message
      return NextResponse.json(genericResponse)
    }

    // Generate a secure random token (32 bytes = 64 hex chars)
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000)

    // Store the token (invalidate any previous tokens for this user first)
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } })
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // Build the reset URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const resetUrl = `${siteUrl}/#auth?resetToken=${token}`

    // ── Email delivery ────────────────────────────────────────────────────
    // Send the password reset email via Resend (or simulate in dev mode)
    const emailResult = await sendPasswordReset({
      customerEmail: user.email,
      customerName: user.name || 'there',
      resetUrl,
    })

    if (!emailResult.success) {
      console.error('[Forgot Password] Email send failed:', emailResult.error)
    }

    // In dev mode without email configured, still return the reset URL for testing
    const isDev = process.env.NODE_ENV !== 'production'
    const includeResetUrl = isDev && !isEmailConfigured()
    return NextResponse.json({
      ...genericResponse,
      ...(includeResetUrl ? { resetUrl, token } : {}),
    })
  } catch (error: any) {
    console.error('[Forgot Password] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
