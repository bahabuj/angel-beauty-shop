import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { db } from '@/lib/db'
import { encode } from 'next-auth/jwt'

/**
 * Custom Firebase Google Sign-In endpoint.
 *
 * WHY: NextAuth's signIn() with redirect:false doesn't persist session cookies
 * through the Caddy reverse proxy. This endpoint verifies the Firebase ID token,
 * creates/finds the user, and sets the session cookie directly using NextAuth's
 * own `encode()` function, guaranteeing the JWT is in the exact format that
 * getToken() expects.
 */
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { idToken } = body

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: 'Firebase ID token is required' },
        { status: 400 }
      )
    }

    // 1. Verify the Firebase ID token server-side
    const decodedToken = await verifyFirebaseToken(idToken)
    if (!decodedToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid Firebase token' },
        { status: 401 }
      )
    }

    const email = decodedToken.email
    const name = decodedToken.name || email?.split('@')[0] || ''
    const image = decodedToken.picture || null

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'No email found in Firebase account' },
        { status: 400 }
      )
    }

    // 2. Find or create user in our database
    let user = await db.user.findUnique({ where: { email } })

    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name,
          image,
          password: null,
          role: 'customer',
          emailVerified: new Date(),
        },
      })
    } else if (!user.image && image) {
      user = await db.user.update({
        where: { id: user.id },
        data: {
          image,
          emailVerified: user.emailVerified || new Date(),
        },
      })
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
    // Set both cookie names for compatibility with NextAuth
    const isSecure = process.env.NODE_ENV === 'production'
    response.cookies.set('next-auth.session-token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isSecure,
      maxAge: 30 * 24 * 60 * 60,
    })
    response.cookies.set('__Secure-next-auth.session-token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isSecure,
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Firebase sign-in error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    })
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
