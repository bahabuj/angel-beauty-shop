'use client'

import { useAuthStore } from '@/store/auth-store'
import { useNavStore } from '@/store/nav-store'
import { useCartStore } from '@/store/cart-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, ShoppingBag, LogOut, Shield, Package, Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import UserAvatar from '@/components/layout/user-avatar'

export default function AccountPage() {
  const { user, isAuthenticated, logout, setUser } = useAuthStore()
  const navigate = useNavStore((s) => s.navigate)
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  const [orders, setOrders] = useState<any[]>([])
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // ── Re-verify auth with the server (the Zustand store may lag behind
  // immediately after sign-in, causing a false "not authenticated" state) ──
  useEffect(() => {
    let cancelled = false
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        if (!cancelled) {
          if (data.authenticated && data.user) {
            // Make sure the store is in sync
            if (!isAuthenticated || !user) {
              setUser({
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
                role: data.user.role,
                phone: data.user.phone,
                avatar: data.user.avatar,
                image: data.user.image,
              })
            }
          }
          setAuthChecking(false)
        }
      } catch {
        if (!cancelled) setAuthChecking(false)
      }
    }
    checkAuth()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isAuthenticated && user) {
      fetch('/api/orders').then(r => r.json()).then(data => {
        if (data.success) setOrders(data.orders.filter((o: any) => o.email === user.email))
      })
    }
  }, [isAuthenticated, user])

  // ── Avatar upload handler ─────────────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      toast.error('Please use JPG, PNG, WebP, or GIF.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image exceeds 5MB limit.')
      return
    }

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setUser({
          ...user!,
          avatar: data.avatar,
          image: data.avatar,
        })
        toast.success('Avatar updated!')
      } else {
        toast.error(data.error || 'Failed to upload avatar.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload avatar.')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  // ── Loading state while we verify auth with the server ────────────────────
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading your account…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-gold/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Please Sign In</h2>
          <p className="text-muted-foreground mb-4">Access your account to view orders and profile</p>
          <Button onClick={() => window.location.href = '/auth'} className="bg-gold hover:bg-gold-light text-white">Sign In</Button>
        </div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    shipped: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-r from-cream via-blush/10 to-cream py-12">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>My Account</h1>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile card */}
          <div>
            <Card className="border-blush/30">
              <CardContent className="p-6 text-center">
                {/* Avatar with upload-on-click */}
                <div className="relative w-24 h-24 mx-auto mb-4 group">
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="block w-full h-full rounded-full focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 ring-offset-background disabled:opacity-60"
                    title="Click to upload avatar"
                  >
                    <UserAvatar
                      name={user?.name}
                      email={user?.email}
                      avatar={user?.avatar}
                      image={user?.image}
                      size={96}
                      ring
                      className="w-full h-full"
                    />
                  </button>
                  {/* Camera badge overlay */}
                  <button
                    type="button"
                    onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-gold text-white flex items-center justify-center shadow-md border-2 border-background group-hover:scale-110 transition-transform"
                    title="Upload avatar"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <h2 className="font-semibold text-lg">{user?.name}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Click the avatar to upload a profile picture
                </p>
                {user?.role === 'admin' && (
                  <Badge className="mt-2 bg-gold/10 text-gold">Admin</Badge>
                )}
                <div className="mt-4 pt-4 border-t border-blush/20 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 justify-center"><ShoppingBag className="w-4 h-4" /> {itemCount} items in cart</div>
                  <div className="flex items-center gap-2 justify-center"><Package className="w-4 h-4" /> {orders.length} orders</div>
                </div>
                <div className="mt-4 space-y-2">
                  {user?.role === 'admin' && (
                    <Button onClick={() => navigate('admin')} variant="outline" className="w-full border-gold/30 text-gold">
                      <Shield className="w-4 h-4 mr-2" /> Admin Dashboard
                    </Button>
                  )}
                  <Button onClick={() => { logout(); window.location.href = '/' }} variant="ghost" className="w-full text-destructive">
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Orders */}
          <div className="lg:col-span-2">
            <h3 className="font-semibold text-lg mb-4">My Orders</h3>
            {orders.length === 0 ? (
              <Card className="border-blush/30">
                <CardContent className="p-8 text-center">
                  <Package className="w-10 h-10 text-gold/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No orders yet</p>
                  <Button onClick={() => navigate('shop')} variant="outline" className="mt-4 border-gold/30 text-gold">Start Shopping</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map(order => {
                  // Order items are stored as a JSON string on the order record.
                  // Each item may include `variantName` when the product has variants.
                  let orderItems: Array<{
                    id?: string
                    name?: string
                    price?: number
                    quantity?: number
                    variantId?: string | null
                    variantName?: string | null
                    sku?: string | null
                  }> = []
                  try {
                    if (order.items) {
                      orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
                    }
                  } catch {
                    orderItems = []
                  }

                  return (
                    <Card key={order.id} className="border-blush/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">Order #{order.id.slice(-8)}</p>
                            <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                            <p className="text-xs text-muted-foreground mt-1">{order.customerName} &middot; {order.city}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gold">${order.total.toLocaleString()}</p>
                            <Badge className={`${statusColors[order.status] || 'bg-gray-100 text-gray-700'} text-[10px] mt-1`}>{order.status}</Badge>
                          </div>
                        </div>

                        {/* Items list with variant info */}
                        {orderItems.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-blush/20">
                            <p className="text-xs text-muted-foreground mb-2">Items</p>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {orderItems.map((item, i) => (
                                <div key={item.id || i} className="flex items-start justify-between text-sm gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="line-clamp-1">{item.name}</p>
                                    {item.variantName ? (
                                      <p className="text-xs text-muted-foreground">Variant: {item.variantName}</p>
                                    ) : null}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                    {typeof item.price === 'number' && (
                                      <p className="text-xs font-medium">${(item.price * (item.quantity || 1)).toLocaleString()}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
