'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Eye, EyeOff, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { getAdditionalUserInfo, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'

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
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googlePopupIssue, setGooglePopupIssue] = useState<string | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<AuthSlideData[]>([])
  const [slidesLoading, setSlidesLoading] = useState(true)
  const [showManualForm, setShowManualForm] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isRedirecting = useRef(false)

  const openAuthInNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer')
  }

  const copyAuthUrl = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied.')
    } catch {
      toast.error(url)
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

  // Auto-sign-in on page load: Try silent Firebase sign-in + backend verification
  useEffect(() => {
    if (sessionStatus !== 'unauthenticated' || isRedirecting.current) return

    let isMounted = true
    let timeoutId: NodeJS.Timeout | null = null

    const attemptSilentSignIn = async () => {
      try {
        // Check if user is already logged in to Firebase
        const checkAuth = new Promise<boolean>(resolve => {
          const unsubscribe = onAuthStateChanged(auth, async user => {
            unsubscribe()
            
            if (!user) {
              // No existing session — user will click Google button
              resolve(false)
              return
            }

            // Get the ID token and verify with backend
            const idToken = await user.getIdToken()
            const res = await fetch('/api/auth/firebase-signin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken }),
            })
            const data = await res.json()

            if (data.success && isMounted) {
              // Auto-redirect after successful silent sign-in
              isRedirecting.current = true
              if (data.user?.role === 'admin') {
                window.location.href = '/#admin'
              } else {
                window.location.replace(safeCallbackUrl)
              }
              resolve(true)
            }
            resolve(false)
          })

          // Timeout after 3 seconds to avoid hanging
          timeoutId = setTimeout(() => unsubscribe(), 3000)
        })

        await checkAuth
      } catch (error) {
        // Silent sign-in failed or not available
        console.debug('Silent sign-in not available')
      }
    }

    attemptSilentSignIn()

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [sessionStatus, safeCallbackUrl])

  // Handle redirect result from Firebase Google sign-in
  useEffect(() => {
    if (sessionStatus !== 'unauthenticated' || isRedirecting.current) return

    let isMounted = true

    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth)
        
        if (result && result.user && isMounted) {
          // User signed in via redirect
          const idToken = await result.user.getIdToken()
          const res = await fetch('/api/auth/firebase-signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          })
          const data = await res.json()

          if (data.success && data.user) {
            const isNewUser = getAdditionalUserInfo(result)?.isNewUser
            toast.success(isNewUser ? 'Account created successfully!' : 'Welcome back!')
            redirectAfterLogin(data.user.role)
          }
        }
      } catch (error: any) {
        console.error('Redirect result error:', error)
      }
    }

    handleRedirectResult()

    return () => {
      isMounted = false
    }
  }, [sessionStatus, safeCallbackUrl])

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

  // ===== GOOGLE SIGN-IN =====
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setGooglePopupIssue(null)
    try {
      const withTimeout = async <T,>(promise: Promise<T>, ms: number) => {
        return await new Promise<T>((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('timeout')), ms)
          promise
            .then(value => {
              clearTimeout(timeoutId)
              resolve(value)
            })
            .catch(err => {
              clearTimeout(timeoutId)
              reject(err)
            })
        })
      }

      try {
        const result = await withTimeout(signInWithPopup(auth, googleProvider), 15000)
        const idToken = await result.user.getIdToken()

        const res = await fetch('/api/auth/firebase-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })
        const data = await res.json()

        if (data.success && data.user) {
          toast.success('Welcome back!')
          redirectAfterLogin(data.user.role)
          return
        }

        toast.error(data.error || 'Google Sign-In failed. Please try again.')
        return
      } catch (popupError: any) {
        const code = popupError?.code
        const shouldFallbackToRedirect =
          popupError instanceof Error && popupError.message === 'timeout'
            ? true
            : code === 'auth/popup-blocked' ||
              code === 'auth/popup-closed-by-user' ||
              code === 'auth/cancelled-popup-request' ||
              code === 'auth/operation-not-supported-in-this-environment'

        if (shouldFallbackToRedirect) {
          toast.message('Redirecting to Google...')
          await signInWithRedirect(auth, googleProvider)
          return
        }

        throw popupError
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      toast.error('Google Sign-In failed. Please try again.')
    } finally {
      setGoogleLoading(false)
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
                  <h1 className="text-2xl font-bold mb-1 text-white" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                  </h1>
                  <p className="text-white/60 text-sm mb-6">
                    {isLogin ? 'Sign in to your account to continue' : 'Join the Angelsbeauty family'}
                  </p>

                  {/* Google Sign-In - Primary Option */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || submitting}
                    className="w-full h-12 backdrop-blur-md border-white/20 hover:bg-white/20 hover:border-white/30 text-white mb-2 flex items-center justify-center gap-3 text-sm font-medium transition-all duration-300 disabled:opacity-50 bg-white/10 hover:shadow-lg"
                  >
                    {googleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
                  </Button>
                  {googlePopupIssue && (
                    <div className="mb-3 rounded-lg bg-white/10 border border-white/15 p-3 text-xs text-white/80">
                      <div className="mb-2">{googlePopupIssue}</div>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={openAuthInNewTab}
                          className="text-gold hover:underline"
                        >
                          Open /auth in a new tab
                        </button>
                        <button
                          type="button"
                          onClick={copyAuthUrl}
                          className="text-gold hover:underline"
                        >
                          Copy link
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Toggle Manual Form Option */}
                  {!showManualForm && (
                    <button
                      type="button"
                      onClick={() => setShowManualForm(true)}
                      className="w-full py-2 text-xs text-white/50 hover:text-white/70 transition-colors duration-200"
                    >
                      or sign in with email
                    </button>
                  )}

                  {/* Divider */}
                  {showManualForm && (
                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/15" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white/10 px-3 text-white/40 backdrop-blur-sm rounded-full">email alternative</span>
                      </div>
                    </div>
                  )}

                  {/* Manual Form - Optional */}
                  {showManualForm && (
                  <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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

                    <Button
                      type="submit"
                      disabled={submitting || googleLoading}
                      className="w-full bg-gold hover:bg-gold-light text-white h-11 beauty-btn font-semibold"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      )}
                      {submitting ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </Button>

                    <div className="mt-3 text-center">
                      <button
                        type="button"
                        onClick={() => setShowManualForm(false)}
                        className="text-xs text-white/40 hover:text-white/60 transition-colors"
                      >
                        Back to Google Sign-In
                      </button>
                    </div>
                  </form>
                  )}

                  {!showManualForm && (
                  <div className="mt-6 text-center text-xs text-white/40">
                    <p>Fast & secure • No password needed</p>
                  </div>
                  )}

                  {showManualForm && (
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
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
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
