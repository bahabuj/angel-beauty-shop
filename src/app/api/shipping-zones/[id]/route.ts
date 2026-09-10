import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const zone = await db.shippingZone.findUnique({ where: { id } })
    if (!zone) {
      return NextResponse.json({ success: false, error: 'Shipping zone not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, zone })
  } catch (error: any) {
    console.error('[ShippingZone GET] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: 'Failed to fetch shipping zone' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, code, flag, rate, estimatedDays, active, order } = body

    const data: any = {}
    if (typeof name === 'string') data.name = name.trim()
    if (typeof code === 'string') data.code = code.trim()
    if (typeof flag === 'string') data.flag = flag.trim()
    if (typeof rate === 'number') data.rate = rate
    else if (typeof rate === 'string') data.rate = parseFloat(rate) || 0
    if (typeof estimatedDays === 'string') data.estimatedDays = estimatedDays.trim()
    if (typeof active === 'boolean') data.active = active
    if (typeof order === 'number') data.order = order

    const zone = await db.shippingZone.update({ where: { id }, data })
    return NextResponse.json({ success: true, zone })
  } catch (error: any) {
    console.error('[ShippingZone PUT] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: 'Failed to update shipping zone' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.shippingZone.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[ShippingZone DELETE] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: 'Failed to delete shipping zone' }, { status: 500 })
  }
}
