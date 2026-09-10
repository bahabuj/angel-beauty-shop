import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const videos = await db.adVideo.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ success: true, videos })
  } catch (error: any) {
    console.error('[AdVideos GET] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ad videos' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, description, videoUrl, posterImage, productSlug, duration, active, order } = body

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      )
    }
    if (!videoUrl || !videoUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'Video URL is required' },
        { status: 400 }
      )
    }

    const video = await db.adVideo.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        videoUrl: videoUrl.trim(),
        posterImage: posterImage?.trim() || null,
        productSlug: productSlug?.trim() || null,
        duration: duration?.trim() || '',
        active: typeof active === 'boolean' ? active : true,
        order: typeof order === 'number' ? order : 0,
      },
    })

    return NextResponse.json({ success: true, video }, { status: 201 })
  } catch (error: any) {
    console.error('[AdVideos POST] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Failed to create ad video' },
      { status: 500 }
    )
  }
}
