import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─── POST /api/promotions/validate ─────────────────────────────────────────
// Validates a coupon code against the customer's cart contents.
//
// Request body:
//   {
//     couponCode: string,         // e.g. "BLACKFRI40"
//     subtotal: number,           // cart subtotal in USD (before shipping/discount)
//     items: [{ id, categorySlug }]  // product IDs + their categories for eligibility checks
//   }
//
// Response (success):
//   {
//     success: true,
//     valid: true,
//     promotion: { id, name, type, discount, couponCode, freeShipping },
//     discountAmount: number,     // USD amount to subtract from subtotal
//     freeShipping: boolean,      // whether shipping should be waived
//     message: string
//   }
//
// Response (invalid):
//   {
//     success: true,
//     valid: false,
//     message: string  // human-readable reason
//   }
// ─────────────────────────────────────────────────────────────────────────────

interface ValidateItem {
  id: string
  categorySlug?: string
}

interface ValidateRequest {
  couponCode?: string
  subtotal?: number
  items?: ValidateItem[]
}

export async function POST(req: NextRequest) {
  try {
    const body: ValidateRequest = await req.json()
    const couponCode = (body.couponCode || '').trim().toUpperCase()
    const subtotal = typeof body.subtotal === 'number' ? body.subtotal : 0
    const items = Array.isArray(body.items) ? body.items : []

    if (!couponCode) {
      return NextResponse.json(
        { success: true, valid: false, message: 'No coupon code provided.' }
      )
    }

    // ─── Look up the promotion ────────────────────────────────────────────
    const promotion = await db.promotion.findUnique({
      where: { couponCode },
    })

    if (!promotion) {
      return NextResponse.json({
        success: true,
        valid: false,
        message: `Coupon code "${couponCode}" does not exist.`,
      })
    }

    // ─── Check status ─────────────────────────────────────────────────────
    if (promotion.status === 'disabled') {
      return NextResponse.json({
        success: true,
        valid: false,
        message: 'This coupon has been disabled.',
      })
    }
    if (promotion.status === 'expired') {
      return NextResponse.json({
        success: true,
        valid: false,
        message: 'This coupon has expired.',
      })
    }

    // ─── Check date window ────────────────────────────────────────────────
    const now = new Date()
    if (promotion.startDate && now < promotion.startDate) {
      return NextResponse.json({
        success: true,
        valid: false,
        message: `This coupon is not valid until ${promotion.startDate.toLocaleDateString()}.`,
      })
    }
    if (promotion.endDate && now > promotion.endDate) {
      // Auto-mark as expired in DB (best-effort, don't block on failure)
      try {
        await db.promotion.update({
          where: { id: promotion.id },
          data: { status: 'expired' },
        })
      } catch {}
      return NextResponse.json({
        success: true,
        valid: false,
        message: 'This coupon has expired.',
      })
    }

    // ─── Check usage limit ───────────────────────────────────────────────
    if (promotion.usageLimit > 0 && promotion.usedCount >= promotion.usageLimit) {
      return NextResponse.json({
        success: true,
        valid: false,
        message: 'This coupon has reached its usage limit.',
      })
    }

    // ─── Check minimum order ──────────────────────────────────────────────
    if (promotion.minimumOrder > 0 && subtotal < promotion.minimumOrder) {
      return NextResponse.json({
        success: true,
        valid: false,
        message: `This coupon requires a minimum order of $${promotion.minimumOrder.toFixed(2)}.`,
      })
    }

    // ─── Check product / category eligibility ─────────────────────────────
    const eligibleProductIds: string[] = (() => {
      try { return JSON.parse(promotion.eligibleProducts || '[]') } catch { return [] }
    })()
    const eligibleCategorySlugs: string[] = (() => {
      try { return JSON.parse(promotion.eligibleCategories || '[]') } catch { return [] }
    })()

    if (eligibleProductIds.length > 0 || eligibleCategorySlugs.length > 0) {
      // At least one item must match an eligible product ID or category slug
      const matches = items.some((item) => {
        const productMatch = eligibleProductIds.length > 0 && eligibleProductIds.includes(item.id)
        const categoryMatch = eligibleCategorySlugs.length > 0 && item.categorySlug && eligibleCategorySlugs.includes(item.categorySlug)
        return productMatch || categoryMatch
      })
      if (!matches) {
        return NextResponse.json({
          success: true,
          valid: false,
          message: 'This coupon is not valid for the items in your cart.',
        })
      }
    }

    // ─── Compute discount amount ──────────────────────────────────────────
    let discountAmount = 0
    if (promotion.type === 'percentage') {
      discountAmount = (subtotal * promotion.discount) / 100
    } else if (promotion.type === 'fixed') {
      discountAmount = Math.min(promotion.discount, subtotal)
    } else if (promotion.type === 'shipping') {
      // Free shipping — no subtotal discount, but shipping waived
      discountAmount = 0
    }

    const freeShipping = promotion.freeShipping || promotion.type === 'shipping'

    return NextResponse.json({
      success: true,
      valid: true,
      promotion: {
        id: promotion.id,
        name: promotion.name,
        type: promotion.type,
        discount: promotion.discount,
        couponCode: promotion.couponCode,
        freeShipping,
      },
      discountAmount,
      freeShipping,
      message:
        promotion.type === 'percentage'
          ? `${promotion.discount}% off applied!`
          : promotion.type === 'fixed'
          ? `$${promotion.discount.toFixed(2)} off applied!`
          : 'Free shipping applied!',
    })
  } catch (error: any) {
    console.error('[Promotions Validate] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Failed to validate coupon' },
      { status: 500 }
    )
  }
}
