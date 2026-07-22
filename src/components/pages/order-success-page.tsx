'use client'

import { useState, useEffect } from 'react'
import { useNavStore } from '@/store/nav-store'
import { useCartStore } from '@/store/cart-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, ShoppingBag, ArrowRight, Loader2, RefreshCw, CreditCard, Shield } from 'lucide-react'

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
  variantId?: string | null
  variantName?: string | null
  sku?: string | null
}

interface PaymentInfo {
  checkoutId?: string
  paymentId?: string
  cardType?: string
  last4?: string
  authCode?: string
  authStatus?: string
  customerMessage?: string
}

interface Order {
  id: string
  invoiceNumber?: string | null
  items: string
  subtotal: number
  total: number
  shipping?: number
  status: string
  paymentStatus: string
  customerName: string
  email: string
  createdAt: string
  paymentDetails?: string
  cloverCheckoutId?: string | null
  cloverPaymentId?: string | null
}

type Phase = 'loading' | 'no-order' | 'error' | 'success'

interface PageState {
  phase: Phase
  order: Order | null
  errorMsg: string
  paymentInfo: PaymentInfo
}

export default function OrderSuccessPage() {
  const navigate = useNavStore((s) => s.navigate)
  const clearCart = useCartStore((s) => s.clearCart)

  const [orderId] = useState(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('orderId')
  })

  const [state, setState] = useState<PageState>(() =>
    orderId ? { phase: 'loading', order: null, errorMsg: '', paymentInfo: {} } : { phase: 'no-order', order: null, errorMsg: '', paymentInfo: {} }
  )

  const fetchOrder = async (id: string) => {
    try {
      // Fetch order data
      const orderRes = await fetch(`/api/orders/${id}`)
      const orderData = await orderRes.json()

      if (!orderData.success || !orderData.order) {
        return {
          phase: 'error' as Phase,
          order: null,
          errorMsg: 'We could not find your order. Please check your order confirmation email.',
          paymentInfo: {},
        }
      }

      const order = orderData.order as Order

      // Also try to get payment details from checkout-status API
      let paymentInfo: PaymentInfo = {}
      try {
        const statusRes = await fetch(`/api/clover/checkout-status?orderId=${id}`)
        const statusData = await statusRes.json()
        if (statusData.success) {
          paymentInfo = {
            checkoutId: statusData.checkoutId,
            paymentId: statusData.paymentId,
            cardType: statusData.cardType,
            last4: statusData.last4,
            authCode: statusData.authCode,
            authStatus: statusData.authStatus,
            customerMessage: statusData.customerMessage,
          }
        }
      } catch {
        // Non-critical — payment info is supplementary
      }

      // Parse stored paymentDetails
      if (!paymentInfo.paymentId && order.paymentDetails) {
        try {
          const stored = JSON.parse(order.paymentDetails)
          paymentInfo = {
            ...paymentInfo,
            checkoutId: paymentInfo.checkoutId || stored.checkoutId,
            paymentId: paymentInfo.paymentId || stored.paymentId || order.cloverPaymentId,
            cardType: paymentInfo.cardType || stored.cardType,
            last4: paymentInfo.last4 || stored.last4,
            authCode: paymentInfo.authCode || stored.authCode,
            authStatus: paymentInfo.authStatus || stored.authStatus,
          }
        } catch {
          // Ignore parse errors
        }
      }

      if (order.paymentStatus === 'completed' || order.paymentStatus === 'paid') {
        // ─── Payment confirmed — clear the cart NOW ─────────────────────────
        // This is the ONLY place the cart should be cleared in the entire
        // checkout flow. We wait until the order is confirmed paid before
        // clearing, so customers who cancel or get declined can retry without
        // losing their cart contents.
        try {
          clearCart()
        } catch {
          // Non-critical — cart clearing is best-effort
        }
        return { phase: 'success' as Phase, order, errorMsg: '', paymentInfo }
      } else {
        return {
          phase: 'error' as Phase,
          order,
          errorMsg: 'Your payment has not been confirmed yet. If you just completed payment, it may take a moment to process.',
          paymentInfo,
        }
      }
    } catch {
      return {
        phase: 'error' as Phase,
        order: null,
        errorMsg: 'Unable to verify your payment. Please check your connection.',
        paymentInfo: {},
      }
    }
  }

  useEffect(() => {
    if (!orderId) return

    let cancelled = false

    fetchOrder(orderId).then(result => {
      if (!cancelled) setState(result)
    })

    return () => { cancelled = true }
  }, [orderId])

  const handleRefresh = async () => {
    if (!orderId) return
    setState({ phase: 'loading', order: null, errorMsg: '', paymentInfo: {} })
    const result = await fetchOrder(orderId)
    setState(result)
  }

  const parseItems = (itemsStr: string): OrderItem[] => {
    try {
      return JSON.parse(itemsStr)
    } catch {
      return []
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  // ─── Loading State ───────────────────────────────────────────────────────
  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-gold" />
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Verifying your payment...
          </h2>
          <p className="text-muted-foreground text-sm">
            Please wait while we confirm your payment details.
          </p>
        </div>
      </div>
    )
  }

  // ─── No Order ID ─────────────────────────────────────────────────────────
  if (state.phase === 'no-order') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            No Order Information Found
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            We couldn&apos;t find any order details. If you just placed an order, please check your email for confirmation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('shop')} className="bg-gold hover:bg-gold-light text-white">
              <ShoppingBag className="w-4 h-4 mr-2" /> Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Error / Payment Not Confirmed ───────────────────────────────────────
  if (state.phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Payment Verification Pending
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {state.errorMsg}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleRefresh} variant="outline" className="border-gold/30 text-gold">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh Status
            </Button>
            <Button onClick={() => navigate('shop')} className="bg-gold hover:bg-gold-light text-white">
              <ShoppingBag className="w-4 h-4 mr-2" /> Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Success State ───────────────────────────────────────────────────────
  const order = state.order!
  const orderItems = parseItems(order.items)
  const shippingCost = order.subtotal >= 100 ? 0 : (order.total - order.subtotal)
  const pi = state.paymentInfo

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        className="max-w-lg w-full mx-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Payment Approved
          </h1>
          <p className="text-muted-foreground">
            Thank you for your purchase! Your payment was processed successfully.
          </p>
        </div>

        {/* Order Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-blush/30 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Order Number</p>
                  <p className="font-mono font-semibold text-sm">
                    {order.invoiceNumber || order.id}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                  Paid
                </Badge>
              </div>

              {/* Items list */}
              {orderItems.length > 0 && (
                <div className="border-t border-blush/30 pt-3 mb-3">
                  <p className="text-xs text-muted-foreground mb-2">Items</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {orderItems.map((item, i) => (
                      <div key={item.id || i} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="line-clamp-1">{item.name}</p>
                          {item.variantName ? (
                            <p className="text-xs text-muted-foreground">Variant: {item.variantName}</p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <span className="font-medium shrink-0 ml-2">
                          ${(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="border-t border-blush/30 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shippingCost === 0 ? <span className="text-green-600">Free</span> : `$${shippingCost.toLocaleString()}`}</span>
                </div>
                <div className="border-t border-blush/30 pt-2 flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="text-gold">${order.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Ordered date */}
              <div className="border-t border-blush/30 pt-3 mt-3">
                <p className="text-xs text-muted-foreground">
                  Ordered: {formatDate(order.createdAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Confirmation Details */}
        {(pi.cardType || pi.last4 || pi.authCode || pi.paymentId) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-green-200 mb-6">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">Payment Confirmed</span>
                </div>
                <div className="space-y-2 text-sm">
                  {(pi.cardType || pi.last4) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" /> Card
                      </span>
                      <span className="font-medium">
                        {pi.cardType || 'Card'} •••• {pi.last4 || '****'}
                      </span>
                    </div>
                  )}
                  {pi.authCode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Authorization</span>
                      <span className="font-mono text-xs font-medium">{pi.authCode}</span>
                    </div>
                  )}
                  {pi.authStatus && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium text-green-600">{pi.authStatus}</span>
                    </div>
                  )}
                  {pi.checkoutId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Checkout ID</span>
                      <span className="font-mono text-xs">{pi.checkoutId.substring(0, 16)}…</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button onClick={() => navigate('shop')} className="bg-gold hover:bg-gold-light text-white">
            <ShoppingBag className="w-4 h-4 mr-2" /> Continue Shopping
          </Button>
          <Button onClick={() => navigate('account')} variant="outline" className="border-gold/30 text-gold">
            View Orders <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
