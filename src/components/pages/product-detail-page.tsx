'use client'

import { useNavStore } from '@/store/nav-store'
import { useCartStore } from '@/store/cart-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect, useState, useRef } from 'react'
import { ShoppingBag, Heart, Shield, Truck, Award, Check, Minus, Plus, Sparkles, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

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
  sku: string | null
  price: number
  comparePrice: number | null
  stock: number
  weight: string | null
  active: boolean
  order: number
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  categorySlug: string
  images: string
  benefits: string
  ingredients: string
  howToUse: string
  stock: number
  description: string
  featured: boolean
  newArrival: boolean
  bestSeller: boolean
  freeShipping?: boolean
  variants?: Variant[]
}

export default function ProductDetailPage() {
  const pageParams = useNavStore((s) => s.pageParams)
  const navigate = useNavStore((s) => s.navigate)
  const addItem = useCartStore((s) => s.addItem)
  const currentPage = useNavStore((s) => s.currentPage)
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const lastSlugRef = useRef<string>('')
  const isAddingRef = useRef(false)

  // Fetch product data when slug changes
  useEffect(() => {
    const slug = pageParams.slug
    if (!slug) return
    // Skip if slug hasn't actually changed
    if (slug === lastSlugRef.current && product) return
    lastSlugRef.current = slug

    // Only show full-page skeleton on the very first product load.
    // On subsequent navigations (e.g., clicking a related product or
    // going back to shop and clicking another product), the old product
    // stays visible while the new one loads — no blink/flash.
    if (product) {
      setLoading(true)
    }

    let cancelled = false

    void (async () => {
      try {
        const res = await fetch(`/api/products/slug/${slug}`)
        const data = await res.json()
        if (cancelled) return
        if (data.success) {
          setProduct(data.product)
          // Reset interaction state when product changes
          setQuantity(1)
          setSelectedImage(0)
          // Auto-select the first active variant (variants are sorted by order asc,
          // so the first one is the default). If only a single "Standard" variant
          // exists, we keep selection null to fall back to product-level price/stock.
          const vs: Variant[] = (data.product.variants ?? []).filter(
            (v: Variant) => v.active
          )
          const isOnlyStandard =
            vs.length === 1 && vs[0].name.toLowerCase() === 'standard'
          setSelectedVariantId(vs.length > 1 || (!isOnlyStandard && vs.length === 1) ? vs[0]?.id ?? null : null)
          // Fetch related products
          const relRes = await fetch(`/api/products?category=${data.product.categorySlug}`)
          const relData = await relRes.json()
          if (cancelled) return
          if (relData.success) {
            setRelatedProducts(relData.products.filter((p: Product) => p.id !== data.product.id).slice(0, 4))
          }
        }
      } catch (err) {
        console.error('Failed to load product:', err)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setInitialLoad(false)
        }
      }
    })()

    return () => { cancelled = true }
  }, [pageParams.slug])

  // Reset scroll position when this page becomes visible
  useEffect(() => {
    if (currentPage === 'product') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage, pageParams.slug])

  const handleAddToCart = () => {
    if (!product || isAddingRef.current) return
    isAddingRef.current = true
    const images: string[] = JSON.parse(product.images || '[]')
    // Derive selected variant from current product state
    const variants = product.variants ?? []
    const activeVariants = variants.filter(v => v.active)
    const showVariantPicker = activeVariants.length > 1
    const selectedVariant = showVariantPicker
      ? (activeVariants.find(v => v.id === selectedVariantId) ?? activeVariants[0] ?? null)
      : null
    const added = addItem({
      id: product.id,
      name: product.name,
      price: selectedVariant ? selectedVariant.price : product.price,
      image: images[0] || '/images/products/placeholder.jpg',
      slug: product.slug,
      quantity,
      freeShipping: product.freeShipping || false,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      sku: selectedVariant?.sku ?? null,
    }, true) // allowIncrement — user chose quantity explicitly
    if (added) {
      const variantSuffix = selectedVariant ? ` (${selectedVariant.name})` : ''
      toast.success(`${quantity}x ${product.name}${variantSuffix} added to cart!`)
    } else {
      const variantSuffix = selectedVariant ? ` (${selectedVariant.name})` : ''
      toast.info(`Updated ${product.name}${variantSuffix} quantity in cart`)
    }
    // Reset the guard after a short delay to prevent double-clicks
    setTimeout(() => { isAddingRef.current = false }, 300)
  }

  const handleBuyNow = () => {
    if (!product || isAddingRef.current) return
    isAddingRef.current = true
    const images: string[] = JSON.parse(product.images || '[]')
    // Derive selected variant from current product state
    const variants = product.variants ?? []
    const activeVariants = variants.filter(v => v.active)
    const showVariantPicker = activeVariants.length > 1
    const selectedVariant = showVariantPicker
      ? (activeVariants.find(v => v.id === selectedVariantId) ?? activeVariants[0] ?? null)
      : null
    addItem({
      id: product.id,
      name: product.name,
      price: selectedVariant ? selectedVariant.price : product.price,
      image: images[0] || '/images/products/placeholder.jpg',
      slug: product.slug,
      quantity,
      freeShipping: product.freeShipping || false,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      sku: selectedVariant?.sku ?? null,
    }, true) // allowIncrement — user chose quantity explicitly
    // Small delay to let the cart store persist before navigating
    setTimeout(() => {
      useNavStore.getState().navigate('cart')
      isAddingRef.current = false
    }, 100)
  }

  const handleRelatedProductClick = (slug: string) => {
    // Navigate to the new product — the useEffect will handle data fetching
    // The current product stays visible until the new one loads (no blink)
    useNavStore.getState().navigate('product', { slug })
  }

  // Full-page loading skeleton only on initial load
  if (loading && initialLoad) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="aspect-square bg-blush/20 rounded-2xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-blush/20 rounded w-3/4 animate-pulse" />
            <div className="h-6 bg-blush/20 rounded w-1/2 animate-pulse" />
            <div className="h-20 bg-blush/20 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-20 text-center">
        <Sparkles className="w-12 h-12 text-gold/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Product not found</h2>
        <Button onClick={() => navigate('shop')} variant="outline" className="border-gold/30 text-gold">Back to Shop</Button>
      </div>
    )
  }

  const images: string[] = JSON.parse(product.images || '[]')
  const benefits: string[] = JSON.parse(product.benefits || '[]')

  // Variant derivation
  const variants = product.variants ?? []
  const activeVariants = variants.filter(v => v.active)
  const showVariantPicker = activeVariants.length > 1
  const selectedVariant = showVariantPicker
    ? (activeVariants.find(v => v.id === selectedVariantId) ?? activeVariants[0] ?? null)
    : null

  // Display values: use variant when picker is shown, otherwise fall back to product.
  const displayPrice = selectedVariant ? selectedVariant.price : product.price
  const displayComparePrice = selectedVariant ? selectedVariant.comparePrice : product.comparePrice
  const displayStock = selectedVariant ? selectedVariant.stock : product.stock
  const discount = displayComparePrice && displayComparePrice > displayPrice
    ? Math.round(((displayComparePrice - displayPrice) / displayComparePrice) * 100)
    : 0

  return (
    <div className="min-h-screen relative">
      {/* Subtle loading overlay for subsequent product loads (not the first one).
          This prevents the old product from suddenly disappearing while the new
          one is being fetched — instead we show a faint shimmer on top. */}
      {loading && !initialLoad && (
        <div className="absolute inset-0 z-10 bg-white/40 pointer-events-none flex items-start justify-center pt-16">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <button onClick={() => navigate('shop')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </button>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image gallery */}
          <div className="aspect-square rounded-2xl overflow-hidden relative">
            {images[0] ? (
              isVideoUrl(images[selectedImage] || images[0]) ? (
                <video
                  key={images[selectedImage] || images[0]}
                  src={images[selectedImage] || images[0]}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  preload="metadata"
                />
              ) : (
                <Image
                  key={images[selectedImage] || images[0]}
                  src={images[selectedImage] || images[0]}
                  alt={product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              )
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blush/30 via-cream to-blush/10 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/60 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-gold" />
                  </div>
                  <p className="text-sm text-foreground/40">{product.name}</p>
                </div>
              </div>
            )}
            {discount > 0 && (
              <Badge className="absolute top-4 left-4 bg-rose text-white">-{discount}%</Badge>
            )}
            {product.newArrival && (
              <Badge className="absolute top-4 right-4 bg-gold text-white">NEW</Badge>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-3 mt-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${i === selectedImage ? 'border-gold' : 'border-transparent'}`}
                >
                  {isVideoUrl(img) ? (
                    <video src={img} className="w-full h-full object-cover" muted loop playsInline preload="metadata" />
                  ) : (
                    <Image src={img} alt={`${product.name} ${i + 1}`} fill sizes="80px" className="object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Product info */}
          <div className="space-y-6">
            <div>
              <Badge variant="secondary" className="bg-blush/30 text-foreground/60 mb-3 capitalize">
                {product.categorySlug.replace('-', ' ')}
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                {product.name}
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gold">${displayPrice.toLocaleString()}</span>
                {displayComparePrice && (
                  <span className="text-lg text-muted-foreground line-through">${displayComparePrice.toLocaleString()}</span>
                )}
                {discount > 0 && (
                  <Badge className="bg-rose/10 text-rose">Save {discount}%</Badge>
                )}
              </div>
            </div>

            <p className="text-foreground/70 leading-relaxed">{product.description}</p>

            {/* Stock status */}
            <div className="flex items-center gap-2">
              {displayStock > 0 ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">In Stock ({displayStock} available)</span>
                </>
              ) : (
                <span className="text-sm text-destructive font-medium">Out of Stock</span>
              )}
            </div>

            {/* Variant (size) picker — shown above the quantity picker.
                Hidden when product has 0 or 1 active variant (e.g. single "Standard"). */}
            {showVariantPicker && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Size:</span>
                  {selectedVariant && (
                    <span className="text-sm text-muted-foreground">
                      {selectedVariant.name} — ${selectedVariant.price.toLocaleString()}
                      {selectedVariant.weight ? ` (${selectedVariant.weight})` : ''}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeVariants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        selectedVariantId === v.id
                          ? 'border-gold bg-gold/10 text-gold'
                          : 'border-blush/30 bg-white hover:border-gold/50'
                      } ${v.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={v.stock === 0}
                    >
                      {v.name}
                      {v.stock === 0 && <span className="ml-1 text-xs">(out)</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-blush/40 rounded-lg">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2.5 hover:bg-blush/20 transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-medium min-w-[3rem] text-center">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(displayStock, quantity + 1))} className="p-2.5 hover:bg-blush/20 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button
                onClick={handleAddToCart}
                disabled={displayStock === 0}
                className="flex-1 bg-gold hover:bg-gold-light text-white beauty-btn"
              >
                <ShoppingBag className="w-4 h-4 mr-2" /> Add to Cart
              </Button>
              <Button variant="outline" size="icon" className="border-blush/30">
                <Heart className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={handleBuyNow}
              disabled={displayStock === 0}
              className="w-full bg-foreground hover:bg-foreground/90 text-white py-3"
            >
              Buy Now
            </Button>


            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              {[
                { icon: Shield, label: 'Secure Payment' },
                { icon: Truck, label: 'Fast Delivery' },
                { icon: Award, label: 'Premium Quality' },
              ].map((badge) => (
                <div key={badge.label} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-blush/10">
                  <badge.icon className="w-5 h-5 text-gold" />
                  <span className="text-[11px] text-muted-foreground text-center">{badge.label}</span>
                </div>
              ))}
            </div>

            {/* Product details tabs */}
            <Tabs defaultValue="benefits" className="mt-6">
              <TabsList className="w-full bg-blush/10">
                <TabsTrigger value="benefits" className="flex-1">Benefits</TabsTrigger>
                <TabsTrigger value="ingredients" className="flex-1">Ingredients</TabsTrigger>
                <TabsTrigger value="howtouse" className="flex-1">How to Use</TabsTrigger>
              </TabsList>
              <TabsContent value="benefits" className="pt-4">
                <ul className="space-y-2">
                  {benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </TabsContent>
              <TabsContent value="ingredients" className="pt-4">
                <p className="text-sm text-foreground/70 leading-relaxed">{product.ingredients}</p>
              </TabsContent>
              <TabsContent value="howtouse" className="pt-4">
                <p className="text-sm text-foreground/70 leading-relaxed">{product.howToUse}</p>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-8" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {relatedProducts.map((p) => {
                const pImages: string[] = JSON.parse(p.images || '[]')
                return (
                  <Card
                    key={p.id}
                    className="premium-card border-blush/30 bg-white overflow-hidden cursor-pointer"
                    onClick={() => handleRelatedProductClick(p.slug)}
                  >
                    <div className="aspect-[4/3] overflow-hidden relative">
                      {pImages[0] ? (
                        <Image src={pImages[0]} alt={p.name} fill sizes="(max-width: 640px) 50vw, 200px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blush/30 to-cream flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-gold/40" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm line-clamp-1">{p.name}</h3>
                      {(() => {
                        const rpVariants = (p.variants ?? []).filter(v => v.active)
                        const showFrom = rpVariants.length > 1
                        return (
                          <span className="text-sm font-bold text-gold">
                            {showFrom && 'From '}${p.price.toLocaleString()}
                          </span>
                        )
                      })()}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
