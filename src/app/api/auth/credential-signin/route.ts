import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { encode } from 'next-auth/jwt'

/**
 * Custom Credential Sign-In endpoint.
 *
 * WHY: NextAuth's signIn() with redirect:false doesn't persist session cookies
 * through the Caddy reverse proxy. This endpoint authenticates the user and
 * sets the session cookie directly using NextAuth's own `encode()` function,
 * guaranteeing the JWT is in the exact format that getToken() expects.
 */

/** Check if a string looks like a bcrypt hash */
function isBcryptHash(str: string): boolean {
  return str.startsWith('$2a$') || str.startsWith('$2b$') || str.startsWith('$2y$')
}

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // 1. Find the user
    const user = await db.user.findUnique({ where: { email } })

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // 2. Verify password
    let passwordMatch = false
    if (isBcryptHash(user.password)) {
      passwordMatch = await bcrypt.compare(password, user.password)
    } else {
      // Legacy plain-text comparison
      passwordMatch = user.password === password
      // Auto-migrate to bcrypt on successful login
      if (passwordMatch) {
        try {
          const hashedPassword = await bcrypt.hash(password, 10)
          await db.user.update({ where: { id: user.id }, data: { password: hashedPassword } })
        } catch { /* Don't block login if migration fails */ }
      }
    }

    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // 3. Create a NextAuth-compatible session token using NextAuth's own encode()
    // This is critical — NextAuth derives the signing key from the secret using HKDF,
    // so we MUST use its encode() function to produce a token that getToken() can verify.
    const token = await encode({
      token: {
        name: user.name,
        email: user.email,
        picture: user.image || user.avatar || null,
        sub: user.id,
        id: user.id,
        role: user.role,
        phone: user.phone,
      },
      secret: NEXTAUTH_SECRET,
      maxAge: 30 * 24 * 60 * 60, // 30 days — must match auth.ts session.maxAge
    })

    // 4. Build the response with user data
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        image: user.image || user.avatar,
      },
    })

    // 5. Set the session cookie directly on the response
    response.cookies.set('next-auth.session-token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: false,
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Credential sign-in error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
