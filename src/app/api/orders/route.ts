import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getSiteUrl } from '@/lib/utils'
import { getRateById, isEasyPostConfigured, EasyPostConfigError, EasyPostAPIError } from '@/lib/easypost'

// ─── GET /api/orders ──────────────────────────────────────────────────────────
// SECURITY FIX: Require authentication.
//   - admin → all orders
//   - authenticated customer → only their own orders
//   - unauthenticated → 401
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const isAdmin = session.user.role === 'admin'
    const orders = await db.order.findMany({
      where: isAdmin ? undefined : { OR: [{ userId: session.user.id }, { email: session.user.email }] },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, orders })
  } catch (error) {
    console.error('[Orders GET Error]', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 })
  }
}

// ─── POST /api/orders (unchanged — public for guest checkout) ────────────────
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

function matchShippingZoneCode(country: string): string | null {
  const c = (country || '').toLowerCase().trim()
  if (!c) return null
  if (c.includes('united states') || c.includes('usa') || c.includes('u.s.') || c === 'us') return 'US'
  if (c.includes('canada') || c === 'ca') return 'CA'
  if (c.includes('mexico') || c === 'mx') return 'MX'
  if (c.includes('united kingdom') || c.includes('uk') || c.includes('ireland') || c.includes('britain') || c.includes('england') || c.includes('scotland') || c.includes('wales')) return 'UK'
  if (c.includes('australia') || c.includes('new zealand') || c === 'au' || c === 'nz') return 'AU'
  if (c.includes('europe') || c.includes('germany') || c.includes('france') || c.includes('spain') || c.includes('italy') || c.includes('netherlands') || c.includes('belgium') || c.includes('sweden') || c.includes('norway') || c.includes('denmark') || c.includes('finland') || c.includes('austria') || c.includes('switzerland') || c.includes('portugal') || c.includes('greece') || c.includes('poland')) return 'EU'
  if (c.includes('africa') || c.includes('nigeria') || c.includes('ghana') || c.includes('kenya') || c.includes('south africa') || c.includes('egypt') || c.includes('morocco') || c.includes('ethiopia') || c.includes('tanzania') || c.includes('uganda') || c.includes('cameroon') || c.includes('ivory coast') || c.includes('senegal') || c.includes('zimbabwe') || c.includes('zambia')) return 'AF'
  if (c.includes('asia') || c.includes('china') || c.includes('japan') || c.includes('korea') || c.includes('india') || c.includes('pakistan') || c.includes('bangladesh') || c.includes('indonesia') || c.includes('philippines') || c.includes('vietnam') || c.includes('thailand') || c.includes('malaysia') || c.includes('singapore') || c.includes('hong kong') || c.includes('taiwan') || c.includes('sri lanka') || c.includes('nepal')) return 'AS'
  if (c.includes('south america') || c.includes('brazil') || c.includes('argentina') || c.includes('chile') || c.includes('colombia') || c.includes('peru') || c.includes('venezuela') || c.includes('ecuador') || c.includes('bolivia') || c.includes('uruguay') || c.includes('paraguay')) return 'SA'
  if (c.includes('middle east') || c.includes('saudi arabia') || c.includes('uae') || c.includes('dubai') || c.includes('qatar') || c.includes('kuwait') || c.includes('bahrain') || c.includes('oman') || c.includes('jordan') || c.includes('lebanon') || c.includes('israel') || c.includes('turkey') || c.includes('iran') || c.includes('iraq')) return 'ME'
  return 'OTH'
}

function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `INV-${year}${month}-${random}`
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    if (!data.customerName || !data.email || !data.address || !data.city) {
      return NextResponse.json({ success: false, error: 'Missing required customer information' }, { status: 400 })
    }
    if (!data.items) {
      return NextResponse.json({ success: false, error: 'Order items are required' }, { status: 400 })
    }

    let items: OrderItem[]
    if (typeof data.items === 'string') { try { items = JSON.parse(data.items) } catch { return NextResponse.json({ success: false, error: 'Invalid items format' }, { status: 400 }) } }
    else { items = data.items }
    if (!Array.isArray(items) || items.length === 0) { return NextResponse.json({ success: false, error: 'At least one item is required' }, { status: 400 }) }

    const productIds = items.map((item: OrderItem) => item.id).filter(Boolean)
    const products = await db.product.findMany({ where: { id: { in: productIds } }, include: { variants: true } })
    const productMap = new Map(products.map((p) => [p.id, p]))

    const validatedItems = items.map((item: OrderItem) => {
      const product = productMap.get(item.id)
      if (product) {
        let authoritativePrice = product.price
        let variantName: string | null = null
        let sku: string | null = item.sku ?? null
        if (item.variantId) {
          const variant = product.variants.find((v) => v.id === item.variantId)
          if (variant) { authoritativePrice = variant.price; variantName = variant.name; sku = variant.sku ?? null }
        } else if (product.variants.length > 0) {
          const active = product.variants.filter((v) => v.active)
          const pool = active.length > 0 ? active : product.variants
          const cheapest = pool.reduce((min, v) => (v.price < min.price ? v : min), pool[0])
          authoritativePrice = cheapest.price; variantName = cheapest.name; sku = cheapest.sku ?? null
        }
        return { ...item, name: product.name, price: authoritativePrice, image: item.image || (product.images ? JSON.parse(product.images)[0] : undefined), variantId: item.variantId ?? null, variantName, sku, categorySlug: product.categorySlug }
      }
      // SECURITY FIX: Reject unknown products instead of trusting client prices
      return null as unknown as OrderItem
    }).filter((item: OrderItem) => item !== null && item.id !== undefined)

    // SECURITY FIX: Reject orders with unknown product IDs
    if (validatedItems.length < items.length) {
      const rejectedIds = items.filter(item => !productMap.has(item.id)).map(item => item.id)
      return NextResponse.json({ success: false, error: `Order contains invalid product IDs: ${rejectedIds.join(', ')}` }, { status: 400 })
    }

    const subtotal = validatedItems.reduce((sum: number, item: OrderItem) => sum + item.price * item.quantity, 0)

    let discount = 0
    let freeShippingFromPromo = false
    let promotionId: string | null = null
    let couponCode: string | null = null

    if (data.couponCode && typeof data.couponCode === 'string') {
      const code = data.couponCode.trim().toUpperCase()
      const promotion = await db.promotion.findUnique({ where: { couponCode: code } })
      if (promotion) {
        const now = new Date()
        const isValid = promotion.status === 'active' && (!promotion.startDate || now >= promotion.startDate) && (!promotion.endDate || now <= promotion.endDate) && (promotion.usageLimit === 0 || promotion.usedCount < promotion.usageLimit) && (promotion.minimumOrder === 0 || subtotal >= promotion.minimumOrder)
        if (isValid) {
          const eligibleProductIds: string[] = (() => { try { return JSON.parse(promotion.eligibleProducts || '[]') } catch { return [] } })()
          const eligibleCategorySlugs: string[] = (() => { try { return JSON.parse(promotion.eligibleCategories || '[]') } catch { return [] } })()
          if (eligibleProductIds.length > 0 || eligibleCategorySlugs.length > 0) {
            const matches = validatedItems.some((item: any) => { const productMatch = eligibleProductIds.length > 0 && eligibleProductIds.includes(item.id); const categoryMatch = eligibleCategorySlugs.length > 0 && item.categorySlug && eligibleCategorySlugs.includes(item.categorySlug); return productMatch || categoryMatch })
            if (!matches) { console.warn(`[Orders] Coupon ${code} not eligible for cart contents`) }
          }
          if (isValid) {
            if (promotion.type === 'percentage') { discount = (subtotal * promotion.discount) / 100 }
            else if (promotion.type === 'fixed') { discount = Math.min(promotion.discount, subtotal) }
            freeShippingFromPromo = promotion.freeShipping || promotion.type === 'shipping'
            promotionId = promotion.id; couponCode = promotion.couponCode
          }
        }
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discount)

    // SECURITY FIX: Fixed vacuous-truth free shipping bug
    const hasFreeShippingProduct = items.length > 0 && items.every((item: OrderItem) => {
      const product = productMap.get(item.id)
      return product !== undefined && product.freeShipping === true
    })

    const country = data.country || 'United States'
    let shipping = 0
    let shippingZoneCode: string | null = null
    let easypostShipmentId: string | null = null
    let easypostRateId: string | null = null
    let selectedCarrier: string | null = null
    let selectedService: string | null = null

    if (freeShippingFromPromo || hasFreeShippingProduct) {
      shipping = 0
    } else {
      if (!isEasyPostConfigured()) {
        return NextResponse.json({ success: false, error: 'Shipping calculation is not available right now.', code: 'SHIPPING_NOT_CONFIGURED' }, { status: 503 })
      }
      const shipmentId = data.easypostShipmentId
      const rateId = data.easypostRateId
      if (!shipmentId || !rateId) {
        return NextResponse.json({ success: false, error: 'Please select a shipping option before placing your order.', code: 'NO_SHIPPING_RATE_SELECTED' }, { status: 400 })
      }
      let verifiedRate
      try { verifiedRate = await getRateById(shipmentId, rateId) }
      catch (err: any) {
        if (err instanceof EasyPostConfigError) { return NextResponse.json({ success: false, error: 'Shipping calculation is not configured.', code: 'SHIPPING_NOT_CONFIGURED' }, { status: 503 }) }
        if (err instanceof EasyPostAPIError) { return NextResponse.json({ success: false, error: 'Could not verify the selected shipping rate.', code: 'RATE_VERIFICATION_FAILED' }, { status: 502 }) }
        return NextResponse.json({ success: false, error: 'Could not verify the selected shipping rate.', code: 'RATE_VERIFICATION_FAILED' }, { status: 500 })
      }
      if (!verifiedRate) { return NextResponse.json({ success: false, error: 'The selected shipping rate is no longer available.', code: 'RATE_NOT_FOUND' }, { status: 400 }) }
      shipping = verifiedRate.rate; easypostShipmentId = verifiedRate.shipmentId; easypostRateId = verifiedRate.rateId; selectedCarrier = verifiedRate.carrier; selectedService = verifiedRate.service; shippingZoneCode = null
    }

    const total = discountedSubtotal + shipping
    const invoiceNumber = generateInvoiceNumber()

    const order = await db.order.create({
      data: {
        customerName: data.customerName, email: data.email, phone: data.phone || null,
        address: data.address, city: data.city, state: data.state || null, zipCode: data.zipCode || null,
        country, paymentMethod: data.paymentMethod || 'clover', userId: data.userId || null,
        items: JSON.stringify(validatedItems), subtotal, discount, shippingRate: shipping,
        shippingZoneCode, promotionId, couponCode, easypostShipmentId, easypostRateId, selectedCarrier, selectedService,
        total, paymentStatus: 'pending', status: 'pending', invoiceNumber,
      },
    })

    if (promotionId) {
      try { await db.promotion.update({ where: { id: promotionId }, data: { usedCount: { increment: 1 } } }) } catch (e) { console.warn(`[Orders] Failed to increment usage count for promotion ${promotionId}:`, e) }
    }

    try {
      const siteUrl = getSiteUrl()
      fetch(`${siteUrl}/api/invoice/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id, sendEmail: false }) }).catch(() => {})
    } catch {}

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('[Orders POST Error]', error)
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 })
  }
}
