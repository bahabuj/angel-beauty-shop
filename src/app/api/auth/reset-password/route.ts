import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// ─── POST /api/auth/reset-password ──────────────────────────────────────────
//
// Body: { token: string, password: string }
//
// Validates the token (exists, not expired, not already used), then sets the
// new password on the associated user. Marks the token as used so it can't be
// reused.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Reset token is required' },
        { status: 400 }
      )
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // 1. Look up the token
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    })

    if (!resetToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid reset token.' },
        { status: 400 }
      )
    }

    // 2. Check if already used
    if (resetToken.usedAt) {
      return NextResponse.json(
        { success: false, error: 'This reset link has already been used. Please request a new one.' },
        { status: 400 }
      )
    }

    // 3. Check expiry
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This reset link has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // 4. Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // 5. Update the user's password + mark token as used (in a transaction)
    await db.$transaction([
      db.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      db.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    })
  } catch (error: any) {
    console.error('[Reset Password] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}

// ─── GET /api/auth/reset-password?token=... ─────────────────────────────────
// Validates whether a reset token is still usable (not expired, not used).
// Used by the auth page to decide whether to show the "set new password" form
// or an "expired" message.
export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get('token')
    if (!token) {
      return NextResponse.json(
        { success: false, valid: false, error: 'Missing token' },
        { status: 400 }
      )
    }

    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    })

    if (!resetToken) {
      return NextResponse.json({ success: true, valid: false, reason: 'invalid' })
    }
    if (resetToken.usedAt) {
      return NextResponse.json({ success: true, valid: false, reason: 'used' })
    }
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ success: true, valid: false, reason: 'expired' })
    }

    // Token is valid — also return the associated email (masked) for UX
    const user = await db.user.findUnique({
      where: { id: resetToken.userId },
      select: { email: true },
    })
    const email = user?.email || ''
    const maskedEmail = email.replace(/^(.).*(@.*)$/, (_, a, b) => `${a}***${b}`)

    return NextResponse.json({
      success: true,
      valid: true,
      email: maskedEmail,
      expiresAt: resetToken.expiresAt.toISOString(),
    })
  } catch (error: any) {
    console.error('[Reset Password GET] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Failed to validate token' },
      { status: 500 }
    )
  }
}
