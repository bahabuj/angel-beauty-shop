'use client'

import { useNavStore } from '@/store/nav-store'
import { useCartStore } from '@/store/cart-store'
import { useUIStore } from '@/store/ui-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEffect, useState, useRef, useCallback } from 'react'
import { ShoppingBag, Search, Sparkles, SlidersHorizontal, X } from 'lucide-react'
import { toast } from 'sonner'

// Detect whether a stored media URL is a video (used to render <video> vs <img>).
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

interface Category {
  id: string
  name: string
  slug: string
  description?: string | null
  image?: string | null
  active?: boolean
  order?: number
}

export default function ShopPage() {
  const navigate = useNavStore((s) => s.navigate)
  const addItem = useCartStore((s) => s.addItem)
  const searchQuery = useUIStore((s) => s.searchQuery)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const selectedCategory = useUIStore((s) => s.selectedCategory)
  const setSelectedCategory = useUIStore((s) => s.setSelectedCategory)
  const sortBy = useUIStore((s) => s.sortBy)
  const setSortBy = useUIStore((s) => s.setSortBy)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const fetchIdRef = useRef(0)

  // Fetch categories once
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(data => {
      if (data.success) {
        const activeCats = data.categories.filter((c: Category) => c.active !== false)
        setCategories(activeCats)
      }
    })
  }, [])

  // Fetch products when filters change
  useEffect(() => {
    // Increment fetch ID to handle race conditions
    const currentFetchId = ++fetchIdRef.current

    const params = new URLSearchParams()
    if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory)
    if (searchQuery) params.set('search', searchQuery)
    if (sortBy) params.set('sort', sortBy)

    fetch(`/api/products?${params.toString()}`).then(r => r.json()).then(data => {
      // Only apply if this is the latest fetch
      if (currentFetchId !== fetchIdRef.current) return
      if (data.success) {
        setProducts(data.products)
        if (initialLoad) {
          setLoading(false)
          setInitialLoad(false)
        }
      }
    })
  }, [selectedCategory, searchQuery, sortBy, initialLoad])

  const handleAddToCart = useCallback((product: Product) => {
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
      toast.success(`${product.name} added to cart!`)
    } else {
      toast.info(`${product.name} is already in your cart`, {
        description: 'You can adjust the quantity from your cart',
      })
    }
  }, [addItem])

  const getCategoryName = useCallback((slug: string) => {
    return categories.find(c => c.slug === slug)?.name || slug
  }, [categories])

  const categoryColors: Record<string, string> = {
    'face-body-creams': 'bg-amber-100 text-amber-700',
    'skincare-sets': 'bg-purple-100 text-purple-700',
    'turmeric-collection': 'bg-yellow-100 text-yellow-700',
    'beauty-soaps': 'bg-teal-100 text-teal-700',
    cleansers: 'bg-blue-100 text-blue-700',
    moisturizers: 'bg-pink-100 text-pink-700',
    serums: 'bg-purple-100 text-purple-700',
    'face-masks': 'bg-green-100 text-green-700',
    'body-care': 'bg-orange-100 text-orange-700',
    'lip-care': 'bg-rose-100 text-rose-700',
    'gift-sets': 'bg-gold/20 text-gold',
    accessories: 'bg-gray-100 text-gray-700',
    'whitening-products': 'bg-amber-100 text-amber-700',
    'vagina-care': 'bg-pink-100 text-pink-700',
    tea: 'bg-emerald-100 text-emerald-700',
    'skin-solutions': 'bg-cyan-100 text-cyan-700',
    organic: 'bg-green-100 text-green-700',
    lipsticks: 'bg-rose-100 text-rose-700',
    foundation: 'bg-stone-100 text-stone-700',
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-cream via-blush/10 to-cream py-12">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Our Collection
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Explore our curated range of premium skincare products
          </p>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-blush/30 focus:border-gold"
            />
          </div>
          <div className="flex gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] border-blush/30">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="border-blush/30 lg:hidden"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar filters */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-56 shrink-0`}>
            <div className="sticky top-24 space-y-6">
              <div>
                <h3 className="font-semibold text-sm mb-3">Categories</h3>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${selectedCategory === 'all' ? 'bg-gold/10 text-gold font-medium' : 'text-muted-foreground hover:bg-blush/20'}`}
                  >
                    All Products
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${selectedCategory === cat.slug ? 'bg-gold/10 text-gold font-medium' : 'text-muted-foreground hover:bg-blush/20'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {(selectedCategory !== 'all' || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedCategory('all'); setSearchQuery('') }}
                  className="text-muted-foreground"
                >
                  <X className="w-3 h-3 mr-1" /> Clear Filters
                </Button>
              )}
            </div>
          </aside>

          {/* Products grid */}
          <div className="flex-1">
            {loading && initialLoad ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-[4/3] bg-blush/20 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <Sparkles className="w-12 h-12 text-gold/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground text-sm mb-4">Try adjusting your filters or search terms</p>
                <Button onClick={() => { setSelectedCategory('all'); setSearchQuery('') }} variant="outline" className="border-gold/30 text-gold">
                  View All Products
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => {
                  const images: string[] = JSON.parse(product.images || '[]')
                  const discount = product.comparePrice ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) : 0

                  return (
                    <Card key={product.id} className="premium-card border-blush/30 bg-white overflow-hidden group cursor-pointer" onClick={() => navigate('product', { slug: product.slug })}>
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
                            <img
                              src={images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            />
                          )
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blush/30 to-cream flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-white/60 flex items-center justify-center">
                                <Sparkles className="w-7 h-7 text-gold" />
                              </div>
                              <p className="text-xs text-foreground/40">{product.categorySlug}</p>
                            </div>
                          </div>
                        )}
                        {discount > 0 && (
                          <Badge className="absolute top-3 left-3 bg-rose text-white text-[10px]">-{discount}%</Badge>
                        )}
                        {product.newArrival && (
                          <Badge className="absolute top-3 right-3 bg-gold text-white text-[10px]">NEW</Badge>
                        )}
                        {/* Smooth hover overlay — appears without layout shift */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                          <div className="flex gap-2">
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate('product', { slug: product.slug }) }} className="bg-white/90 text-foreground hover:bg-white text-xs backdrop-blur-sm">View Details</Button>
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAddToCart(product) }} className="bg-gold text-white hover:bg-gold-light text-xs">
                              <ShoppingBag className="w-3 h-3 mr-1" /> Add
                            </Button>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="mb-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${categoryColors[product.categorySlug] || 'bg-gray-100 text-gray-700'}`}>
                            {getCategoryName(product.categorySlug)}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm mb-1 line-clamp-1 group-hover:text-gold transition-colors duration-300">
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
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
