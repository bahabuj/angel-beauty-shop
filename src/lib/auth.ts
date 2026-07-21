import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'

/** Check if a string looks like a bcrypt hash */
function isBcryptHash(str: string): boolean {
  return str.startsWith('$2a$') || str.startsWith('$2b$') || str.startsWith('$2y$')
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password credentials provider
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) {
          throw new Error('Invalid email or password')
        }

        let passwordMatch = false
        if (isBcryptHash(user.password)) {
          passwordMatch = await bcrypt.compare(credentials.password, user.password)
        } else {
          // Legacy plain-text comparison
          passwordMatch = user.password === credentials.password
          // Auto-migrate to bcrypt on successful login
          if (passwordMatch) {
            try {
              const hashedPassword = await bcrypt.hash(credentials.password, 10)
              await db.user.update({ where: { id: user.id }, data: { password: hashedPassword } })
            } catch { /* Don't block login if migration fails */ }
          }
        }
        if (!passwordMatch) {
          throw new Error('Invalid email or password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image || user.avatar,
          role: user.role,
          phone: user.phone,
        }
      },
    }),

    // Firebase Google provider — client sends the Firebase ID token,
    // server verifies it and creates/finds the user
    CredentialsProvider({
      id: 'firebase-google',
      name: 'firebase-google',
      credentials: {
        idToken: { label: 'Firebase ID Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) {
          throw new Error('Firebase ID token is required')
        }

        // Verify the Firebase ID token server-side
        const decodedToken = await verifyFirebaseToken(credentials.idToken)
        if (!decodedToken) {
          throw new Error('Invalid Firebase token')
        }

        const email = decodedToken.email
        const name = decodedToken.name || decodedToken.email?.split('@')[0] || ''
        const image = decodedToken.picture || null

        if (!email) {
          throw new Error('No email found in Firebase account')
        }

        // Find or create user in our database
        let user = await db.user.findUnique({
          where: { email },
        })

        if (!user) {
          // Create new user from Google/Firebase profile
          user = await db.user.create({
            data: {
              email,
              name,
              image,
              password: null, // Firebase users don't have passwords
              role: 'customer',
              emailVerified: new Date(),
            },
          })
        } else if (!user.image && image) {
          // Update existing user with Google profile image
          user = await db.user.update({
            where: { id: user.id },
            data: {
              image,
              emailVerified: user.emailVerified || new Date(),
            },
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image || user.avatar,
          role: user.role,
          phone: user.phone,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - add user data to token
      if (user) {
        token.id = user.id
        token.role = (user as any).role || 'customer'
        token.phone = (user as any).phone || null
        token.dbSyncTs = Date.now()
        return token
      }

      // Update session (e.g., when user updates their profile)
      if (trigger === 'update' && session) {
        token.role = session.role || token.role
        token.phone = session.phone || token.phone
        token.dbSyncTs = Date.now()
      }

      // Always fetch latest user data from DB to keep role in sync
      if (token.email) {
        const now = Date.now()
        const lastSync = (token as any).dbSyncTs as number | undefined
        const shouldSync = !lastSync || now - lastSync > 5 * 60 * 1000
        if (!shouldSync) {
          return token
        }
        try {
          const dbUser = await db.user.findUnique({
            where: { email: token.email },
          })
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
            token.phone = dbUser.phone
            token.name = dbUser.name
            token.picture = dbUser.image || dbUser.avatar || token.picture
            token.dbSyncTs = now
          }
        } catch {
          // If DB lookup fails, use cached token data
        }
      }

      return token
    },
    async session({ session, token }) {
      // Pass token data to session
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.phone = token.phone as string | null
      }
      return session
    },
  },
  pages: {
    signIn: '/auth', // Redirect to auth page
    error: '/auth',  // Redirect to auth page on error
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Explicit cookie configuration to ensure cookies work correctly
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  // NEXTAUTH_SECRET MUST be set in .env.local. Rotating it invalidates all sessions.
  // Do NOT hardcode a fallback — that would let anyone who reads the source forge session cookies.
  secret: process.env.NEXTAUTH_SECRET,
  debug: false, // Disable debug to reduce noise in logs
}

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: string
      phone: string | null
    }
  }

  interface User {
    role?: string
    phone?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    phone: string | null
    dbSyncTs?: number
  }
}
