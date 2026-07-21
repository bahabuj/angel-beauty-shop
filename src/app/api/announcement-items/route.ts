import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'

    const items = await db.announcementItem.findMany({
      where: all ? {} : { active: true },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('Announcement items GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch announcement items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const item = await db.announcementItem.create({
      data: {
        text: body.text,
        icon: body.icon || 'none',
        separator: body.separator || '✦',
        active: body.active !== false,
        order: body.order || 0,
      },
    })
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Announcement item POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create announcement item' }, { status: 500 })
  }
}
