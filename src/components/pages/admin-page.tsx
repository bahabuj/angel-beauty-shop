'use client'

import { useNavStore } from '@/store/nav-store'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'
import { DashboardOverview } from '@/components/admin/dashboard-overview'
import ProductsManagement from '@/components/admin/products-management'
import { OrdersManagement } from '@/components/admin/orders-management'
import { PromosManagement } from '@/components/admin/promos-management'
import { SubscribersManagement } from '@/components/admin/subscribers-management'
import AuthSlidesManagement from '@/components/admin/auth-slides-management'
import { SettingsPage } from '@/components/admin/settings-page'
import VisualContentManagement from '@/components/admin/visual-content-management'
import CategoriesManagement from '@/components/admin/categories-management'
import InspirationHubManagement from '@/components/admin/inspiration-hub-management'
import BeforeAfterManagement from '@/components/admin/before-after-management'
import { useEffect, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// --- Types ---
interface Product {
  id: string; name: string; slug: string; description: string; price: number
  comparePrice: number | null; categorySlug: string; images: string; stock: number
  benefits: string; ingredients: string; howToUse: string
  featured: boolean; newArrival: boolean; bestSeller: boolean; createdAt: string
}

interface Order {
  id: string; userId: string | null; items: string; subtotal: number; total: number
  status: string; customerName: string; email: string; phone: string | null
  address: string; city: string; state: string | null; zipCode: string | null
  country: string; paymentMethod: string; invoiceNumber: string | null; invoiceSent: boolean; createdAt: string
}

interface Subscriber { id: string; email: string; createdAt: string }

interface Promo {
  id: string; title: string; subtitle: string | null; image: string | null
  ctaText: string | null; ctaLink: string | null; active: boolean; order: number
  createdAt: string
}

interface Category { id: string; name: string; slug: string; description: string | null; image: string | null; order: number; active: boolean; _count?: { products: number } }

interface AuthSlide {
  id: string; title: string; subtitle: string | null
  mediaUrl: string; mediaType: string; active: boolean; order: number
}

interface Stats {
  productCount: number; orderCount: number; subscriberCount: number
  promoCount: number; totalRevenue: number
  recentOrders: Order[]
  revenueByMonth?: Array<{ month: string; revenue: number }>
  changes?: {
    products: number | null
    orders: number | null
    revenue: number | null
    subscribers: number | null
  }
}

type AdminPage = 'dashboard' | 'products' | 'categories' | 'orders' | 'banners' | 'visual-content' | 'auth-slides' | 'before-after' | 'inspiration-hub' | 'newsletter' | 'settings'

const PAGE_TITLES: Record<AdminPage, string> = {
  dashboard: 'Dashboard Overview',
  products: 'Products Management',
  categories: 'Categories Management',
  orders: 'Orders Management',
  banners: 'Promo Banners',
  'visual-content': 'Visual Content',
  'auth-slides': 'Auth Page Slides',
  'before-after': 'Before & After Images',
  'inspiration-hub': 'Inspiration Hub',
  newsletter: 'Newsletter Subscribers',
  settings: 'Settings',
}

export default function AdminPage() {
  const navigate = useNavStore((s) => s.navigate)

  const [activePage, setActivePage] = useState<AdminPage>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  // Admin panel is now directly accessible without authentication.
  const authChecked = true

  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [promos, setPromos] = useState<Promo[]>([])
  const [authSlides, setAuthSlides] = useState<AuthSlide[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<Stats>({
    productCount: 0, orderCount: 0, subscriberCount: 0,
    promoCount: 0, totalRevenue: 0, recentOrders: [],
  })

  // --- Data Loading ---
  const loadAll = useCallback(async () => {
    try {
      const [statsRes, productsRes, ordersRes, subsRes, promosRes, slidesRes, catsRes] = await Promise.all([
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/products').then(r => r.json()),
        fetch('/api/orders').then(r => r.json()),
        fetch('/api/newsletter').then(r => r.json()),
        fetch('/api/promos').then(r => r.json()),
        fetch('/api/auth-slides-all').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
      ])
      if (statsRes.success) setStats(statsRes.stats)
      if (productsRes.success) setProducts(productsRes.products)
      if (ordersRes.success) setOrders(ordersRes.orders)
      if (subsRes.success) setSubscribers(subsRes.subscribers)
      if (promosRes.success) setPromos(promosRes.promos)
      if (slidesRes.success) setAuthSlides(slidesRes.slides)
      if (catsRes.success) setCategories(catsRes.categories)
    } catch (err) {
      console.error('Failed to load admin data:', err)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  // --- Admin Auth Guard removed ---
  // The admin panel is now directly accessible without signing in.

  // --- Auth Loading / Denied State ---
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream/30">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-gold animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream/30">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-gold animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // --- Handlers ---
  const handleBackToStore = () => {
    navigate('home')
  }

  const handleLogout = () => {
    navigate('home')
  }

  const handleNavigate = (page: string) => {
    setActivePage(page as AdminPage)
    setSidebarOpen(false)
  }

  // Product CRUD
  const handleProductSave = async (data: Record<string, unknown>, isEdit: boolean) => {
    try {
      if (isEdit) {
        const res = await fetch(`/api/products/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Failed to update product')
        toast.success('Product updated successfully!')
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Failed to create product')
        toast.success('Product created successfully!')
      }
      await loadAll()
    } catch {
      toast.error('Failed to save product')
      throw new Error('Failed to save product')
    }
  }

  const handleProductDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Product deleted')
      await loadAll()
    } catch {
      toast.error('Failed to delete product')
      throw new Error('Failed to delete product')
    }
  }

  // Order status update
  const handleOrderStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast.success('Order status updated')
      await loadAll()
    } catch {
      toast.error('Failed to update order status')
      throw new Error('Failed to update order status')
    }
  }

  // Promo CRUD
  const handlePromoSave = async (data: Record<string, unknown>, isEdit: boolean) => {
    try {
      if (isEdit) {
        const res = await fetch(`/api/promos/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Failed to update promo')
        toast.success('Promo updated!')
      } else {
        const res = await fetch('/api/promos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Failed to create promo')
        toast.success('Promo created!')
      }
      await loadAll()
    } catch {
      toast.error('Failed to save promo')
      throw new Error('Failed to save promo')
    }
  }

  const handlePromoDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/promos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Promo deleted')
      await loadAll()
    } catch {
      toast.error('Failed to delete promo')
      throw new Error('Failed to delete promo')
    }
  }

  const handlePromoToggle = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/promos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      if (!res.ok) throw new Error('Failed to toggle')
      toast.success(active ? 'Promo activated' : 'Promo deactivated')
      await loadAll()
    } catch {
      toast.error('Failed to update promo')
    }
  }

  // Auth Slide CRUD
  const handleAuthSlideSave = async (data: Record<string, unknown>, isEdit: boolean) => {
    try {
      if (isEdit) {
        const res = await fetch(`/api/auth-slides/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Failed to update slide')
        toast.success('Auth slide updated!')
      } else {
        const res = await fetch('/api/auth-slides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Failed to create slide')
        toast.success('Auth slide created!')
      }
      await loadAll()
    } catch {
      toast.error('Failed to save auth slide')
      throw new Error('Failed to save auth slide')
    }
  }

  const handleAuthSlideDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/auth-slides/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Auth slide deleted')
      await loadAll()
    } catch {
      toast.error('Failed to delete auth slide')
      throw new Error('Failed to delete auth slide')
    }
  }

  const handleAuthSlideToggle = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/auth-slides/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      if (!res.ok) throw new Error('Failed to toggle')
      toast.success(active ? 'Slide activated' : 'Slide deactivated')
      await loadAll()
    } catch {
      toast.error('Failed to update slide')
    }
  }

  // Subscriber delete
  const handleSubscriberDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/newsletter/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Subscriber removed')
      await loadAll()
    } catch {
      toast.error('Failed to remove subscriber')
      throw new Error('Failed to remove subscriber')
    }
  }

  // --- Render Content ---
  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardOverview
            stats={stats}
            products={products.map(p => ({
              id: p.id,
              name: p.name,
              price: p.price,
              categorySlug: p.categorySlug,
              createdAt: p.createdAt,
            }))}
          />
        )
      case 'products':
        return (
          <ProductsManagement
            products={products}
            categories={categories}
            onSave={handleProductSave}
            onDelete={handleProductDelete}
          />
        )
      case 'categories':
        return (
          <CategoriesManagement
            categories={categories}
            onSave={loadAll}
            onDelete={loadAll}
          />
        )
      case 'orders':
        return (
          <OrdersManagement
            orders={orders}
            onUpdateStatus={handleOrderStatusUpdate}
          />
        )
      case 'banners':
        return (
          <PromosManagement
            promos={promos}
            onSave={handlePromoSave}
            onDelete={handlePromoDelete}
            onToggleActive={handlePromoToggle}
          />
        )
      case 'visual-content':
        return <VisualContentManagement />
      case 'before-after':
        return <BeforeAfterManagement />
      case 'inspiration-hub':
        return <InspirationHubManagement />
      case 'auth-slides':
        return (
          <AuthSlidesManagement
            slides={authSlides}
            onSave={handleAuthSlideSave}
            onDelete={handleAuthSlideDelete}
            onToggleActive={handleAuthSlideToggle}
          />
        )
      case 'newsletter':
        return (
          <SubscribersManagement
            subscribers={subscribers}
            onDelete={handleSubscriberDelete}
          />
        )
      case 'settings':
        return (
          <SettingsPage
            adminName="Admin"
            adminEmail="admin@angelbeauty.com"
            adminPhone={null}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-cream/20 flex">
      {/* Sidebar */}
      <AdminSidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        onBackToStore={handleBackToStore}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        {/* Header */}
        <AdminHeader
          title={PAGE_TITLES[activePage]}
          adminName="Admin"
          adminEmail="admin@angelbeauty.com"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
