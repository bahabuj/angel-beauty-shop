import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'

    const partners = await db.partner.findMany({
      where: all ? {} : { active: true },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ success: true, partners })
  } catch (error) {
    console.error('Partners GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch partners' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const partner = await db.partner.create({
      data: {
        name: body.name,
        logo: body.logo,
        url: body.url || null,
        active: body.active !== false,
        order: body.order || 0,
      },
    })
    return NextResponse.json({ success: true, partner })
  } catch (error) {
    console.error('Partner POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create partner' }, { status: 500 })
  }
}
