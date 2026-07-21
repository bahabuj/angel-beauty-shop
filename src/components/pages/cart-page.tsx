'use client'

import { useNavStore } from '@/store/nav-store'
import { useCartStore, cartItemKey } from '@/store/cart-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ArrowLeft, Shield, Truck } from 'lucide-react'

export default function CartPage() {
  const navigate = useNavStore((s) => s.navigate)
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const getSubtotal = useCartStore((s) => s.getSubtotal)
  const getItemCount = useCartStore((s) => s.getItemCount)
  const clearCart = useCartStore((s) => s.clearCart)
  const subtotal = getSubtotal()
  const itemCount = getItemCount()
  const hasFreeShipping = items.some(item => item.freeShipping)
  const shipping = hasFreeShipping || subtotal >= 100 ? 0 : 15
  const total = subtotal + shipping

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blush/30 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-gold/50" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>Your Cart is Empty</h2>
          <p className="text-muted-foreground mb-6">Looks like you haven&apos;t added anything to your cart yet.</p>
          <Button onClick={() => navigate('shop')} className="bg-gold hover:bg-gold-light text-white rounded-full px-8">
            Start Shopping <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate('shop')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Continue Shopping
        </button>

        <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-playfair), serif' }}>
          Shopping Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={cartItemKey(item.id, item.variantId)}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                >
                  <Card className="border-blush/30 overflow-hidden">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex gap-4">
                        <div
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-gradient-to-br from-blush/30 to-cream flex items-center justify-center shrink-0 cursor-pointer"
                          onClick={() => navigate('product', { slug: item.slug })}
                        >
                          <ShoppingBag className="w-8 h-8 text-gold/40" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-semibold text-sm sm:text-base line-clamp-1 cursor-pointer hover:text-gold transition-colors"
                            onClick={() => navigate('product', { slug: item.slug })}
                          >
                            {item.name}
                          </h3>
                          {item.variantName ? (
                            <span className="text-xs text-muted-foreground">Variant: {item.variantName}</span>
                          ) : null}
                          <p className="text-gold font-bold mt-1">${item.price.toLocaleString()}</p>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center border border-blush/40 rounded-lg">
                              <button onClick={() => updateQuantity(cartItemKey(item.id, item.variantId), item.quantity - 1)} className="p-1.5 hover:bg-blush/20 transition-colors">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-3 text-sm font-medium">{item.quantity}</span>
                              <button onClick={() => updateQuantity(cartItemKey(item.id, item.variantId), item.quantity + 1)} className="p-1.5 hover:bg-blush/20 transition-colors">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-sm font-medium">${(item.price * item.quantity).toLocaleString()}</span>
                            <button onClick={() => removeItem(cartItemKey(item.id, item.variantId))} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            <Button variant="ghost" onClick={clearCart} className="text-muted-foreground text-sm">
              <Trash2 className="w-4 h-4 mr-2" /> Clear Cart
            </Button>
          </div>

          {/* Order summary */}
          <div>
            <Card className="border-blush/30 sticky top-28">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4" style={{ fontFamily: 'var(--font-playfair), serif' }}>Order Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{shipping === 0 ? <span className="text-green-600">Free</span> : `$${shipping.toLocaleString()}`}</span>
                  </div>
                  {shipping > 0 && (
                    <p className="text-xs text-muted-foreground">Free shipping on orders over $100</p>
                  )}
                  <div className="border-t border-blush/30 pt-3 flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span className="text-gold">${total.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  onClick={() => navigate('checkout')}
                  className="w-full bg-gold hover:bg-gold-light text-white mt-6 py-3 beauty-btn"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-gold" /> Secure</span>
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-gold" /> Fast Delivery</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
