import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buyLabel, getRateById, isEasyPostConfigured, EasyPostAPIError } from '@/lib/easypost'

export async function POST(req: NextRequest) {
  try {
    if (!isEasyPostConfigured()) {
      return NextResponse.json({ success: false, error: 'EasyPost not configured.' }, { status: 503 })
    }
    const { orderId } = await req.json()
    if (!orderId) return NextResponse.json({ success: false, error: 'Order ID required.' }, { status: 400 })

    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) return NextResponse.json({ success: false, error: 'Order not found.' }, { status: 404 })
    if (!order.easypostShipmentId || !order.easypostRateId) {
      return NextResponse.json({ success: false, error: 'No EasyPost shipment on this order.' }, { status: 400 })
    }

    const label = await buyLabel(order.easypostShipmentId, order.easypostRateId)
    const updated = await db.order.update({
      where: { id: orderId },
      data: {
        trackingNumber: label.trackingCode,
        labelUrl: label.labelUrl,
        shippedAt: new Date(),
        status: order.status === 'pending' ? 'shipped' : order.status,
      },
    })
    return NextResponse.json({ success: true, order: updated, label })
  } catch (error: any) {
    if (error instanceof EasyPostAPIError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 502 })
    }
    console.error('[shipping/label] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: 'Failed to purchase label.' }, { status: 500 })
  }
}
