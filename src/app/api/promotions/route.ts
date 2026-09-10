import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const where: any = {}
    if (status && status !== 'all') where.status = status

    const promotions = await db.promotion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, promotions })
  } catch (error: any) {
    console.error('[Promotions GET] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch promotions' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'Promotion name is required' }, { status: 400 })
    }
    if (!body.couponCode || !body.couponCode.trim()) {
      return NextResponse.json({ success: false, error: 'Coupon code is required' }, { status: 400 })
    }
    if (typeof body.discount !== 'number' || body.discount < 0) {
      return NextResponse.json({ success: false, error: 'Discount must be a non-negative number' }, { status: 400 })
    }

    // Normalize coupon code to uppercase
    const couponCode = body.couponCode.trim().toUpperCase()

    // Check for duplicate coupon code
    const existing = await db.promotion.findUnique({ where: { couponCode } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A promotion with this coupon code already exists' },
        { status: 409 }
      )
    }

    // Validate type
    const type = ['percentage', 'fixed', 'shipping'].includes(body.type) ? body.type : 'percentage'

    // Validate discount bounds for percentage type
    if (type === 'percentage' && body.discount > 100) {
      return NextResponse.json(
        { success: false, error: 'Percentage discount cannot exceed 100' },
        { status: 400 }
      )
    }

    // Accept arrays or JSON strings for eligibleProducts/Categories
    const normalizeJsonArray = (val: any): string => {
      if (Array.isArray(val)) return JSON.stringify(val)
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed)) return JSON.stringify(parsed)
        } catch {}
      }
      return '[]'
    }

    const promotion = await db.promotion.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        type,
        discount: parseFloat(body.discount),
        couponCode,
        minimumOrder: typeof body.minimumOrder === 'number' ? parseFloat(body.minimumOrder) : 0,
        eligibleProducts: normalizeJsonArray(body.eligibleProducts),
        eligibleCategories: normalizeJsonArray(body.eligibleCategories),
        freeShipping: body.freeShipping === true || body.type === 'shipping',
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        usageLimit: typeof body.usageLimit === 'number' ? parseInt(body.usageLimit) : 0,
        status: ['active', 'scheduled', 'expired', 'disabled'].includes(body.status) ? body.status : 'active',
      },
    })

    return NextResponse.json({ success: true, promotion }, { status: 201 })
  } catch (error: any) {
    console.error('[Promotions POST] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create promotion' },
      { status: 500 }
    )
  }
}
