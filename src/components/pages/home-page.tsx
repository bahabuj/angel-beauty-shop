'use client'

import { useNavStore } from '@/store/nav-store'
import { useCartStore } from '@/store/cart-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'
import type { HomeData } from '@/lib/home-data'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag,
  Star,
  ArrowRight,
  Shield,
  Truck,
  Award,
  Sparkles,
  Heart,
  ChevronLeft,
  ChevronRight,
  Check,
  Leaf,
  Droplets,
  Sun,
  Instagram,
} from 'lucide-react'
import { toast } from 'sonner'
import PaymentShowcaseSection from '@/components/checkout/payment-showcase'

// Detect whether a stored media URL is a video (used to render <video> vs <Image>).
function isVideoUrl(url: string): boolean {
  if (!url) return false
  if (/\/video\/upload\//i.test(url)) return true
  if (/\/image\/upload\//i.test(url)) return false
  return /\.(mp4|webm|ogg|ogv|mov|mkv)(\?|$)/i.test(url)
}

interface Variant {
  id: string
  name: string
  sku?: string | null
  price: number
  comparePrice?: number | null
  stock: number
  active?: boolean
  order?: number
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  categorySlug: string
  images: string
  featured: boolean
  newArrival: boolean
  bestSeller: boolean
  freeShipping?: boolean
  stock: number
  description: string
  benefits: string
  variants?: Variant[]
}

/**
 * A product is considered "multi-variant" (and therefore eligible for the
 * "From $X" price label) when it has more than one ACTIVE variant. The price
 * shown is `product.price` — a denormalized cache equal to the min active
 * variant price maintained by the backend.
 */
function hasMultipleActiveVariants(product: Product): boolean {
  if (!product.variants || product.variants.length <= 1) return false
  return product.variants.filter((v) => v.active !== false).length > 1
}

interface Promo {
  id: string
  title: string
  subtitle: string | null
  image: string | null
  ctaText: string | null
  ctaLink: string | null
  active: boolean
}

interface HeroSlideData { id: string; mediaUrl: string; mediaType: string; overlayDark: number; kenBurns: boolean }
interface PartnerData { id: string; name: string; logo: string; url: string | null }
interface TransformationData { id: string; name: string; duration: string; result: string; beforeImg: string; afterImg: string; active: boolean; order: number }
interface InspirationData { id: string; label: string; tip: string; image: string; icon: string; color: string; active: boolean; order: number }

interface HomePageProps {
  /** Server-rendered initial data — lets the page paint instantly with no API round-trip */
  initialData?: HomeData | null
}

export default function HomePage({ initialData }: HomePageProps = {}) {
  const navigate = useNavStore((s) => s.navigate)
  const addItem = useCartStore((s) => s.addItem)
  // Seed state from SSR data so the first paint is complete (no spinner, no empty grid)
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>(
    (initialData?.featured as Product[]) || []
  )
  const [newArrivals, setNewArrivals] = useState<Product[]>(
    (initialData?.newArrivals as Product[]) || []
  )
  const [bestSellers, setBestSellers] = useState<Product[]>(
    (initialData?.bestSellers as Product[]) || []
  )
  const [promos, setPromos] = useState<Promo[]>(
    (initialData?.promos as Promo[]) || []
  )
  const [currentPromo, setCurrentPromo] = useState(0)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [heroSlides, setHeroSlides] = useState<HeroSlideData[]>(
    (initialData?.heroSlides as HeroSlideData[]) || []
  )
  const [partners, setPartners] = useState<PartnerData[]>(
    (initialData?.partners as PartnerData[]) || []
  )
  const [transformations, setTransformations] = useState<TransformationData[]>(
    (initialData?.transformations as TransformationData[]) || []
  )
  const [inspirationItems, setInspirationItems] = useState<InspirationData[]>(
    (initialData?.inspirationItems as InspirationData[]) || []
  )
  const hasInitialData = !!(initialData && (initialData.featured?.length || initialData.heroSlides?.length))

  // Fallback transformation data for initial render
  const DEFAULT_TRANSFORMATIONS: TransformationData[] = [
    { id: 'default-1', name: 'Sarah J.', duration: '4 weeks', result: 'Smoother, brighter skin', beforeImg: '/images/transformations/before-1.png', afterImg: '/images/transformations/after-1.png', active: true, order: 0 },
    { id: 'default-2', name: 'Chioma A.', duration: '6 weeks', result: 'Reduced dark spots & even tone', beforeImg: '/images/transformations/before-2.png', afterImg: '/images/transformations/after-2.png', active: true, order: 1 },
    { id: 'default-3', name: 'Amina B.', duration: '3 weeks', result: 'Hydrated, glowing complexion', beforeImg: '/images/transformations/before-3.png', afterImg: '/images/transformations/after-3.png', active: true, order: 2 },
  ]
  const displayTransformations = transformations.length > 0 ? transformations : DEFAULT_TRANSFORMATIONS

  // Fallback inspiration data for initial render
  const DEFAULT_INSPIRATION: InspirationData[] = [
    { id: 'default-1', label: 'Daily Essentials', tip: 'Start your day with a gentle cleanser & SPF moisturizer', image: '/images/social/social-1.png', icon: 'Sun', color: 'from-amber-500/80', active: true, order: 0 },
    { id: 'default-2', label: 'Glowing Skin', tip: 'Vitamin C serum + hyaluronic acid = instant radiance', image: '/images/social/social-2.png', icon: 'Sparkles', color: 'from-gold/80', active: true, order: 1 },
    { id: 'default-3', label: 'Luxury Creams', tip: 'Night creams work wonders while you sleep', image: '/images/social/social-3.png', icon: 'Droplets', color: 'from-rose-500/80', active: true, order: 2 },
    { id: 'default-4', label: 'Skin Routine', tip: 'Consistency is key — 3 steps morning & night', image: '/images/social/social-4.png', icon: 'Check', color: 'from-emerald-500/80', active: true, order: 3 },
    { id: 'default-5', label: 'Golden Oils', tip: 'Rosehip oil fades scars & boosts hydration', image: '/images/social/social-5.png', icon: 'Droplets', color: 'from-yellow-600/80', active: true, order: 4 },
    { id: 'default-6', label: 'Spa Self-Care', tip: 'Weekly face masks transform your skin texture', image: '/images/social/social-6.png', icon: 'Heart', color: 'from-pink-500/80', active: true, order: 5 },
    { id: 'default-7', label: 'Vitamin C Glow', tip: 'Brighten dull skin with a daily C serum', image: '/images/social/social-7.png', icon: 'Sun', color: 'from-orange-500/80', active: true, order: 6 },
    { id: 'default-8', label: 'Natural Beauty', tip: 'Less is more — embrace your natural glow', image: '/images/social/social-8.png', icon: 'Leaf', color: 'from-green-500/80', active: true, order: 7 },
  ]
  const displayInspiration = inspirationItems.length > 0 ? inspirationItems : DEFAULT_INSPIRATION

  // Map icon names to components for inspiration section
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = { Sun, Sparkles, Droplets, Heart, Leaf, Check }
  const DEFAULT_PARTNERS: PartnerData[] = [
    { id: 'default-1', name: 'LUXORA', logo: '/images/partners/partner-1.png', url: '#' },
    { id: 'default-2', name: 'GLOWEN', logo: '/images/partners/partner-2.png', url: '#' },
    { id: 'default-3', name: 'ÉLARA', logo: '/images/partners/partner-3.png', url: '#' },
    { id: 'default-4', name: 'VERDANA', logo: '/images/partners/partner-4.png', url: '#' },
    { id: 'default-5', name: 'SERENIA', logo: '/images/partners/partner-5.png', url: '#' },
    { id: 'default-6', name: 'DERMIS', logo: '/images/partners/partner-6.png', url: '#' },
  ]
  const displayPartners = partners.length > 0 ? partners : DEFAULT_PARTNERS

  useEffect(() => {
    // If we already have SSR data, do a silent background refresh after mount
    // so content stays fresh without blocking the first paint.
    if (hasInitialData) {
      // Background refresh — non-blocking, keeps cache warm
      const controller = new AbortController()
      fetch('/api/home-data', { signal: controller.signal })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data?.success) return
          if (data.featured?.length) setFeaturedProducts(data.featured)
          if (data.newArrivals?.length) setNewArrivals(data.newArrivals)
          if (data.bestSellers?.length) setBestSellers(data.bestSellers)
          if (data.promos?.length) setPromos(data.promos)
          if (data.heroSlides?.length) setHeroSlides(data.heroSlides)
          if (data.partners?.length) setPartners(data.partners)
          if (data.transformations?.length) setTransformations(data.transformations)
          if (data.inspirationItems?.length) setInspirationItems(data.inspirationItems)
        })
        .catch(() => { /* background refresh — ignore errors */ })
      return () => controller.abort()
    }

    // No SSR data — fetch with retry (cold-start path)
    let attempts = 0
    const maxAttempts = 3
    function loadData() {
      fetch('/api/home-data')
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then(data => {
          if (!data.success) return
          if (data.featured?.length) setFeaturedProducts(data.featured)
          if (data.newArrivals?.length) setNewArrivals(data.newArrivals)
          if (data.bestSellers?.length) setBestSellers(data.bestSellers)
          if (data.promos?.length) setPromos(data.promos)
          if (data.heroSlides?.length) setHeroSlides(data.heroSlides)
          if (data.partners?.length) setPartners(data.partners)
          if (data.transformations?.length) setTransformations(data.transformations)
          if (data.inspirationItems?.length) setInspirationItems(data.inspirationItems)
        })
        .catch(err => {
          attempts++
          if (attempts < maxAttempts) {
            setTimeout(loadData, 2000 * attempts)
          } else {
            console.warn('Failed to load home data after retries:', err)
          }
        })
    }
    loadData()
  }, [hasInitialData])

  useEffect(() => {
    if (promos.length <= 1) return
    const timer = setInterval(() => {
      setCurrentPromo(prev => (prev + 1) % promos.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [promos.length])

  const handleAddToCart = (product: Product) => {
    const images: string[] = JSON.parse(product.images || '[]')
    const added = addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: images[0] || '/images/products/placeholder.jpg',
      slug: product.slug,
      freeShipping: product.freeShipping || false,
    })
    if (added) {
      toast.success(`${product.name} added to cart!`, {
        description: 'View your cart to proceed to checkout',
      })
    } else {
      toast.info(`${product.name} is already in your cart`, {
        description: 'You can adjust the quantity from your cart',
      })
    }
  }

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsletterEmail) return
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      })
      const data = await res.json()
      if (data.success) {
        setSubscribed(true)
        setNewsletterEmail('')
        toast.success('Welcome to the Angel Beauty Family!')
      } else {
        toast.error(data.error || 'Subscription failed')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  }

  const ProductCard = ({ product }: { product: Product }) => {
    const images: string[] = JSON.parse(product.images || '[]')
    const discount = product.comparePrice ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) : 0
    const categoryColors: Record<string, string> = {
      cleansers: 'bg-blue-100 text-blue-700',
      moisturizers: 'bg-pink-100 text-pink-700',
      serums: 'bg-purple-100 text-purple-700',
      'face-masks': 'bg-green-100 text-green-700',
      'body-care': 'bg-orange-100 text-orange-700',
      'lip-care': 'bg-rose-100 text-rose-700',
      'gift-sets': 'bg-gold/20 text-gold',
      accessories: 'bg-gray-100 text-gray-700',
    }

    return (
      <Card className="premium-card border-blush/30 bg-white overflow-hidden group cursor-pointer" onClick={() => navigate('product', { slug: product.slug })}>
        <div className="relative aspect-[4/3] overflow-hidden">
          {images[0] ? (
            isVideoUrl(images[0]) ? (
              <video
                src={images[0]}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              <Image
                src={images[0]}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            )
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blush/30 to-cream flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-white/60 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-gold" />
                </div>
                <p className="text-xs text-foreground/40 font-medium">{product.categorySlug}</p>
              </div>
            </div>
          )}
          {discount > 0 && (
            <Badge className="absolute top-3 left-3 bg-rose text-white text-[10px]">
              -{discount}%
            </Badge>
          )}
          {product.newArrival && (
            <Badge className="absolute top-3 right-3 bg-gold text-white text-[10px]">
              NEW
            </Badge>
          )}
          {/* Smooth hover overlay — gradient from bottom, no layout shift */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); navigate('product', { slug: product.slug }) }}
                className="bg-white/90 text-foreground hover:bg-white text-xs backdrop-blur-sm"
              >
                View Details
              </Button>
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleAddToCart(product) }}
                className="bg-gold text-white hover:bg-gold-light text-xs"
              >
                <ShoppingBag className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="mb-1.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${categoryColors[product.categorySlug] || 'bg-gray-100 text-gray-700'}`}>
              {product.categorySlug}
            </span>
          </div>
          <h3 className="font-semibold text-sm mb-1 line-clamp-1 group-hover:text-gold transition-colors duration-300"
          >
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gold">
              {hasMultipleActiveVariants(product) ? 'From ' : ''}${product.price.toLocaleString()}
            </span>
            {product.comparePrice && (
              <span className="text-xs text-muted-foreground line-through">${product.comparePrice.toLocaleString()}</span>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Hero background slideshow state
  const [heroBgIndex, setHeroBgIndex] = useState(0)

  // Fallback hero images if no DB slides
  const FALLBACK_HERO_IMAGES = [
    '/images/hero/hero-2.png',
    '/images/hero/hero-3.png',
  ]
  const heroItems = heroSlides.length > 0
    ? heroSlides
    : FALLBACK_HERO_IMAGES.map((url, i) => ({ id: `fallback-${i}`, mediaUrl: url, mediaType: 'image', overlayDark: 0.5, kenBurns: true }))

  useEffect(() => {
    if (heroItems.length <= 1) return
    const timer = setInterval(() => {
      setHeroBgIndex(prev => (prev + 1) % heroItems.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [heroItems.length])

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* Cinematic Image Motion Background */}
        <div className="absolute inset-0">
          {heroItems.map((slide, i) => {
            // PERF: only mount the active slide + the next one (preloaded).
            // Previously ALL slides (including a 3.3MB autoplay video) were
            // mounted at once, causing every video/image to download on first
            // paint. Now inactive slides are unmounted → zero network cost.
            const isActive = i === heroBgIndex
            const isPreloadNext = i === (heroBgIndex + 1) % heroItems.length
            if (!isActive && !isPreloadNext) return null
            return (
            <motion.div
              key={slide.id}
              className="absolute inset-0"
              initial={false}
              animate={{
                opacity: i === heroBgIndex ? 1 : 0,
                scale: i === heroBgIndex && slide.kenBurns ? 1.08 : 1,
              }}
              transition={{
                opacity: { duration: 1.8, ease: 'easeInOut' },
                scale: { duration: 8, ease: 'linear' },
              }}
              style={{ zIndex: i === heroBgIndex ? 1 : 0 }}
            >
              {slide.mediaType === 'video' ? (
                <video
                  src={slide.mediaUrl}
                  autoPlay={isActive}
                  muted
                  loop
                  playsInline
                  preload={isActive ? 'auto' : 'metadata'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image
                  src={slide.mediaUrl}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className="object-cover"
                />
              )}
            </motion.div>
            )
          })}
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/20 z-[2]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 z-[2]" />
          {/* Warm golden tint overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-rose/10 z-[2]" />
        </div>

        {/* Floating decorative elements */}
        <div className="absolute top-32 left-[15%] animate-float opacity-30 z-[3]">
          <Sparkles className="w-8 h-8 text-gold-light" />
        </div>
        <div className="absolute top-48 right-[25%] animate-float opacity-25 z-[3]" style={{ animationDelay: '1s' }}>
          <Heart className="w-6 h-6 text-rose-light" />
        </div>
        <div className="absolute bottom-32 left-[30%] animate-float opacity-25 z-[3]" style={{ animationDelay: '2s' }}>
          <Droplets className="w-7 h-7 text-gold-light" />
        </div>

        {/* Slideshow indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-[3]">
          {heroItems.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroBgIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === heroBgIndex ? 'w-8 bg-gold' : 'w-4 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        <div className="relative max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-[3]">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Badge className="bg-white/15 text-white border-white/25 mb-4 backdrop-blur-sm">✨ Premium Skincare Collection</Badge>
              </motion.div>
              <motion.h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-white"
                style={{ fontFamily: 'var(--font-playfair), serif' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                Reveal Your
                <span className="block bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent">Natural Glow</span>
              </motion.h1>
              <motion.p
                className="text-lg text-white/80 max-w-lg mb-8 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
              >
                Premium skincare products designed to help you feel confident, radiant and beautiful. Discover your perfect routine today.
              </motion.p>
              <motion.div
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.9 }}
              >
                <Button
                  onClick={() => navigate('shop')}
                  className="bg-gold hover:bg-gold-light text-white px-8 py-3 rounded-full beauty-btn text-sm font-semibold shadow-lg shadow-gold/30"
                  size="lg"
                >
                  Shop Now <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  onClick={() => navigate('shop')}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/15 hover:text-white px-8 py-3 rounded-full text-sm font-semibold backdrop-blur-sm"
                  size="lg"
                >
                  View Products
                </Button>
              </motion.div>
              <motion.div
                className="flex items-center gap-6 mt-8 text-sm text-white/70"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.1 }}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gold-light" /> Secure Payment
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-gold-light" /> Fast Delivery
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-gold-light" /> Premium Quality
                </div>
              </motion.div>
            </motion.div>

            
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeInUp} className="text-center mb-12">
              <Badge className="bg-gold/10 text-gold border-gold/20 mb-3">Best Sellers</Badge>
              <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                Featured Products
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Our most loved skincare essentials, handpicked for you.
              </p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.slice(0, 8).map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Button
                onClick={() => navigate('shop')}
                variant="outline"
                className="border-gold/40 text-gold hover:bg-gold hover:text-white rounded-full px-8"
              >
                View All Products <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Promo Billboard — Animated Sliding Carousel */}
      {promos.length > 0 && (
        <section className="py-12">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl overflow-hidden min-h-[320px] sm:min-h-[360px] flex items-center">

              {/* ===== ANIMATED SLIDING BACKGROUNDS ===== */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPromo}
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '-100%', opacity: 0 }}
                  transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute inset-0"
                >
                  {/* Background image (if promo has one) */}
                  {promos[currentPromo]?.image ? (
                    <>
                      {/* Ken Burns slow zoom on the image */}
                      <motion.div
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={promos[currentPromo].image!}
                          alt={promos[currentPromo].title}
                          fill
                          sizes="(max-width: 768px) 100vw, 1200px"
                          className="object-cover"
                        />
                      </motion.div>
                      {/* Dark overlay for text readability */}
                      <div className="absolute inset-0 bg-black/40" />
                    </>
                  ) : (
                    <>
                      {/* Dynamic gradient per promo (fallback when no image) */}
                      <div className={`absolute inset-0 ${
                        currentPromo % 3 === 0
                          ? 'bg-gradient-to-br from-gold via-gold-light to-gold'
                          : currentPromo % 3 === 1
                            ? 'bg-gradient-to-br from-rose-dark via-rose to-rose-light'
                            : 'bg-gradient-to-br from-gold via-rose-light to-gold-light'
                      }`} />

                      {/* Ken Burns slow zoom effect */}
                      <motion.div
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute inset-0"
                      >
                        {/* Large floating orbs - moving continuously */}
                        <motion.div
                          animate={{ x: [0, 80, 0], y: [0, -40, 0] }}
                          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-2xl"
                        />
                        <motion.div
                          animate={{ x: [0, -60, 0], y: [0, 50, 0] }}
                          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                          className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-white/8 blur-3xl"
                        />
                        <motion.div
                          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
                          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-white/6 blur-2xl"
                        />
                      </motion.div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* ===== ANIMATED FLOATING ORBS ===== */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[
                  { size: 80, top: '20%', left: '10%', delay: 0, dur: 8 },
                  { size: 60, top: '60%', left: '80%', delay: 2, dur: 10 },
                  { size: 50, top: '40%', left: '50%', delay: 1, dur: 12 },
                ].map((p, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      y: [0, -20, 0],
                      x: [0, 10, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: p.dur,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: p.delay,
                    }}
                    className="absolute rounded-full bg-white/10 blur-xl"
                    style={{
                      width: p.size,
                      height: p.size,
                      top: p.top,
                      left: p.left,
                    }}
                  />
                ))}
              </div>



              {/* ===== CONTENT LAYER ===== */}
              <div className="relative z-10 w-full px-8 sm:px-12 py-10 text-white text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPromo}
                    initial={{ opacity: 0, x: 80, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -80, scale: 0.95 }}
                    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {/* Animated badge */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 mb-4"
                    >
                      <motion.span
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </motion.span>
                      <span className="text-xs font-medium tracking-wider uppercase">Special Offer</span>
                    </motion.div>

                    <motion.h2
                      className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3"
                      style={{ fontFamily: 'var(--font-playfair), serif' }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {promos[currentPromo]?.title}
                    </motion.h2>

                    <motion.p
                      className="text-white/80 text-lg sm:text-xl mb-6 max-w-lg mx-auto"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      {promos[currentPromo]?.subtitle}
                    </motion.p>

                    {promos[currentPromo]?.ctaText && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Button
                          onClick={() => navigate(promos[currentPromo]?.ctaLink as any || 'shop')}
                          className="bg-white text-gold hover:bg-cream hover:scale-105 rounded-full px-8 font-semibold shadow-lg shadow-black/10 transition-transform"
                          size="lg"
                        >
                          {promos[currentPromo]?.ctaText}
                          <motion.span
                            animate={{ x: [0, 4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </motion.span>
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation controls */}
                {promos.length > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-8">
                    <button
                      onClick={() => setCurrentPromo(prev => (prev - 1 + promos.length) % promos.length)}
                      className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/25 transition-all duration-300 hover:scale-110"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2">
                      {promos.map((_, i) => (
                        <button key={i} onClick={() => setCurrentPromo(i)} className="group">
                          <motion.div
                            animate={{
                              width: i === currentPromo ? 32 : 10,
                              height: 10,
                              backgroundColor: i === currentPromo ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.35)',
                            }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="rounded-full"
                          />
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPromo(prev => (prev + 1) % promos.length)}
                      className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/25 transition-all duration-300 hover:scale-110"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-16 sm:py-20 bg-gradient-to-b from-cream/50 to-transparent">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeInUp} className="text-center mb-12">
              <Badge className="bg-rose/10 text-rose border-rose/20 mb-3">Just In</Badge>
              <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                New Arrivals
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Discover our latest additions to the skincare collection.
              </p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newArrivals.slice(0, 4).map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {displayTransformations.length > 0 && (
      <section className="py-16 sm:py-20 bg-gradient-to-b from-cream/30 to-transparent">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <Badge className="bg-gold/10 text-gold border-gold/20 mb-3">Real Results</Badge>
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              See the Transformation
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Real results from real customers who switched to Angel Beauty.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {displayTransformations.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                <Card className="premium-card border-blush/30 overflow-hidden group">
                  <div className="grid grid-cols-2 relative">
                    {/* Before */}
                    <div className="relative aspect-square overflow-hidden">
                      <Image
                        src={item.beforeImg}
                        alt={`${item.name} before treatment`}
                        fill
                        sizes="(max-width: 640px) 50vw, 250px"
                        className="object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wider">
                          Before
                        </span>
                      </div>
                    </div>
                    {/* After */}
                    <div className="relative aspect-square overflow-hidden">
                      <Image
                        src={item.afterImg}
                        alt={`${item.name} after treatment`}
                        fill
                        sizes="(max-width: 640px) 50vw, 250px"
                        className="object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center gap-1 bg-gold/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wider">
                          <Sparkles className="w-2.5 h-2.5" />
                          After
                        </span>
                      </div>
                    </div>
                    {/* Divider line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/60 z-10">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center">
                        <ArrowRight className="w-3 h-3 text-gold" />
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4 text-center">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.duration}</p>
                    <p className="text-xs text-gold mt-1">{item.result}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Why Choose Us */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-cream/50 to-transparent">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              Why Choose Angel Beauty?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              We&apos;re committed to bringing you the best in premium skincare.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Leaf, title: 'Natural Ingredients', desc: 'Made with carefully sourced natural ingredients for gentle, effective results.' },
              { icon: Shield, title: 'Dermatologist Tested', desc: 'All products are rigorously tested and approved by skincare professionals.' },
              { icon: Heart, title: 'Cruelty Free', desc: 'We never test on animals. Beauty without cruelty is our promise.' },
              { icon: Award, title: 'Premium Quality', desc: 'Only the finest ingredients and formulations make it into our products.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="text-center p-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gold/10 flex items-center justify-center">
                    <item.icon className="w-8 h-8 text-gold" />
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-20">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <Badge className="bg-rose/10 text-rose border-rose/20 mb-3">Love Letters</Badge>
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              What Our Customers Say
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { name: 'Chioma A.', text: 'The Vitamin C Serum completely transformed my skin! My dark spots are fading and my skin glows like never before.', rating: 5 },
              { name: 'Amara O.', text: 'I love the Honey Glow Moisturizer. It keeps my skin hydrated all day without feeling greasy. Absolute game changer!', rating: 5 },
              { name: 'Fatima B.', text: 'The Rose Petal Cleansing Oil is divine! It removes all my makeup effortlessly and leaves my skin so soft.', rating: 5 },
            ].map((review, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                <Card className="premium-card border-blush/30 p-6">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: review.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-gold text-gold" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/80 mb-4 italic">&ldquo;{review.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-rose/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-gold">{review.name[0]}</span>
                    </div>
                    <span className="text-sm font-medium">{review.name}</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram-style Beauty Feed Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-cream/50 to-transparent">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-3">
              <Instagram className="w-5 h-5 text-gold" />
              <span className="text-sm font-semibold tracking-wider uppercase text-gold">@angelbeauty</span>
            </div>
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              Beauty Inspiration Daily
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">Follow us for skincare tips, product reveals & exclusive offers</p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {displayInspiration.map((item, i) => {
              const IconComp = iconMap[item.icon] || Sparkles
              return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="aspect-square rounded-2xl overflow-hidden group cursor-pointer relative"
              >
                <Image
                  src={item.image}
                  alt={item.label}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 250px"
                  className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                {/* Always-visible label tag */}
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold px-2.5 py-1 rounded-full text-foreground shadow-sm">
                    <IconComp className="w-3 h-3 text-gold" />
                    {item.label}
                  </span>
                </div>
                {/* Hover overlay with beauty tip */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end p-4">
                  <p className="text-white text-xs sm:text-sm font-medium text-center leading-relaxed">{item.tip}</p>
                </div>
                {/* Bottom gradient accent */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              </motion.div>
              )
            })}
          </div>
          <div className="text-center mt-8">
            <Button
              variant="outline"
              className="border-gold/40 text-gold hover:bg-gold hover:text-white rounded-full px-8"
              onClick={() => window.open('https://instagram.com/angelbeauty', '_blank')}
            >
              <Instagram className="w-4 h-4 mr-2" /> Follow Us on Instagram
            </Button>
          </div>
        </div>
      </section>

      {/* Premium Payment Showcase */}
      <PaymentShowcaseSection />

      {/* Final CTA */}
      <section className="py-20">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center bg-gradient-to-r from-gold via-gold-light to-gold rounded-3xl p-12 sm:p-16 text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              Ready to Glow?
            </h2>
            <p className="text-white/80 max-w-lg mx-auto mb-8">
              Start your skincare journey with Angel Beauty today. Your skin deserves the best.
            </p>
            <Button
              onClick={() => navigate('shop')}
              className="bg-white text-gold hover:bg-cream rounded-full px-10 py-3 text-sm font-semibold"
              size="lg"
            >
              Shop Now <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Trusted By Partners — Motion Text Graphics */}
      <section className="partner-motion-section overflow-hidden">
        {/* Decorative top label */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center pt-10 pb-6 relative z-10"
        >
          <span className="partner-section-label">
            <Sparkles className="w-3 h-3" />
            Trusted By Industry Leaders
            <Sparkles className="w-3 h-3" />
          </span>
        </motion.div>

        {/* Row 1 — scrolling left */}
        <div className="partner-motion-marquee">
          <div className="partner-motion-track partner-motion-track-left">
            {[...displayPartners, ...displayPartners, ...displayPartners, ...displayPartners].map((partner, i) => (
              <div key={`r1-${partner.id}-${i}`} className="partner-motion-item">
                {partner.url && partner.url !== '#' ? (
                  <a href={partner.url} target="_blank" rel="noopener noreferrer" className="partner-motion-link">
                    <Image src={partner.logo} alt={partner.name} width={96} height={48} className="partner-motion-logo object-contain" />
                    <span className="partner-motion-name">{partner.name}</span>
                  </a>
                ) : (
                  <div className="partner-motion-link">
                    <Image src={partner.logo} alt={partner.name} width={96} height={48} className="partner-motion-logo object-contain" />
                    <span className="partner-motion-name">{partner.name}</span>
                  </div>
                )}
                <span className="partner-motion-separator">&#x2022;</span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 — scrolling right (reverse) */}
        <div className="partner-motion-marquee mt-4">
          <div className="partner-motion-track partner-motion-track-right">
            {[...displayPartners.slice().reverse(), ...displayPartners.slice().reverse(), ...displayPartners.slice().reverse(), ...displayPartners.slice().reverse()].map((partner, i) => (
              <div key={`r2-${partner.id}-${i}`} className="partner-motion-item">
                {partner.url && partner.url !== '#' ? (
                  <a href={partner.url} target="_blank" rel="noopener noreferrer" className="partner-motion-link">
                    <span className="partner-motion-name">{partner.name}</span>
                    <Image src={partner.logo} alt={partner.name} width={96} height={48} className="partner-motion-logo object-contain" />
                  </a>
                ) : (
                  <div className="partner-motion-link">
                    <span className="partner-motion-name">{partner.name}</span>
                    <Image src={partner.logo} alt={partner.name} width={96} height={48} className="partner-motion-logo object-contain" />
                  </div>
                )}
                <span className="partner-motion-separator">&#x2726;</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom fade overlay */}
        <div className="partner-motion-bottom-fade" />
      </section>
    </div>
  )
}
