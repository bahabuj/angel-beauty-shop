'use client'

import { SessionProvider as NextAuthSessionProvider, useSession } from 'next-auth/react'
import { ReactNode, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth-store'

function AuthSync() {
  const { data: session, status } = useSession()
  const syncWithNextAuth = useAuthStore((s) => s.syncWithNextAuth)
  const lastSyncedId = useRef<string | null>(null)

  useEffect(() => {
    if (status !== 'loading') {
      // Only sync when the session user actually changes
      const sessionId = session?.user?.id ?? null
      if (sessionId !== lastSyncedId.current) {
        lastSyncedId.current = sessionId
        syncWithNextAuth(session)
      }
    }
  }, [session, status, syncWithNextAuth])

  return null
}

export default function SessionProvider({
  children,
  session,
}: {
  children: ReactNode
  session?: any
}) {
  return (
    <NextAuthSessionProvider
      session={session}
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <AuthSync />
      {children}
    </NextAuthSessionProvider>
  )
}
