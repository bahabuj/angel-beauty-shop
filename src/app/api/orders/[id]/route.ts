import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const order = await db.order.findUnique({ where: { id } })
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    if (session.user.role !== 'admin' && order.userId !== session.user.id && order.email !== session.user.email) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ success: true, order })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch order' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 401 })
    }
    const { id } = await params
    const body = await req.json()
    // Field whitelist — never allow mass-assignment
    const allowedFields = ['status', 'paymentStatus', 'trackingNumber', 'labelUrl', 'shippedAt', 'easypostShipmentId', 'easypostRateId', 'selectedCarrier', 'selectedService', 'invoiceNumber', 'invoiceSent']
    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) data[field] = body[field]
    }
    if (Object.keys(data).length === 0) return NextResponse.json({ success: false, error: 'No updatable fields provided' }, { status: 400 })
    const order = await db.order.update({ where: { id }, data })
    return NextResponse.json({ success: true, order })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 })
  }
}
