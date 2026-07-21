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
//   - The order item stores `variantId`, `variantName`, and `sku` so invoices
//     and the admin can show exactly which size was purchased.
//
// Shipping rules:
//   - Free shipping for orders >= $100
//   - $15 flat shipping for orders < $100
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
    // Look up each item's product AND its variants. If the item specifies a
    // variantId, use the variant price; otherwise fall back to product.price.
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

        // If a variantId is specified, look up the variant for the
        // authoritative price + display name.
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
          // No variantId sent but product HAS variants — use the cheapest
          // active variant as a safe fallback (backward-compat path).
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
        }
      }

      // If product not found in DB, keep client data but log a warning
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

    // ─── 4. Recalculate totals from validated prices ─────────────────────
    const subtotal = validatedItems.reduce(
      (sum: number, item: OrderItem) => sum + item.price * item.quantity,
      0
    )

    // Shipping: free if any product has freeShipping, or free over $100, otherwise $15 flat
    const hasFreeShipping = products.some((p) => p.freeShipping)
    const shipping = hasFreeShipping || subtotal >= 100 ? 0 : 15
    const total = subtotal + shipping

    // ─── 5. Generate invoice number and create order ─────────────────────
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
        country: data.country || 'United States',
        paymentMethod: data.paymentMethod || 'clover',
        userId: data.userId || null,
        items: JSON.stringify(validatedItems),
        subtotal,
        total,
        // Always force pending — client cannot override these
        paymentStatus: 'pending',
        status: 'pending',
        invoiceNumber,
      },
    })

    if (process.env.CLOVER_DEBUG === 'true') {
      console.log(
        `[Orders] Created order ${order.id} — subtotal: $${subtotal.toFixed(2)}, shipping: $${shipping.toFixed(2)}, total: $${total.toFixed(2)}`
      )
    }

    // ─── 6. Trigger invoice generation in background ─────────────────────
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
