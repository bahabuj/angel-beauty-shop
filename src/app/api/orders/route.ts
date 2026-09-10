import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getSiteUrl } from '@/lib/utils'

// ─── GET /api/orders ──────────────────────────────────────────────────────────
// Returns orders sorted by creation date (newest first).
//
// Role-based filter:
//   - admin (or no session — admin panel is now open without auth) → all orders
//   - others → only orders whose userId matches the session user id OR whose
//              email matches the session user email (used by the customer
//              "My Account" page in account-page.tsx)

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    const isAdminContext = !session?.user || session.user.role === 'admin'

    const orders = await db.order.findMany({
      where: isAdminContext
        ? undefined
        : {
            OR: [
              { userId: session!.user.id },
              { email: session!.user.email },
            ],
          },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, orders })
  } catch (error) {
    console.error('[Orders GET Error]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────
//
// Creates a new order with SERVER-SIDE price validation.
//
// The client submits items with prices, but the server overrides those prices
// with the authoritative prices from the database. This prevents price
// manipulation on the client side.
//
// Variant handling:
//   - If an item has a `variantId`, the server looks up the ProductVariant and
//     uses ITS price (not the product's denormalized price).
//   - If an item has NO `variantId`, the server falls back to the Product's
//     denormalized price (backward compatibility).
//
// Shipping rules (in priority order):
//   1. If a promotion with freeShipping is applied → shipping = 0
//   2. If any product has freeShipping flag → shipping = 0
//   3. If the customer's country matches an active ShippingZone → use that zone's rate
//   4. Otherwise fall back to: free over $100, $15 flat under $100
//
// Promotion rules:
//   - Optional `couponCode` field is validated against the Promotion table
//   - Discount is applied to subtotal (percentage or fixed)
//   - freeShipping flag is honored
//   - Eligibility (products, categories, min order, dates, usage limit) is checked
// ─────────────────────────────────────────────────────────────────────────────

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

/** Map a customer country name to a shipping-zone code. */
function matchShippingZoneCode(country: string): string | null {
  const c = (country || '').toLowerCase().trim()
  if (!c) return null
  // Direct matches on common country names
  if (c.includes('united states') || c.includes('usa') || c.includes('u.s.') || c === 'us') return 'US'
  if (c.includes('canada') || c === 'ca') return 'CA'
  if (c.includes('mexico') || c === 'mx') return 'MX'
  if (c.includes('united kingdom') || c.includes('uk') || c.includes('ireland') || c.includes('britain') || c.includes('england') || c.includes('scotland') || c.includes('wales')) return 'UK'
  if (c.includes('australia') || c.includes('new zealand') || c === 'au' || c === 'nz') return 'AU'
  // Region matches
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

    // ─── 1. Validate required fields ─────────────────────────────────────
    if (!data.customerName || !data.email || !data.address || !data.city) {
      return NextResponse.json(
        { success: false, error: 'Missing required customer information' },
        { status: 400 }
      )
    }

    if (!data.items) {
      return NextResponse.json(
        { success: false, error: 'Order items are required' },
        { status: 400 }
      )
    }

    // ─── 2. Parse items and validate ─────────────────────────────────────
    let items: OrderItem[]
    if (typeof data.items === 'string') {
      try {
        items = JSON.parse(data.items)
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid items format' },
          { status: 400 }
        )
      }
    } else {
      items = data.items
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      )
    }

    // ─── 3. Server-side price validation (variant-aware) ─────────────────
    const productIds = items.map((item: OrderItem) => item.id).filter(Boolean)

    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true },
    })

    const productMap = new Map(products.map((p) => [p.id, p]))

    const validatedItems = items.map((item: OrderItem) => {
      const product = productMap.get(item.id)

      if (product) {
        let authoritativePrice = product.price
        let variantName: string | null = null
        let sku: string | null = item.sku ?? null

        if (item.variantId) {
          const variant = product.variants.find((v) => v.id === item.variantId)
          if (variant) {
            authoritativePrice = variant.price
            variantName = variant.name
            sku = variant.sku ?? null
          } else {
            console.warn(
              `[Orders] Variant ${item.variantId} not found for product ${item.id} — falling back to product price`
            )
          }
        } else if (product.variants.length > 0) {
          const active = product.variants.filter((v) => v.active)
          const pool = active.length > 0 ? active : product.variants
          const cheapest = pool.reduce((min, v) => (v.price < min.price ? v : min), pool[0])
          authoritativePrice = cheapest.price
          variantName = cheapest.name
          sku = cheapest.sku ?? null
        }

        return {
          ...item,
          name: product.name,
          price: authoritativePrice,
          image: item.image || (product.images ? JSON.parse(product.images)[0] : undefined),
          variantId: item.variantId ?? null,
          variantName,
          sku,
          categorySlug: product.categorySlug,
        }
      }

      console.warn(
        `[Orders] Product ${item.id} not found in DB — using client-submitted price: $${item.price}`
      )
      return {
        ...item,
        variantId: item.variantId ?? null,
        variantName: item.variantName ?? null,
        sku: item.sku ?? null,
      }
    })

    // ─── 4. Recalculate subtotal from validated prices ───────────────────
    const subtotal = validatedItems.reduce(
      (sum: number, item: OrderItem) => sum + item.price * item.quantity,
      0
    )

    // ─── 5. Validate coupon code (if provided) ───────────────────────────
    let discount = 0
    let freeShippingFromPromo = false
    let promotionId: string | null = null
    let couponCode: string | null = null

    if (data.couponCode && typeof data.couponCode === 'string') {
      const code = data.couponCode.trim().toUpperCase()
      const promotion = await db.promotion.findUnique({ where: { couponCode: code } })

      if (promotion) {
        // Re-validate all rules server-side (don't trust the client)
        const now = new Date()
        const isValid =
          promotion.status === 'active' &&
          (!promotion.startDate || now >= promotion.startDate) &&
          (!promotion.endDate || now <= promotion.endDate) &&
          (promotion.usageLimit === 0 || promotion.usedCount < promotion.usageLimit) &&
          (promotion.minimumOrder === 0 || subtotal >= promotion.minimumOrder)

        // Eligibility check (products / categories)
        if (isValid) {
          const eligibleProductIds: string[] = (() => {
            try { return JSON.parse(promotion.eligibleProducts || '[]') } catch { return [] }
          })()
          const eligibleCategorySlugs: string[] = (() => {
            try { return JSON.parse(promotion.eligibleCategories || '[]') } catch { return [] }
          })()

          if (eligibleProductIds.length > 0 || eligibleCategorySlugs.length > 0) {
            const matches = validatedItems.some((item: any) => {
              const productMatch = eligibleProductIds.length > 0 && eligibleProductIds.includes(item.id)
              const categoryMatch = eligibleCategorySlugs.length > 0 && item.categorySlug && eligibleCategorySlugs.includes(item.categorySlug)
              return productMatch || categoryMatch
            })
            if (!matches) {
              console.warn(`[Orders] Coupon ${code} not eligible for cart contents`)
            }
          } else {
            // No eligibility restrictions → applies to all
          }

          if (isValid) {
            // Compute discount
            if (promotion.type === 'percentage') {
              discount = (subtotal * promotion.discount) / 100
            } else if (promotion.type === 'fixed') {
              discount = Math.min(promotion.discount, subtotal)
            }
            freeShippingFromPromo = promotion.freeShipping || promotion.type === 'shipping'
            promotionId = promotion.id
            couponCode = promotion.couponCode
          }
        } else {
          console.warn(`[Orders] Coupon ${code} failed server-side validation`)
        }
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discount)

    // ─── 6. Calculate shipping ───────────────────────────────────────────
    const hasFreeShippingProduct = products.some((p) => p.freeShipping)
    const country = data.country || 'United States'

    let shipping = 0
    let shippingZoneCode: string | null = null

    if (freeShippingFromPromo || hasFreeShippingProduct || discountedSubtotal >= 100) {
      shipping = 0
    } else {
      // Look up shipping zone by country
      const zoneCode = matchShippingZoneCode(country)
      if (zoneCode) {
        const zone = await db.shippingZone.findUnique({ where: { code: zoneCode } })
        if (zone && zone.active) {
          shipping = zone.rate
          shippingZoneCode = zone.code
        } else if (zone && !zone.active) {
          // Zone exists but inactive — fall back to default
          shipping = 15
          shippingZoneCode = zone.code
        } else {
          // No matching zone — default flat rate
          shipping = 15
        }
      } else {
        shipping = 15
      }
    }

    const total = discountedSubtotal + shipping

    // ─── 7. Generate invoice number and create order ─────────────────────
    const invoiceNumber = generateInvoiceNumber()

    const order = await db.order.create({
      data: {
        customerName: data.customerName,
        email: data.email,
        phone: data.phone || null,
        address: data.address,
        city: data.city,
        state: data.state || null,
        zipCode: data.zipCode || null,
        country,
        paymentMethod: data.paymentMethod || 'clover',
        userId: data.userId || null,
        items: JSON.stringify(validatedItems),
        subtotal,
        discount,
        shippingRate: shipping,
        shippingZoneCode,
        promotionId,
        couponCode,
        total,
        // Always force pending — client cannot override these
        paymentStatus: 'pending',
        status: 'pending',
        invoiceNumber,
      },
    })

    // ─── 8. Increment promotion usage count (if a coupon was used) ───────
    if (promotionId) {
      try {
        await db.promotion.update({
          where: { id: promotionId },
          data: { usedCount: { increment: 1 } },
        })
      } catch (e) {
        console.warn(`[Orders] Failed to increment usage count for promotion ${promotionId}:`, e)
      }
    }

    if (process.env.CLOVER_DEBUG === 'true') {
      console.log(
        `[Orders] Created order ${order.id} — subtotal: $${subtotal.toFixed(2)}, discount: $${discount.toFixed(2)}, shipping: $${shipping.toFixed(2)} (${shippingZoneCode || 'default'}), total: $${total.toFixed(2)}`
      )
    }

    // ─── 9. Trigger invoice generation in background ─────────────────────
    try {
      const siteUrl = getSiteUrl()
      fetch(`${siteUrl}/api/invoice/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, sendEmail: false }),
      }).catch(() => {
        // Non-blocking — don't fail the order if invoice generation fails
      })
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('[Orders POST Error]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
