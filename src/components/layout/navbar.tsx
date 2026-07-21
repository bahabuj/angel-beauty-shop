'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useNavStore } from '@/store/nav-store'
import { useCartStore } from '@/store/cart-store'
import { useAuthStore } from '@/store/auth-store'
import { useUIStore } from '@/store/ui-store'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { useState, useEffect } from 'react'
import {
  ShoppingBag,
  User,
  LogOut,
  Menu,
  X,
  Search,
  Heart,
  ChevronDown,
  Truck,
  Sparkles,
  Gift,
  Star,
  Heart as HeartIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  truck: Truck,
  sparkles: Sparkles,
  gift: Gift,
  star: Star,
  heart: HeartIcon,
}

const DEFAULT_ANNOUNCEMENT_ITEMS = [
  { text: 'Free Delivery on Orders Over $100', icon: 'truck', separator: '✦' },
  { text: 'New Arrivals Just Dropped', icon: 'sparkles', separator: '✨' },
  { text: 'Premium Skincare Collection', icon: 'sparkles', separator: '✦' },
]

interface AnnouncementItemData {
  id: string; text: string; icon: string; separator: string; active: boolean; order: number;
}

interface NavCategory {
  id: string; name: string; slug: string; description?: string | null; image?: string | null; active?: boolean; order?: number;
}

export default function Navbar() {
  const navigate = useNavStore((s) => s.navigate)
  const currentPage = useNavStore((s) => s.currentPage)
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  const { isAuthenticated, user, logout } = useAuthStore()
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen)
  const isMobileMenuOpen = useUIStore((s) => s.isMobileMenuOpen)
  const setSelectedCategory = useUIStore((s) => s.setSelectedCategory)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false)
  const [navCategories, setNavCategories] = useState<NavCategory[]>([])
  const [announcementItems, setAnnouncementItems] = useState<AnnouncementItemData[]>([])

  useEffect(() => {
    // Use combined endpoint for faster load (includes categories + announcements)
    fetch('/api/home-data')
      .then(r => r.json())
      .then(data => {
        if (!data.success) return
        if (data.announcementItems?.length) setAnnouncementItems(data.announcementItems)
        if (data.categories?.length) setNavCategories(data.categories.filter((c: NavCategory) => c.active !== false))
      })
      .catch(() => {})
  }, [])

  const displayItems = announcementItems.length > 0
    ? announcementItems.filter(i => i.active)
    : DEFAULT_ANNOUNCEMENT_ITEMS

  const navLinks = [
    { label: 'Home', page: 'home' as const },
    { label: 'Shop', page: 'shop' as const },
    { label: 'About', page: 'about' as const },
    { label: 'Contact', page: 'contact' as const },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-blush/50">
      {/* Premium Animated Announcement Bar */}
      <button
        onClick={() => navigate('shop')}
        className="announcement-bar relative block w-full bg-gradient-to-r from-gold via-gold-light to-gold overflow-hidden"
      >
        <div className="announcement-track flex items-center py-2 whitespace-nowrap">
          {[...Array(8)].map((_, i) => (
            <span key={i} className="inline-flex items-center gap-4 shrink-0 px-4 text-white/95 text-[11px] sm:text-xs tracking-[0.2em] font-semibold uppercase" style={{ fontFamily: 'var(--font-sans), Inter, sans-serif' }}>
              {displayItems.map((item, j) => {
                const IconComp = ICON_MAP[item.icon]
                return (
                  <span key={j} className="inline-flex items-center gap-2">
                    {IconComp && <IconComp className="w-3.5 h-3.5 announcement-icon" strokeWidth={1.8} />}
                    <span>{item.text}</span>
                    <span className="announcement-sparkle text-white/50 text-sm" style={{ animationDelay: `${j * 0.6}s` }}>{item.separator}</span>
                  </span>
                )
              })}
            </span>
          ))}
        </div>
      </button>

      <nav className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-white p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-blush/30">
                  <div className="flex items-center gap-2">
                    <Image
                      src="/images/logo.png"
                      alt="Angelsbeauty"
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                    <h2
                      className="font-playfair text-2xl font-bold gold-gradient-text"
                      style={{ fontFamily: 'var(--font-playfair), serif' }}
                    >
                      Angelsbeauty
                    </h2>
                  </div>
                </div>
                <div className="flex-1 py-4">
                  {navLinks.map((link) => (
                    link.page === 'shop' ? (
                      <div key={link.page}>
                        <button
                          onClick={() => { navigate('shop'); setMobileMenuOpen(false) }}
                          className={`w-full text-left px-6 py-3 text-sm font-medium transition-colors hover:bg-blush/30 ${
                            currentPage === link.page ? 'text-gold bg-blush/20' : 'text-foreground'
                          }`}
                        >
                          Shop All
                        </button>
                        {navCategories.map((cat) => (
                          <button
                            key={cat.slug}
                            onClick={() => {
                              setSelectedCategory(cat.slug)
                              navigate('shop')
                              setMobileMenuOpen(false)
                            }}
                            className="w-full text-left px-10 py-2 text-sm text-foreground/60 hover:text-gold hover:bg-blush/20 transition-colors"
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        key={link.page}
                        onClick={() => { navigate(link.page); setMobileMenuOpen(false) }}
                        className={`w-full text-left px-6 py-3 text-sm font-medium transition-colors hover:bg-blush/30 ${
                          currentPage === link.page ? 'text-gold bg-blush/20' : 'text-foreground'
                        }`}
                      >
                        {link.label}
                      </button>
                    )
                  ))}
                  {isAuthenticated && user?.role === 'admin' && (
                    <button
                      onClick={() => { navigate('admin'); setMobileMenuOpen(false) }}
                      className="w-full text-left px-6 py-3 text-sm font-medium text-rose hover:bg-blush/30 transition-colors"
                    >
                      Admin Dashboard
                    </button>
                  )}
                </div>
                {isAuthenticated && user?.role === 'admin' && (
                  <div className="p-6 border-t border-blush/30">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Hello, {user?.name}</p>
                      <Button
                        onClick={async () => { 
                          await logout(); 
                          setMobileMenuOpen(false); 
                        }}
                        variant="destructive"
                        className="w-full justify-start"
                      >
                        <LogOut className="h-4 w-4" />
                        Admin Logout
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <button
            onClick={() => navigate('home')}
            className="flex items-center gap-2 group"
          >
            <Image
              src="/images/logo.png"
              alt="Angelsbeauty"
              width={40}
              height={40}
              className="object-contain"
            />
            <span
              className="text-xl font-bold gold-gradient-text hidden sm:block"
              style={{ fontFamily: 'var(--font-playfair), serif' }}
            >
              Angelsbeauty
            </span>
          </button>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              link.page === 'shop' ? (
                <div
                  key={link.page}
                  className="relative"
                  onMouseEnter={() => setShopDropdownOpen(true)}
                  onMouseLeave={() => setShopDropdownOpen(false)}
                >
                  <button
                    onClick={() => navigate('shop')}
                    className={`text-sm font-medium transition-all duration-200 relative py-1 flex items-center gap-1 ${
                      currentPage === link.page
                        ? 'text-gold'
                        : 'text-foreground/70 hover:text-gold'
                    }`}
                  >
                    {link.label}
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${shopDropdownOpen ? 'rotate-180' : ''}`} />
                    {currentPage === link.page && (
                      <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gold rounded-full" />
                    )}
                  </button>
                  {shopDropdownOpen && navCategories.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-blush/30 py-2 z-50">
                      <button
                        onClick={() => { navigate('shop'); setShopDropdownOpen(false) }}
                        className="w-full text-left px-4 py-2 text-sm font-medium text-gold hover:bg-blush/20 transition-colors"
                      >
                        All Products
                      </button>
                      <div className="h-px bg-blush/20 mx-2 my-1" />
                      {navCategories.map((cat) => (
                        <button
                          key={cat.slug}
                          onClick={() => {
                            setSelectedCategory(cat.slug)
                            navigate('shop')
                            setShopDropdownOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-foreground/70 hover:bg-blush/20 hover:text-gold transition-colors"
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  key={link.page}
                  onClick={() => navigate(link.page)}
                  className={`text-sm font-medium transition-all duration-200 relative py-1 ${
                    currentPage === link.page
                      ? 'text-gold'
                      : 'text-foreground/70 hover:text-gold'
                  }`}
                >
                  {link.label}
                  {currentPage === link.page && (
                    <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gold rounded-full" />
                  )}
                </button>
              )
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground/70 hover:text-gold hidden sm:flex"
              onClick={() => navigate('shop')}
            >
              <Search className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-foreground/70 hover:text-gold hidden sm:flex"
            >
              <Heart className="h-5 w-5" />
            </Button>

            {/* Admin only: User menu */}
            {isAuthenticated && user?.role === 'admin' && (
              <div className="relative hidden sm:block">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-foreground/70 hover:text-gold"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <User className="h-5 w-5" />
                </Button>
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-blush/30 py-2 z-50">
                    <div className="px-4 py-2 border-b border-blush/20">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { navigate('admin'); setShowUserMenu(false) }}
                      className="w-full text-left px-4 py-2 text-sm text-rose hover:bg-blush/20 transition-colors"
                    >
                      Admin Dashboard
                    </button>
                    <button
                      onClick={async () => { 
                        await logout(); 
                        setShowUserMenu(false); 
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-blush/20 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Admin Logout
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground/70 hover:text-gold relative"
              onClick={() => navigate('cart')}
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </nav>
    </header>
  )
}
