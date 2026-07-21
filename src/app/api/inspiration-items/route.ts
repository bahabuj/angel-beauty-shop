import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'
    const items = await db.inspirationItem.findMany({
      where: all ? {} : { active: true },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('Inspiration items GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch inspiration items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const item = await db.inspirationItem.create({
      data: {
        label: body.label || '',
        tip: body.tip || '',
        image: body.image || '',
        icon: body.icon || 'Sparkles',
        color: body.color || 'from-gold/80',
        active: body.active !== false,
        order: body.order || 0,
      },
    })
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Inspiration item POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create inspiration item' }, { status: 500 })
  }
}
