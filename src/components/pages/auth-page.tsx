'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Eye, EyeOff, ChevronLeft, ChevronRight, Loader2, Mail, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface AuthSlideData {
  id: string
  title: string
  subtitle: string | null
  mediaUrl: string
  mediaType: string
  active: boolean
  order: number
}

// Fallback slides when database is empty or loading
const FALLBACK_SLIDES = [
  { title: 'Premium Skincare', subtitle: 'Discover products crafted with the finest natural ingredients', mediaUrl: '/images/auth/slide-1.png', mediaType: 'image' },
  { title: 'Reveal Your Glow', subtitle: 'Radiant, healthy skin starts with the right routine', mediaUrl: '/images/auth/slide-2.png', mediaType: 'image' },
  { title: 'Luxury at Home', subtitle: 'Transform your daily routine into a spa-like experience', mediaUrl: '/images/auth/slide-3.png', mediaType: 'image' },
  { title: 'Nature Meets Science', subtitle: 'Formulated by experts, powered by nature', mediaUrl: '/images/auth/slide-4.png', mediaType: 'image' },
]

function AuthForm() {
  const searchParams = useSearchParams()
  const { data: session, status: sessionStatus } = useSession()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const resetToken = searchParams.get('resetToken')
  const safeCallbackUrl = (() => {
    if (!callbackUrl.startsWith('/')) return '/'
    if (callbackUrl.startsWith('/auth')) return '/'
    if (callbackUrl.startsWith('/api')) return '/'
    if (callbackUrl.startsWith('/@')) return '/'
    if (callbackUrl.startsWith('/__')) return '/'
    return callbackUrl
  })()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<AuthSlideData[]>([])
  const [slidesLoading, setSlidesLoading] = useState(true)

  // ── Password reset flow state ──────────────────────────────────────────────
  // When the user clicks the reset link in their email, the URL contains
  // ?resetToken=xxx. We validate it against /api/auth/reset-password and show
  // a "set new password" form instead of the regular login.
  const [resetMode, setResetMode] = useState(false)
  const [resetTokenValid, setResetTokenValid] = useState<boolean | null>(null)
  const [resetEmailMasked, setResetEmailMasked] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetComplete, setResetComplete] = useState(false)

  // ── Forgot-password modal state ───────────────────────────────────────────
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [forgotSubmitting, setForgotSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const isRedirecting = useRef(false)

  // ── Forgot-password modal submit ──────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail.trim()) {
      toast.error('Please enter your email address')
      return
    }
    setForgotSubmitting(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      })
      const data = await res.json()
      // Always show the "if the email exists, we've sent a link" message
      // (don't leak whether the email is registered)
      setResetSent(true)
      toast.success('If that email is registered, a reset link is on its way.')

      // In dev mode, the API returns the resetUrl — log it for easy testing
      if (data.resetUrl) {
        console.log('[Dev] Password reset URL:', data.resetUrl)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setForgotSubmitting(false)
    }
  }

  // ── Validate reset token on mount (if ?resetToken=xxx is in the URL) ──────
  useEffect(() => {
    if (!resetToken) return
    setResetMode(true)
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(resetToken)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.valid) {
          setResetTokenValid(true)
          setResetEmailMasked(data.email || '')
        } else {
          setResetTokenValid(false)
        }
      })
      .catch(() => setResetTokenValid(false))
  }, [resetToken])

  // ── Set new password submit (reset flow) ──────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetToken) {
      toast.error('Missing reset token')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      toast.error('Passwords do not match')
      return
    }
    setResetSubmitting(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        setResetComplete(true)
        toast.success('Password reset! You can now sign in.')
      } else {
        toast.error(data.error || 'Failed to reset password')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setResetSubmitting(false)
    }
  }

  // If already authenticated (e.g., user navigated to /auth while logged in),
  // redirect to the appropriate page based on role
  useEffect(() => {
    if (sessionStatus === 'authenticated' && !isRedirecting.current) {
      isRedirecting.current = true
      const role = (session as any)?.user?.role
      if (role === 'admin') {
        window.location.href = '/#admin'
      } else {
        window.location.replace(safeCallbackUrl)
      }
    }
  }, [sessionStatus, safeCallbackUrl, session])

  // Load slides from database
  useEffect(() => {
    async function fetchSlides() {
      try {
        const res = await fetch('/api/auth-slides')
        const data = await res.json()
        if (data.success && data.slides && data.slides.length > 0) {
          setSlides(data.slides)
        }
      } catch {
        // Use fallback slides
      } finally {
        setSlidesLoading(false)
      }
    }
    fetchSlides()
  }, [])

  // Active slides to display
  const activeSlides = slides.length > 0 ? slides : FALLBACK_SLIDES.map((s, i) => ({
    id: `fallback-${i}`,
    ...s,
    active: true,
    order: i + 1,
  }))

  // Auto-advance slideshow
  useEffect(() => {
    if (activeSlides.length <= 1) return
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % activeSlides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [activeSlides.length])

  // Play video when current slide is a video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    }
  }, [currentSlide])

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index)
  }, [])

  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % activeSlides.length)
  }, [activeSlides.length])

  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + activeSlides.length) % activeSlides.length)
  }, [activeSlides.length])

  /**
   * Redirect to the appropriate page after successful login.
   *
   * For admin users, navigate to /#admin. The AdminPage component independently
   * verifies admin access by calling /api/auth/me — it does NOT rely on the
   * Zustand auth store or NextAuth client session being available.
   */
  const redirectAfterLogin = (role: string) => {
    isRedirecting.current = true
    if (role === 'admin') {
      window.location.href = '/#admin'
    } else {
      window.location.replace(safeCallbackUrl)
    }
  }

  // ===== EMAIL/PASSWORD LOGIN =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Frontend validation
    if (!form.email.trim()) {
      toast.error('Please enter your email address')
      return
    }
    if (!form.password) {
      toast.error('Please enter your password')
      return
    }

    setSubmitting(true)
    try {
      if (isLogin) {
        // === LOGIN: Use custom credential-signin endpoint ===
        // This sets the session cookie directly in the response,
        // avoiding the NextAuth signIn() cookie persistence issue
        const res = await fetch('/api/auth/credential-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            rememberMe,
          }),
        })
        const data = await res.json()

        if (data.success && data.user) {
          toast.success('Welcome back!')
          redirectAfterLogin(data.user.role)
        } else {
          toast.error(data.error || 'Invalid email or password. Please try again.')
        }
      } else {
        // === SIGNUP: Create account first, then sign in ===
        if (!form.name.trim()) { toast.error('Please enter your name'); return }

        const signupRes = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
          }),
        })
        const signupData = await signupRes.json()

        if (!signupData.success) {
          toast.error(signupData.error || 'Signup failed. This email may already be registered.')
          return
        }

        // Now sign in with the new credentials
        const signinRes = await fetch('/api/auth/credential-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            rememberMe,
          }),
        })
        const signinData = await signinRes.json()

        if (signinData.success && signinData.user) {
          toast.success('Account created successfully!')
          redirectAfterLogin(signinData.user.role)
        } else {
          toast.error('Account created but sign-in failed. Please try logging in.')
        }
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const currentSlideData = activeSlides[currentSlide] || activeSlides[0]

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* ===== FULL-SCREEN BACKGROUND SLIDESHOW ===== */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlideData?.id || currentSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0"
          >
            {currentSlideData?.mediaType === 'video' ? (
              <video
                ref={videoRef}
                src={currentSlideData.mediaUrl}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <Image
                src={currentSlideData?.mediaUrl || '/images/auth/slide-1.png'}
                alt={currentSlideData?.title || 'Beauty'}
                fill
                className="object-cover"
                priority={currentSlide === 0}
                sizes="100vw"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Multi-layer gradient overlay for premium glass effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 z-10" />
        <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-rose/5 z-10" />
      </div>

      {/* ===== CONTENT LAYER ===== */}
      <div className="relative z-20 min-h-screen flex">
        {/* Left side - Brand & Slideshow text (desktop only) */}
        <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10">
          {/* Top - Brand */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <Image
              src="/images/logo.png"
              alt="Angelsbeauty"
              width={1290}
              height={1202}
              className="object-contain drop-shadow-lg"
              style={{ height: '48px', width: 'auto' }}
            />
            <div>
              <span
                className="text-2xl font-bold text-white block"
                style={{ fontFamily: 'var(--font-playfair), serif' }}
              >
                Angelsbeauty
              </span>
              <span className="text-xs text-white/50 tracking-widest uppercase">Premium Skincare</span>
            </div>
          </motion.div>

          {/* Middle - Slide Text */}
          <div className="flex-1 flex items-end pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="max-w-lg"
              >
                <div className="inline-flex items-center gap-2 bg-gold/20 backdrop-blur-md border border-gold/30 rounded-full px-4 py-1.5 mb-4">
                  <Sparkles className="w-3 h-3 text-gold" />
                  <span className="text-xs font-medium text-gold">Featured Collection</span>
                </div>
                <h2
                  className="text-5xl font-bold text-white mb-4 leading-tight"
                  style={{ fontFamily: 'var(--font-playfair), serif' }}
                >
                  {currentSlideData?.title || 'Premium Skincare'}
                </h2>
                <p className="text-white/70 text-lg leading-relaxed max-w-md">
                  {currentSlideData?.subtitle || 'Discover our premium skincare collection'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom - Slide Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeSlides.map((_, i) => (
                <button key={i} onClick={() => goToSlide(i)} className="transition-all duration-300">
                  <motion.div
                    animate={{
                      width: i === currentSlide ? 32 : 10,
                      height: 10,
                      backgroundColor: i === currentSlide ? '#C9A96E' : 'rgba(255,255,255,0.3)',
                    }}
                    transition={{ duration: 0.3 }}
                    className="rounded-full"
                  />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={prevSlide}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/25 flex items-center justify-center transition-all duration-300"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={nextSlide}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/25 flex items-center justify-center transition-all duration-300"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">
              {/* Mobile brand */}
              <div className="lg:hidden text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Image
                    src="/images/logo.png"
                    alt="Angelsbeauty"
                    width={1290}
                    height={1202}
                    className="object-contain drop-shadow-lg"
                    style={{ height: '36px', width: 'auto' }}
                  />
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                    Angelsbeauty
                  </h2>
                </div>
                {activeSlides.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-3">
                    {activeSlides.map((_, i) => (
                      <button key={i} onClick={() => goToSlide(i)}>
                        <div className={`rounded-full transition-all duration-300 ${i === currentSlide ? 'w-5 h-1.5 bg-gold' : 'w-1.5 h-1.5 bg-white/40'}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? 'login' : 'signup'}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {resetMode ? (
                    /* ── Password Reset Form (when arriving via ?resetToken=xxx) ── */
                    <div>
                      <h1 className="text-2xl font-bold mb-1 text-white" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                        Set New Password
                      </h1>
                      {resetComplete ? (
                        <div className="text-center py-8">
                          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                            <KeyRound className="w-7 h-7 text-green-400" />
                          </div>
                          <p className="text-white text-sm mb-6">
                            Your password has been reset successfully.
                          </p>
                          <Button
                            onClick={() => {
                              setResetMode(false)
                              setIsLogin(true)
                              // Clean the URL (remove ?resetToken=)
                              window.history.replaceState({}, '', '/#auth')
                            }}
                            className="w-full bg-gold hover:bg-gold-light text-white h-11"
                          >
                            Continue to Sign In
                          </Button>
                        </div>
                      ) : resetTokenValid === false ? (
                        <div className="text-center py-8">
                          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                            <span className="text-2xl">⚠️</span>
                          </div>
                          <p className="text-white text-sm mb-6">
                            This password reset link is invalid, expired, or has already been used.
                          </p>
                          <Button
                            onClick={() => {
                              setResetMode(false)
                              setShowForgotPassword(true)
                              window.history.replaceState({}, '', '/#auth')
                            }}
                            className="w-full bg-gold hover:bg-gold-light text-white h-11"
                          >
                            Request a new link
                          </Button>
                        </div>
                      ) : resetTokenValid === true ? (
                        <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
                          {resetEmailMasked && (
                            <p className="text-xs text-white/50 text-center">
                              Resetting password for <strong className="text-white/80">{resetEmailMasked}</strong>
                            </p>
                          )}
                          <div>
                            <Label htmlFor="new-password" className="text-white/70 text-xs">New Password</Label>
                            <Input
                              id="new-password"
                              type={showPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Enter new password"
                              className="bg-white/10 backdrop-blur-md border-white/20 focus:border-gold/50 focus:ring-gold/20 text-white placeholder:text-white/30 mt-1.5 h-11"
                              style={{ colorScheme: 'dark' }}
                              autoComplete="new-password"
                              required
                            />
                            <p className="text-white/30 text-[11px] mt-1">Must be at least 6 characters</p>
                          </div>
                          <div>
                            <Label htmlFor="new-password-confirm" className="text-white/70 text-xs">Confirm New Password</Label>
                            <Input
                              id="new-password-confirm"
                              type={showPassword ? 'text' : 'password'}
                              value={newPasswordConfirm}
                              onChange={(e) => setNewPasswordConfirm(e.target.value)}
                              placeholder="Re-enter new password"
                              className="bg-white/10 backdrop-blur-md border-white/20 focus:border-gold/50 focus:ring-gold/20 text-white placeholder:text-white/30 mt-1.5 h-11"
                              style={{ colorScheme: 'dark' }}
                              autoComplete="new-password"
                              required
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={resetSubmitting}
                            className="w-full bg-gold hover:bg-gold-light text-white h-11 beauty-btn font-semibold"
                          >
                            {resetSubmitting ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <KeyRound className="w-4 h-4 mr-2" />
                            )}
                            {resetSubmitting ? 'Resetting...' : 'Reset Password'}
                          </Button>
                        </form>
                      ) : (
                        <div className="text-center py-8">
                          <Loader2 className="w-6 h-6 text-gold animate-spin mx-auto" />
                          <p className="text-white/60 text-xs mt-3">Verifying reset link…</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── Regular Login / Signup Form ── */
                    <>
                  <h1 className="text-2xl font-bold mb-1 text-white" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                  </h1>
                  <p className="text-white/60 text-sm mb-6">
                    {isLogin ? 'Sign in to your account to continue' : 'Join the Angelsbeauty family'}
                  </p>

                  {/* Email + Password Form (primary auth method) */}
                  <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    {!isLogin && (
                      <div>
                        <Label htmlFor="name" className="text-white/70 text-xs">Full Name</Label>
                        <Input
                          id="name"
                          value={form.name}
                          onChange={e => handleChange('name', e.target.value)}
                          placeholder="Enter your name"
                          className="bg-white/10 backdrop-blur-md border-white/20 focus:border-gold/50 focus:ring-gold/20 text-white placeholder:text-white/30 mt-1.5 h-11"
                          required={!isLogin}
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="email" className="text-white/70 text-xs">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={e => handleChange('email', e.target.value)}
                        placeholder="you@example.com"
                        className="bg-white/10 backdrop-blur-md border-white/20 focus:border-gold/50 focus:ring-gold/20 text-white placeholder:text-white/30 mt-1.5 h-11 [-webkit-text-fill-color:white]"
                        style={{ colorScheme: 'dark' }}
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password" className="text-white/70 text-xs">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={e => handleChange('password', e.target.value)}
                          placeholder="Enter your password"
                          className="bg-white/10 backdrop-blur-md border-white/20 focus:border-gold/50 focus:ring-gold/20 text-white placeholder:text-white/30 mt-1.5 h-11 pr-10 [-webkit-text-fill-color:white]"
                          style={{ colorScheme: 'dark' }}
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {!isLogin && (
                        <p className="text-white/30 text-[11px] mt-1">Must be at least 6 characters</p>
                      )}
                    </div>

                    {/* Remember me + Forgot password (only on login) */}
                    {isLogin ? (
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <Checkbox
                            checked={rememberMe}
                            onCheckedChange={(v) => setRememberMe(v === true)}
                            className="border-white/40 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                          />
                          <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors">
                            Remember me
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(form.email)
                            setResetSent(false)
                            setShowForgotPassword(true)
                          }}
                          className="text-xs text-gold/80 hover:text-gold hover:underline transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <Checkbox
                          checked={rememberMe}
                          onCheckedChange={(v) => setRememberMe(v === true)}
                          className="border-white/40 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                        />
                        <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors">
                          Keep me signed in
                        </span>
                      </label>
                    )}

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gold hover:bg-gold-light text-white h-11 beauty-btn font-semibold"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      )}
                      {submitting ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </Button>
                  </form>

                  <div className="mt-5 text-center">
                    <p className="text-sm text-white/50">
                      {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                      <button
                        onClick={() => { setIsLogin(!isLogin); setForm({ name: '', email: '', password: '' }) }}
                        className="text-gold font-medium hover:underline"
                      >
                        {isLogin ? 'Sign Up' : 'Sign In'}
                      </button>
                    </p>
                  </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* ── Forgot Password Modal ─────────────────────────────────────────── */}
        {showForgotPassword && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowForgotPassword(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                    Reset your password
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    We'll email you a secure reset link.
                  </p>
                </div>
              </div>

              {resetSent ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-foreground mb-4">
                    If an account exists for <strong>{resetEmail}</strong>, a password reset link is on its way.
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Check your inbox (and spam folder) for an email from Angels Beauty. The link expires in 1 hour.
                  </p>
                  <Button
                    onClick={() => {
                      setShowForgotPassword(false)
                      setResetSent(false)
                      setResetEmail('')
                    }}
                    className="w-full bg-gold hover:bg-gold-light text-white"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <Label htmlFor="reset-email" className="text-xs">Email Address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1.5"
                      autoFocus
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowForgotPassword(false)}
                      className="flex-1"
                      disabled={forgotSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={forgotSubmitting}
                      className="flex-1 bg-gold hover:bg-gold-light text-white"
                    >
                      {forgotSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Mail className="w-4 h-4 mr-2" />
                      )}
                      {forgotSubmitting ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

// Main export with Suspense boundary for useSearchParams
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    }>
      <AuthForm />
    </Suspense>
  )
}
