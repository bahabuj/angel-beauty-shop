import { create } from 'zustand'

interface User {
  id: string
  email: string
  name: string | null
  role: 'customer' | 'admin'
  phone: string | null
  avatar: string | null
  image?: string | null
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<User | null>
  signup: (name: string, email: string, password: string) => Promise<User | null>
  googleLogin: () => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  syncWithNextAuth: (session: any) => void
}

/**
 * Fetches the current authenticated user from the server-side /api/auth/me endpoint.
 * More reliable than client-side getSession() because the server reads the
 * session cookie synchronously — no race condition.
 */
async function fetchCurrentUser(maxRetries = 5, delayMs = 150): Promise<User | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.success && data.authenticated && data.user) {
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role || 'customer',
          phone: data.user.phone || null,
          avatar: data.user.image || data.user.avatar || null,
          image: data.user.image || data.user.avatar || null,
        }
      }
    } catch {
      // Network error — retry
    }
    if (attempt < maxRetries - 1) {
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
  return null
}

export const useAuthStore = create<AuthState>()(
  (set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,

    login: async (email: string, password: string) => {
      set({ isLoading: true })
      try {
        // Step 1: Sign in via NextAuth credentials provider
        // This creates the JWT session cookie that middleware checks
        const { signIn } = await import('next-auth/react')
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (!result?.ok) {
          set({ isLoading: false })
          return null
        }

        // Step 2: Fetch user data from server (reads session cookie directly)
        const user = await fetchCurrentUser()

        if (user) {
          set({ user, isAuthenticated: true, isLoading: false })
          return user
        }

        // Step 3: Fallback — try client-side getSession
        try {
          const { getSession } = await import('next-auth/react')
          const session = await getSession()
          if (session?.user) {
            const fallbackUser: User = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name ?? null,
              role: (session.user.role as 'customer' | 'admin') || 'customer',
              phone: session.user.phone || null,
              avatar: session.user.image || null,
              image: session.user.image || null,
            }
            set({ user: fallbackUser, isAuthenticated: true, isLoading: false })
            return fallbackUser
          }
        } catch {
          // Ignore
        }

        // If all else fails, mark as authenticated without user data
        set({ isAuthenticated: true, isLoading: false })
        return null
      } catch {
        set({ isLoading: false })
        return null
      }
    },

    signup: async (name: string, email: string, password: string) => {
      set({ isLoading: true })
      try {
        // First create the account via the signup API
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        })
        const data = await res.json()
        if (!data.success) {
          set({ isLoading: false })
          return null
        }

        // Then sign in via NextAuth credentials provider (creates JWT cookie)
        const { signIn } = await import('next-auth/react')
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (result?.ok) {
          // Fetch user data from server
          const user = await fetchCurrentUser()
          if (user) {
            set({ user, isAuthenticated: true, isLoading: false })
            return user
          }
        }

        // Fallback: use signup API response user data
        if (data.user) {
          const signupUser: User = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'customer',
            phone: data.user.phone || null,
            avatar: data.user.image || data.user.avatar || null,
            image: data.user.image || data.user.avatar || null,
          }
          set({ user: signupUser, isAuthenticated: true, isLoading: false })
          return signupUser
        }

        set({ isAuthenticated: true, isLoading: false })
        return null
      } catch {
        set({ isLoading: false })
        return null
      }
    },

    googleLogin: async () => {
      set({ isLoading: true })
      try {
        const { signIn } = await import('next-auth/react')
        // Redirect-based Google OAuth — after redirect back,
        // the middleware will see the JWT cookie and let them through
        await signIn('google', { callbackUrl: '/' })
      } catch {
        set({ isLoading: false })
      }
    },

    logout: async () => {
      set({ isLoading: true, user: null, isAuthenticated: false })
      
      try {
        const { signOut } = await import('next-auth/react')
        
        Promise.all([
          fetch('/api/auth/logout', { method: 'POST' }),
          import('@/lib/firebase').then(({ auth }) =>
            import('firebase/auth').then(({ signOut: firebaseSignOut }) => firebaseSignOut(auth))
          ),
        ]).catch(() => {})
        
        await signOut({ redirect: true, callbackUrl: '/auth' })
      } catch {
        window.location.href = '/auth'
      }
    },

    setUser: (user) => set({ user, isAuthenticated: !!user }),

    syncWithNextAuth: (session: any) => {
      if (session?.user) {
        const user: User = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role || 'customer',
          phone: session.user.phone || null,
          avatar: session.user.image || null,
          image: session.user.image || null,
        }
        const currentUser = get().user
        if (!currentUser || currentUser.id !== user.id || currentUser.role !== user.role) {
          set({ user, isAuthenticated: true, isLoading: false })
        }
      } else {
        const { isAuthenticated } = get()
        if (isAuthenticated) {
          set({ user: null, isAuthenticated: false, isLoading: false })
        }
      }
    },
  })
)
