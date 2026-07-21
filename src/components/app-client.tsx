'use client'

import { useNavStore } from '@/store/nav-store'
import { useUIStore } from '@/store/ui-store'
import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/footer'
import SeoManager from '@/components/seo/seo-manager'
import dynamic from 'next/dynamic'
import { useEffect, useRef, Suspense } from 'react'
import type { HomeData } from '@/lib/home-data'

// Helper to catch chunk load errors in dynamic imports
function safeImport<T>(importFn: () => Promise<{ default: T }>): Promise<{ default: T }> {
  return importFn().catch((err) => {
    console.warn('Chunk load failed, returning empty component:', err)
    const EmptyComponent = () => null
    return { default: EmptyComponent as unknown as T }
  })
}

// All pages — lazy loaded to reduce initial compilation memory
const Chatbot = dynamic(() => safeImport(() => import('@/components/layout/chatbot')), { ssr: false })
const AdminPage = dynamic(() => safeImport(() => import('@/components/pages/admin-page')), { ssr: false })
const CheckoutFailedPage = dynamic(() => safeImport(() => import('@/components/pages/checkout-failed-page')))
const OrderSuccessPage = dynamic(() => safeImport(() => import('@/components/pages/order-success-page')))
const AccountPage = dynamic(() => safeImport(() => import('@/components/pages/account-page')))
const ContactPage = dynamic(() => safeImport(() => import('@/components/pages/contact-page')))
const AboutPage = dynamic(() => safeImport(() => import('@/components/pages/about-page')))
const PolicyPages = dynamic(() => safeImport(() => import('@/components/pages/policy-pages')))
const NotFoundPage = dynamic(() => safeImport(() => import('@/components/pages/not-found-page')))

// Core pages — also dynamic to reduce initial bundle size and memory usage
// HomePage receives SSR initial data so it renders instantly on first paint
const HomePage = dynamic(() => safeImport(() => import('@/components/pages/home-page')))
const ShopPage = dynamic(() => safeImport(() => import('@/components/pages/shop-page')))
const ProductDetailPage = dynamic(() => safeImport(() => import('@/components/pages/product-detail-page')))
const CartPage = dynamic(() => safeImport(() => import('@/components/pages/cart-page')))
const CheckoutPage = dynamic(() => safeImport(() => import('@/components/pages/checkout-page')))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

interface AppClientProps {
  initialHomeData?: HomeData | null
}

export default function AppClient({ initialHomeData }: AppClientProps) {
  const currentPage = useNavStore((s) => s.currentPage)
  const navigate = useNavStore((s) => s.navigate)
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen)
  const hasRoutedAdmin = useRef(false)
  const initialHashProcessed = useRef(false)

  // =====================================================================
  // HASH-BASED ROUTING ON INITIAL LOAD
  // =====================================================================
  useEffect(() => {
    if (initialHashProcessed.current) return
    initialHashProcessed.current = true

    const hash = window.location.hash.replace('#', '')
    if (!hash) return

    const parts = hash.split('/')
    const page = parts[0] as any
    const slug = parts[1]

    const validPages = ['home', 'shop', 'product', 'cart', 'checkout', 'about', 'contact', 'account', 'admin', 'order-success', 'checkout-failed', 'privacy', 'terms', 'shipping']
    if (!validPages.includes(page)) return

    if (page === 'admin') {
      hasRoutedAdmin.current = true
    }

    navigate(page, slug ? { slug } : {})
  }, [])

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as { page?: string; params?: Record<string, string> } | null
      if (state?.page) {
        navigate(state.page as any, state.params || {})
      } else {
        const hash = window.location.hash.replace('#', '')
        const parts = hash.split('/')
        navigate(parts[0] as any, parts[1] ? { slug: parts[1] } : {})
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [navigate])

  // Close mobile menu on page change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [currentPage, setMobileMenuOpen])

  // Switch-based rendering with Suspense for lazy-loaded pages
  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <Suspense fallback={<PageLoader />}><HomePage initialData={initialHomeData} /></Suspense>
      case 'shop': return <Suspense fallback={<PageLoader />}><ShopPage /></Suspense>
      case 'product': return <Suspense fallback={<PageLoader />}><ProductDetailPage /></Suspense>
      case 'cart': return <Suspense fallback={<PageLoader />}><CartPage /></Suspense>
      case 'checkout': return <Suspense fallback={<PageLoader />}><CheckoutPage /></Suspense>
      case 'about': return <Suspense fallback={<PageLoader />}><AboutPage /></Suspense>
      case 'contact': return <Suspense fallback={<PageLoader />}><ContactPage /></Suspense>
      case 'account': return <Suspense fallback={<PageLoader />}><AccountPage /></Suspense>
      case 'admin': return <Suspense fallback={<PageLoader />}><AdminPage /></Suspense>
      case 'order-success': return <Suspense fallback={<PageLoader />}><OrderSuccessPage /></Suspense>
      case 'checkout-failed': return <Suspense fallback={<PageLoader />}><CheckoutFailedPage /></Suspense>
      case 'privacy': return <Suspense fallback={<PageLoader />}><PolicyPages page="privacy" /></Suspense>
      case 'terms': return <Suspense fallback={<PageLoader />}><PolicyPages page="terms" /></Suspense>
      case 'shipping': return <Suspense fallback={<PageLoader />}><PolicyPages page="shipping" /></Suspense>
      case '404': return <Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>
      default: return <Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>
    }
  }

  const showLayout = currentPage !== 'admin'

  return (
    <div className="min-h-screen flex flex-col">
      <SeoManager />
      {showLayout && <Navbar />}
      <main className={currentPage === 'admin' ? '' : 'flex-1'}>
        {renderPage()}
      </main>
      {showLayout && <Footer />}
      {showLayout && <Chatbot />}
    </div>
  )
}
