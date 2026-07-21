import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'

    const slides = await db.heroSlide.findMany({
      where: all ? {} : { active: true },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ success: true, slides })
  } catch (error) {
    console.error('Hero slides GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch hero slides' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const slide = await db.heroSlide.create({
      data: {
        title: body.title || '',
        subtitle: body.subtitle || null,
        mediaUrl: body.mediaUrl,
        mediaType: body.mediaType || 'image',
        active: body.active !== false,
        order: body.order || 0,
        overlayDark: body.overlayDark ?? 0.5,
        kenBurns: body.kenBurns !== false,
      },
    })
    return NextResponse.json({ success: true, slide })
  } catch (error) {
    console.error('Hero slide POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create hero slide' }, { status: 500 })
  }
}
