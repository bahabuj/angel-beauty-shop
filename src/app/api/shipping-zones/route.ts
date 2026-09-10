import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const zones = await db.shippingZone.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ success: true, zones })
  } catch (error: any) {
    console.error('[ShippingZones GET] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shipping zones' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, code, flag, rate, estimatedDays, active, order } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }
    if (typeof rate !== 'number' || rate < 0) {
      return NextResponse.json(
        { success: false, error: 'Rate must be a non-negative number' },
        { status: 400 }
      )
    }

    const finalCode = code?.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const existing = await db.shippingZone.findUnique({ where: { code: finalCode } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A shipping zone with this code already exists' },
        { status: 409 }
      )
    }

    const zone = await db.shippingZone.create({
      data: {
        name: name.trim(),
        code: finalCode,
        flag: flag?.trim() || '',
        rate: parseFloat(rate),
        estimatedDays: estimatedDays?.trim() || '',
        active: typeof active === 'boolean' ? active : true,
        order: typeof order === 'number' ? order : 0,
      },
    })

    return NextResponse.json({ success: true, zone }, { status: 201 })
  } catch (error: any) {
    console.error('[ShippingZones POST] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Failed to create shipping zone' },
      { status: 500 }
    )
  }
}
