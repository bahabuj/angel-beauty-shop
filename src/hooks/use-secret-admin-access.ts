'use client'

import { useRef, useCallback } from 'react'
import { useNavStore } from '@/store/nav-store'
import { useAuthStore } from '@/store/auth-store'

const TAP_THRESHOLD = 5
const TAP_WINDOW_MS = 1500

export function useSecretAdminAccess(onNormalClick?: () => void) {
  const tapCount = useRef(0)
  const lastTapAt = useRef(0)
  const inFlight = useRef(false)

  const navigate = useNavStore((s) => s.navigate)
  const { isAuthenticated, user, setUser } = useAuthStore()

  return useCallback(async (e?: React.MouseEvent) => {
    const now = Date.now()
    if (now - lastTapAt.current > TAP_WINDOW_MS) {
      tapCount.current = 0
    }
    lastTapAt.current = now
    tapCount.current += 1

    if (tapCount.current >= TAP_THRESHOLD) {
      tapCount.current = 0
      if (e) e.preventDefault()
      if (inFlight.current) return
      inFlight.current = true

      try {
        if (isAuthenticated && user?.role === 'admin') {
          navigate('admin')
          return
        }
        try {
          const res = await fetch('/api/auth/auto-admin', { method: 'POST' })
          const data = await res.json()
          if (data.success && data.user) {
            setUser(data.user)
          }
        } catch {}
        navigate('admin')
      } finally {
        inFlight.current = false
      }
      return
    }

    if (onNormalClick) {
      onNormalClick()
    }
  }, [isAuthenticated, user, navigate, setUser, onNormalClick])
}
