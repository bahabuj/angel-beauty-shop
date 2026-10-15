'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useNavStore } from '@/store/nav-store'
import { useCartStore, useCartHydrated } from '@/store/cart-store'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, ShoppingBag, Shield, Truck, Lock, Loader2, ExternalLink, AlertTriangle, Settings, Mail, Phone, Globe, Tag, X, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

type CheckoutPhase = 'info' | 'redirecting' | 'error'

interface ShippingZone {
  id: string
  name: string
  code: string
  flag: string
  rate: number
  estimatedDays: string
  active: boolean
}

interface AppliedPromotion {
  id: string
  name: string
  type: string
  discount: number
  couponCode: string
  freeShipping: boolean
}

// Country list matching the 11 shipping zones. The value is what gets sent
// to /api/orders as `country`; the server matches it back to a zone code.
const COUNTRIES = [
  { value: 'United States',         label: '🇺🇸 United States',         zoneCode: 'US' },
  { value: 'Canada',                label: '🇨🇦 Canada',                zoneCode: 'CA' },
  { value: 'Mexico',                label: '🇲🇽 Mexico',                zoneCode: 'MX' },
  { value: 'United Kingdom',        label: '🇬🇧 United Kingdom',        zoneCode: 'UK' },
  { value: 'Ireland',               label: '🇮🇪 Ireland',               zoneCode: 'UK' },
  { value: 'Germany',               label: '🇩🇪 Germany',               zoneCode: 'EU' },
  { value: 'France',                label: '🇫🇷 France',                zoneCode: 'EU' },
  { value: 'Spain',                 label: '🇪🇸 Spain',                 zoneCode: 'EU' },
  { value: 'Italy',                 label: '🇮🇹 Italy',                 zoneCode: 'EU' },
  { value: 'Netherlands',           label: '🇳🇱 Netherlands',           zoneCode: 'EU' },
  { value: 'Nigeria',               label: '🇳🇬 Nigeria',               zoneCode: 'AF' },
  { value: 'Ghana',                 label: '🇬🇭 Ghana',                 zoneCode: 'AF' },
  { value: 'Kenya',                 label: '🇰🇪 Kenya',                 zoneCode: 'AF' },
  { value: 'South Africa',          label: '🇿🇦 South Africa',          zoneCode: 'AF' },
  { value: 'Egypt',                 label: '🇪🇬 Egypt',                 zoneCode: 'AF' },
  { value: 'Morocco',               label: '🇲🇦 Morocco',               zoneCode: 'AF' },
  { value: 'China',                 label: '🇨🇳 China',                 zoneCode: 'AS' },
  { value: 'Japan',                 label: '🇯🇵 Japan',                 zoneCode: 'AS' },
  { value: 'South Korea',           label: '🇰🇷 South Korea',           zoneCode: 'AS' },
  { value: 'India',                 label: '🇮🇳 India',                 zoneCode: 'AS' },
  { value: 'Indonesia',             label: '🇮🇩 Indonesia',             zoneCode: 'AS' },
  { value: 'Philippines',           label: '🇵🇭 Philippines',           zoneCode: 'AS' },
  { value: 'Australia',             label: '🇦🇺 Australia',             zoneCode: 'AU' },
  { value: 'New Zealand',           label: '🇳🇿 New Zealand',           zoneCode: 'AU' },
  { value: 'Brazil',                label: '🇧🇷 Brazil',                zoneCode: 'SA' },
  { value: 'Argentina',             label: '🇦🇷 Argentina',             zoneCode: 'SA' },
  { value: 'Colombia',              label: '🇨🇴 Colombia',              zoneCode: 'SA' },
  { value: 'Saudi Arabia',          label: '🇸🇦 Saudi Arabia',          zoneCode: 'ME' },
  { value: 'UAE',                   label: '🇦🇪 United Arab Emirates',  zoneCode: 'ME' },
  { value: 'Qatar',                 label: '🇶🇦 Qatar',                 zoneCode: 'ME' },
  { value: 'Turkey',                label: '🇹🇷 Turkey',                zoneCode: 'ME' },
  { value: 'Other',                 label: '🌐 Other',                  zoneCode: 'OTH' },
]

export default function CheckoutPage() {
  const navigate = useNavStore((s) => s.navigate)
  const items = useCartStore((s) => s.items)
  const getSubtotal = useCartStore((s) => s.getSubtotal)
  const hasHydrated = useCartHydrated()
  const user = useAuthStore((s) => s.user)
  const [phase, setPhase] = useState<CheckoutPhase>('info')
  const [errorMessage, setErrorMessage] = useState('')
  const [requiresConfig, setRequiresConfig] = useState(false)

  // ─── Shipping zones + country selection ─────────────────────────────────
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([])
  const [selectedCountry, setSelectedCountry] = useState('United States')

  // ─── EasyPost live carrier rates ──────────────────────────────────────────
  interface CarrierRate {
    rateId: string
    shipmentId: string
    carrier: string
    service: string
    rate: number
    deliveryDays?: number
  }
  const [carrierRates, setCarrierRates] = useState<CarrierRate[]>([])
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null)
  const [easypostShipmentId, setEasypostShipmentId] = useState<string | null>(null)
  const [fetchingRates, setFetchingRates] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)

  // ─── Coupon code state ──────────────────────────────────────────────────
  const [couponInput, setCouponInput] = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [appliedPromotion, setAppliedPromotion] = useState<AppliedPromotion | null>(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [couponFreeShipping, setCouponFreeShipping] = useState(false)

  // ─── Load shipping zones on mount (legacy — kept for reference) ──────────
  useEffect(() => {
    fetch('/api/shipping-zones')
      .then((r) => r.json())
      .then((data) => { if (data.success) setShippingZones(data.zones) })
      .catch(() => {})
  }, [])

  const subtotal = getSubtotal()
  const hasFreeShippingProduct = items.length > 0 && items.every(item => item.freeShipping)

  const [form, setForm] = useState({
    customerName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  })

  // ─── Fetch live carrier rates from EasyPost ──────────────────────────────
  const fetchShippingRates = useCallback(async () => {
    setFetchingRates(true)
    setRateError(null)
    setCarrierRates([])
    setSelectedRateId(null)
    setEasypostShipmentId(null)
    try {
      const res = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
          address: { street: form.address, city: form.city, state: form.state, zip: form.zipCode, country: selectedCountry },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCarrierRates(data.rates || [])
        setEasypostShipmentId(data.shipmentId)
        if (data.rates?.length > 0) setSelectedRateId(data.rates[0].rateId)
      } else {
        setRateError(data.error || 'Could not calculate shipping rates.')
      }
    } catch { setRateError('Failed to fetch shipping rates. Please try again.') }
    finally { setFetchingRates(false) }
  }, [items, form.address, form.city, form.state, form.zipCode, selectedCountry])

  // ─── Determine shipping cost ─────────────────────────────────────────────
  let shipping = 0
  if (couponFreeShipping || hasFreeShippingProduct) {
    shipping = 0
  } else if (selectedRateId && carrierRates.length > 0) {
    const selected = carrierRates.find((r) => r.rateId === selectedRateId)
    if (selected) shipping = selected.rate
  }
  const total = Math.max(0, subtotal - discountAmount) + shipping

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // ─── Coupon apply handler ───────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) {
      toast.error('Please enter a coupon code')
      return
    }
    setValidatingCoupon(true)
    try {
      const res = await fetch('/api/promotions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: code,
          subtotal,
          items: items.map((i) => ({ id: i.id })),
        }),
      })
      const data = await res.json()
      if (data.success && data.valid) {
        setAppliedPromotion(data.promotion)
        setDiscountAmount(data.discountAmount || 0)
        setCouponFreeShipping(data.freeShipping || false)
        toast.success(data.message || 'Coupon applied!')
      } else {
        toast.error(data.message || 'Invalid coupon code')
        setAppliedPromotion(null)
        setDiscountAmount(0)
        setCouponFreeShipping(false)
      }
    } catch (e) {
      toast.error('Failed to validate coupon')
    } finally {
      setValidatingCoupon(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedPromotion(null)
    setDiscountAmount(0)
    setCouponFreeShipping(false)
    setCouponInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.customerName || !form.email || !form.phone || !form.address || !form.city) {
      toast.error('Please fill in all required fields')
      return
    }

    setPhase('redirecting')
    setRequiresConfig(false)
    setErrorMessage('')

    try {
      // 1. Create the order (with country + coupon code)
      const orderItems = items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        variantId: item.variantId ?? null,
        variantName: item.variantName ?? null,
        sku: item.sku ?? null,
      }))

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          userId: user?.id || null,
          items: JSON.stringify(orderItems),
          subtotal,
          country: selectedCountry,
          couponCode: appliedPromotion?.couponCode || undefined,
          easypostShipmentId: easypostShipmentId || undefined,
          easypostRateId: selectedRateId || undefined,
          paymentMethod: 'clover',
          paymentStatus: 'pending',
        }),
      })
      const orderData = await orderRes.json()

      if (!orderData.success) {
        setErrorMessage('Failed to create order. Please try again.')
        setPhase('error')
        return
      }

      // ─── Use the SERVER-RETURNED order total, not client-calculated ───
      const serverOrder = orderData.order
      const serverTotal = serverOrder.total
      const serverSubtotal = serverOrder.subtotal
      const serverShipping = serverTotal - serverSubtotal - (serverOrder.discount || 0)

      // 2. Create Clover hosted checkout session
      const checkoutRes = await fetch('/api/clover/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: serverOrder.id,
          items: orderItems,
          subtotal: serverSubtotal - (serverOrder.discount || 0),
          shipping: serverShipping,
          total: serverTotal,
          customerEmail: form.email,
          customerName: form.customerName,
          customerPhone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          country: selectedCountry,
        }),
      })

      const checkoutData = await checkoutRes.json()

      if (checkoutData.success && checkoutData.redirectUrl) {
        toast.success('Redirecting to secure payment...')
        window.location.href = checkoutData.redirectUrl
      } else if (checkoutData.requiresConfig) {
        setRequiresConfig(true)
        setErrorMessage(checkoutData.error || 'Payment system is not configured. Please contact support.')
        setPhase('error')
      } else {
        setErrorMessage(checkoutData.error || 'Failed to initiate payment. Please try again.')
        setPhase('error')
      }
    } catch {
      setErrorMessage('Something went wrong. Please check your connection and try again.')
      setPhase('error')
    }
  }

  // ─── Loading (cart hydration) ─────────────────────────────────────────────
  // Zustand persist rehydrates from localStorage on the client. Until
  // hydration completes, `items` is `[]` and we'd incorrectly show "Your
  // cart is empty". Show a loading spinner instead so the empty state only
  // appears once we KNOW the cart is actually empty.
  if (!hasHydrated) {
    return (
      <div className="py-12 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gold mx-auto mb-3 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your cart…</p>
        </div>
      </div>
    )
  }

  // ─── Empty Cart (only after hydration) ────────────────────────────────────
  if (items.length === 0 && phase !== 'error') {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-12 h-12 text-gold/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Your cart is empty</p>
          <Button onClick={() => navigate('shop')} className="bg-gold hover:bg-gold-light text-white">Go Shopping</Button>
        </div>
      </div>
    )
  }

  // ─── Redirecting State ───────────────────────────────────────────────────
  if (phase === 'redirecting') {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full border-4 border-gold border-t-transparent animate-spin" />
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Redirecting to Secure Payment
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            You are being redirected to Clover&apos;s secure hosted checkout to complete your payment.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3 text-green-500" />
            <span>Secure payment processing via Clover</span>
          </div>
          <Loader2 className="w-5 h-5 mx-auto mt-4 animate-spin text-gold" />
        </div>
      </div>
    )
  }

  // ─── Error State ─────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          {requiresConfig ? (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
                <Settings className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                Payment System Not Configured
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {errorMessage || 'The payment system has not been set up yet. Please contact the store owner.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate('shop')} className="bg-gold hover:bg-gold-light text-white">
                  Continue Shopping
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                Something Went Wrong
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {errorMessage}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => { setPhase('info'); setErrorMessage(''); }} className="bg-gold hover:bg-gold-light text-white">
                  Try Again
                </Button>
                <Button onClick={() => navigate('cart')} variant="outline" className="border-gold/30 text-gold">
                  Back to Cart
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ─── Main Checkout Form ──────────────────────────────────────────────────
  return (
    <div className="py-8">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate('cart')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </button>

        {/* ─── Branded Header ────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-blush/30">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo.png"
              alt="Angel Beauty Supply"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                Angel Beauty Supply
              </h1>
              <p className="text-xs text-muted-foreground">Secure Checkout</p>
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-1 text-xs text-muted-foreground">
            <a href="https://angelsbeauty.com" className="flex items-center gap-1.5 hover:text-gold transition-colors">
              <Globe className="w-3 h-3" /> angelsbeauty.com
            </a>
            <a href="mailto:hello@angelbeauty.com" className="flex items-center gap-1.5 hover:text-gold transition-colors">
              <Mail className="w-3 h-3" /> hello@angelbeauty.com
            </a>
            <a href="tel:+16179550069" className="flex items-center gap-1.5 hover:text-gold transition-colors">
              <Phone className="w-3 h-3" /> +1 (617) 955-0069
            </a>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-playfair), serif' }}>Checkout</h2>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Shipping form + Clover payment section */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Information */}
              <Card className="border-blush/30">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Customer Information</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input id="name" value={form.customerName} onChange={e => handleChange('customerName', e.target.value)} className="border-blush/30 mt-1" required />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} className="border-blush/30 mt-1" required />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input id="phone" value={form.phone} onChange={e => handleChange('phone', e.target.value)} className="border-blush/30 mt-1" required />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Information */}
              <Card className="border-blush/30">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Delivery Information</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Country selector — drives the shipping rate */}
                    <div className="sm:col-span-2">
                      <Label htmlFor="country">Country / Region *</Label>
                      <Select
                        value={selectedCountry}
                        onValueChange={(v) => setSelectedCountry(v)}
                      >
                        <SelectTrigger id="country" className="border-blush/30 mt-1">
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[60vh]">
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(() => {
                        const countryEntry = COUNTRIES.find((c) => c.value === selectedCountry)
                        const zone = shippingZones.find((z) => z.code === countryEntry?.zoneCode)
                        if (zone && zone.active && zone.estimatedDays) {
                          return (
                            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              Estimated delivery: {zone.estimatedDays}
                            </p>
                          )
                        }
                        return null
                      })()}
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="address">Address *</Label>
                      <Input id="address" value={form.address} onChange={e => handleChange('address', e.target.value)} className="border-blush/30 mt-1" required />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input id="city" value={form.city} onChange={e => handleChange('city', e.target.value)} className="border-blush/30 mt-1" required />
                    </div>
                    <div>
                      <Label htmlFor="state">State / Province</Label>
                      <Input id="state" value={form.state} onChange={e => handleChange('state', e.target.value)} className="border-blush/30 mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="zip">Zip / Postal Code</Label>
                      <Input id="zip" value={form.zipCode} onChange={e => handleChange('zipCode', e.target.value)} className="border-blush/30 mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ─── Shipping Options (EasyPost live carrier rates) ─────────── */}
              {!hasFreeShippingProduct && !couponFreeShipping && (
                <Card className="border-blush/30">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-gold" />
                      Shipping Options
                    </h3>

                    {/* Get Rates button */}
                    {carrierRates.length === 0 && !fetchingRates && !rateError && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Enter your delivery address above, then click the button to see real-time shipping rates from USPS.
                        </p>
                        <Button
                          type="button"
                          onClick={fetchShippingRates}
                          className="bg-gold hover:bg-gold/90"
                          disabled={!form.address || !form.city || !form.zipCode}
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Get Shipping Rates
                        </Button>
                        {(!form.address || !form.city || !form.zipCode) && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Fill in your address, city, and ZIP code first.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Loading state */}
                    {fetchingRates && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin text-gold" />
                        Contacting carriers for live rates…
                      </div>
                    )}

                    {/* Error state */}
                    {rateError && !fetchingRates && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        <p className="font-medium mb-1">Could not calculate shipping</p>
                        <p className="text-xs">{rateError}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 border-red-300 text-red-700 hover:bg-red-50"
                          onClick={fetchShippingRates}
                        >
                          Try Again
                        </Button>
                      </div>
                    )}

                    {/* Rate options */}
                    {carrierRates.length > 0 && !fetchingRates && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-muted-foreground">
                            {carrierRates.length} option{carrierRates.length === 1 ? '' : 's'} available — select one:
                          </p>
                          <button type="button" onClick={fetchShippingRates} className="text-xs text-gold hover:underline">
                            Refresh rates
                          </button>
                        </div>
                        {carrierRates.map((r) => (
                          <label
                            key={r.rateId}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedRateId === r.rateId ? 'border-gold bg-gold/10' : 'border-blush/30 hover:bg-blush/10'
                            }`}
                          >
                            <input
                              type="radio"
                              name="shippingRate"
                              value={r.rateId}
                              checked={selectedRateId === r.rateId}
                              onChange={() => setSelectedRateId(r.rateId)}
                              className="accent-gold"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{r.carrier} — {r.service}</p>
                              {r.deliveryDays && (
                                <p className="text-xs text-muted-foreground">Est. {r.deliveryDays} business day{r.deliveryDays === 1 ? '' : 's'}</p>
                              )}
                            </div>
                            <span className="font-semibold text-gold">${r.rate.toFixed(2)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Coupon Code */}
              <Card className="border-blush/30">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gold" />
                    Coupon Code
                  </h3>
                  {appliedPromotion ? (
                    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-sm">
                            {appliedPromotion.couponCode}
                            <span className="text-muted-foreground ml-2 font-normal">
                              {appliedPromotion.type === 'percentage' && `${appliedPromotion.discount}% off`}
                              {appliedPromotion.type === 'fixed' && `$${appliedPromotion.discount.toFixed(2)} off`}
                              {appliedPromotion.type === 'shipping' && 'Free shipping'}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">{appliedPromotion.name}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-green-100"
                        onClick={handleRemoveCoupon}
                        title="Remove coupon"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE"
                        className="font-mono border-blush/30"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleApplyCoupon()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={validatingCoupon || !couponInput.trim()}
                        className="bg-gold hover:bg-gold/90"
                      >
                        {validatingCoupon ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Have a discount code? Enter it above to apply your savings at checkout.
                  </p>
                </CardContent>
              </Card>

              {/* Secure Payment via Clover */}
              <Card className="border-gold/20 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                        Secure Payment via Clover
                      </h3>
                      <p className="text-xs text-muted-foreground">You&apos;ll be redirected to complete payment securely</p>
                    </div>
                    <Badge className="ml-auto bg-green-100 text-green-700 border-green-200 text-[10px]">
                      <Lock className="w-3 h-3 mr-0.5" /> Secure
                    </Badge>
                  </div>

                  <div className="bg-gradient-to-r from-gold/5 via-blush/5 to-gold/5 rounded-lg p-4 border border-gold/10">
                    <div className="flex items-start gap-3">
                      <ExternalLink className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium mb-1">How it works</p>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          After filling in your details, you&apos;ll be redirected to Clover&apos;s secure hosted checkout page
                          to enter your payment information. Your card details are never stored on our servers &mdash;
                          they&apos;re handled entirely by Clover&apos;s PCI-compliant payment system.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-green-500" /> 256-bit SSL</span>
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-green-500" /> PCI DSS Compliant</span>
                    <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-gold" /> Fast Delivery</span>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gold hover:bg-gold-light text-white py-3 beauty-btn text-base sm:text-lg whitespace-normal break-words text-center leading-tight"
                disabled={!hasFreeShippingProduct && !couponFreeShipping && !selectedRateId && carrierRates.length === 0}
              >
                <Lock className="w-5 h-5 mr-2 shrink-0" />
                {!hasFreeShippingProduct && !couponFreeShipping && !selectedRateId
                  ? 'Select a shipping option to continue'
                  : `Proceed to Secure Payment — $${total.toLocaleString()}`}
              </Button>
            </form>
          </div>

          {/* Right: Order Summary Sidebar */}
          <div>
            <Card className="border-blush/30 sticky top-28">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4" style={{ fontFamily: 'var(--font-playfair), serif' }}>Order Summary</h3>
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {items.map(item => (
                    <div key={`${item.id}:${item.variantId ?? ''}`} className="flex items-center gap-3 text-sm">
                      <div className="w-12 h-12 rounded bg-blush/30 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4 text-gold/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="line-clamp-1">{item.name}</p>
                        {item.variantName ? (
                          <p className="text-xs text-muted-foreground">Variant: {item.variantName}</p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-medium shrink-0">${(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-blush/30 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Discount ({appliedPromotion?.couponCode})
                      </span>
                      <span>−${discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      Shipping
                      {(() => {
                        const zone = shippingZones.find((z) =>
                          z.code === COUNTRIES.find((c) => c.value === selectedCountry)?.zoneCode
                        )
                        return zone && zone.active ? (
                          <span className="text-[10px] text-muted-foreground/70 ml-1">({zone.name})</span>
                        ) : null
                      })()}
                    </span>
                    <span>{shipping === 0 ? <span className="text-green-600">Free</span> : `$${shipping.toLocaleString()}`}</span>
                  </div>
                  <div className="border-t border-blush/30 pt-2 flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span className="text-gold">${total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-gold/5 via-blush/5 to-gold/5 border border-gold/15">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-3.5 h-3.5 text-gold" />
                    <span className="text-xs font-semibold text-foreground/80">Secure Checkout</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Your payment is encrypted with 256-bit SSL security and processed securely through Clover&apos;s hosted checkout.
                  </p>
                </div>

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
