import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const promotion = await db.promotion.findUnique({ where: { id } })
    if (!promotion) {
      return NextResponse.json({ success: false, error: 'Promotion not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, promotion })
  } catch (error: any) {
    console.error('[Promotion GET] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: 'Failed to fetch promotion' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const data: any = {}
    if (typeof body.name === 'string') data.name = body.name.trim()
    if (typeof body.description === 'string') data.description = body.description.trim() || null
    if (['percentage', 'fixed', 'shipping'].includes(body.type)) data.type = body.type
    if (typeof body.discount === 'number') data.discount = parseFloat(body.discount)
    if (typeof body.couponCode === 'string') data.couponCode = body.couponCode.trim().toUpperCase()
    if (typeof body.minimumOrder === 'number') data.minimumOrder = parseFloat(body.minimumOrder)
    if (typeof body.freeShipping === 'boolean') data.freeShipping = body.freeShipping
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null
    if (typeof body.usageLimit === 'number') data.usageLimit = parseInt(body.usageLimit)
    if (['active', 'scheduled', 'expired', 'disabled'].includes(body.status)) data.status = body.status

    // Normalize arrays
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
    if (body.eligibleProducts !== undefined) data.eligibleProducts = normalizeJsonArray(body.eligibleProducts)
    if (body.eligibleCategories !== undefined) data.eligibleCategories = normalizeJsonArray(body.eligibleCategories)

    const promotion = await db.promotion.update({ where: { id }, data })
    return NextResponse.json({ success: true, promotion })
  } catch (error: any) {
    console.error('[Promotion PUT] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: 'Failed to update promotion' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.promotion.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Promotion DELETE] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: 'Failed to delete promotion' }, { status: 500 })
  }
}
