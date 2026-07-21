'use client'

import { useAuthStore } from '@/store/auth-store'
import { useNavStore } from '@/store/nav-store'
import { useCartStore } from '@/store/cart-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, ShoppingBag, LogOut, Shield, Package } from 'lucide-react'
import { toast } from 'sonner'

export default function AccountPage() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavStore((s) => s.navigate)
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetch('/api/orders').then(r => r.json()).then(data => {
        if (data.success) setOrders(data.orders.filter((o: any) => o.email === user.email))
      })
    }
  }, [isAuthenticated, user])

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
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold/20 to-rose/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gold">{user?.name?.[0] || 'U'}</span>
                </div>
                <h2 className="font-semibold text-lg">{user?.name}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
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
