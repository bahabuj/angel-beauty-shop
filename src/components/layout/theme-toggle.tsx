'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Premium theme toggle — gold accent, animated sun/moon icons.
 * Defaults to system preference, persists to localStorage.
 */
export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — only render the toggle after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Placeholder with the same dimensions to prevent layout shift
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full"
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const isDark = (resolvedTheme || theme) === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="h-9 w-9 rounded-full hover:bg-gold/10 hover:text-gold transition-colors group relative overflow-hidden"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {/* Sun icon (visible in light mode) */}
      <Sun
        className={`h-4 w-4 transition-all duration-500 ${
          isDark
            ? 'opacity-0 -rotate-90 scale-0'
            : 'opacity-100 rotate-0 scale-100 text-gold'
        }`}
      />
      {/* Moon icon (visible in dark mode) — positioned absolutely on top */}
      <Moon
        className={`h-4 w-4 absolute transition-all duration-500 ${
          isDark
            ? 'opacity-100 rotate-0 scale-100 text-gold'
            : 'opacity-0 rotate-90 scale-0'
        }`}
      />
    </Button>
  )
}
