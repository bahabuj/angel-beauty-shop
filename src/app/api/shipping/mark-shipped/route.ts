import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { orderId, trackingNumber } = await req.json()
    if (!orderId) return NextResponse.json({ success: false, error: 'Order ID required.' }, { status: 400 })
    const updated = await db.order.update({
      where: { id: orderId },
      data: { status: 'shipped', shippedAt: new Date(), ...(trackingNumber ? { trackingNumber } : {}) },
    })
    return NextResponse.json({ success: true, order: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to mark as shipped.' }, { status: 500 })
  }
}
