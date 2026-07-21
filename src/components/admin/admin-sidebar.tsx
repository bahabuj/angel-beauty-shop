'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Megaphone,
  Mail,
  Settings,
  ArrowLeft,
  LogOut,
  Sparkles,
  X,
  ImagePlay,
  Palette,
  Tag,
  Lightbulb,
  GitCompareArrows,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface AdminSidebarProps {
  activePage: string
  onNavigate: (page: string) => void
  onBackToStore: () => void
  onLogout: () => void
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'banners', label: 'Promo Banners', icon: Megaphone },
  { id: 'visual-content', label: 'Visual Content', icon: Palette },
  { id: 'auth-slides', label: 'Auth Page Slides', icon: ImagePlay },
  { id: 'before-after', label: 'Before & After Images', icon: GitCompareArrows },
  { id: 'inspiration-hub', label: 'Inspiration Hub', icon: Lightbulb },
  { id: 'newsletter', label: 'Newsletter Subscribers', icon: Mail },
  { id: 'settings', label: 'Settings', icon: Settings },
]

function SidebarContent({
  activePage,
  onNavigate,
  onBackToStore,
  onLogout,
  onClose,
}: Omit<AdminSidebarProps, 'isOpen'>) {
  return (
    <div className="flex h-full flex-col bg-white">
      {/* Brand Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10">
            <Sparkles className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Angel Beauty
            </h1>
            <p className="text-xs font-medium text-muted-foreground">
              Admin Panel
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-border/60" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = activePage === item.id
            const Icon = item.icon

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id)
                  onClose()
                }}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 outline-none',
                  isActive
                    ? 'bg-gold text-white shadow-md shadow-gold/25'
                    : 'text-foreground/70 hover:bg-blush hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] transition-colors duration-200',
                    isActive
                      ? 'text-white'
                      : 'text-muted-foreground group-hover:text-gold'
                  )}
                />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-border/60" />

      {/* Footer Actions */}
      <div className="flex-shrink-0 space-y-1 px-3 py-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 text-sm font-medium text-foreground/70 transition-colors duration-200 hover:bg-blush hover:text-foreground"
          onClick={onBackToStore}
        >
          <ArrowLeft className="h-[18px] w-[18px] text-muted-foreground transition-colors group-hover:text-gold" />
          Back to Store
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 text-sm font-medium text-destructive/80 transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
          onClick={onLogout}
        >
          <LogOut className="h-[18px] w-[18px]" />
          Logout
        </Button>
      </div>
    </div>
  )
}

export function AdminSidebar({
  activePage,
  onNavigate,
  onBackToStore,
  onLogout,
  isOpen,
  onClose,
}: AdminSidebarProps) {
  return (
    <>
      {/* Desktop Sidebar — always visible */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 border-r border-border/60 bg-white">
        <SidebarContent
          activePage={activePage}
          onNavigate={onNavigate}
          onBackToStore={onBackToStore}
          onLogout={onLogout}
          onClose={onClose}
        />
      </aside>

      {/* Mobile Sidebar — overlay with animation */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={onClose}
              aria-hidden="true"
            />

            {/* Sidebar Panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 shadow-2xl lg:hidden"
            >
              {/* Close Button */}
              <div className="absolute right-3 top-4 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:bg-blush hover:text-foreground"
                  onClick={onClose}
                  aria-label="Close sidebar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <SidebarContent
                activePage={activePage}
                onNavigate={onNavigate}
                onBackToStore={onBackToStore}
                onLogout={onLogout}
                onClose={onClose}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default AdminSidebar
