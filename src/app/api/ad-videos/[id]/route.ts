import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const video = await db.adVideo.findUnique({ where: { id } })
    if (!video) {
      return NextResponse.json({ success: false, error: 'Ad video not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, video })
  } catch (error: any) {
    console.error('[AdVideo GET] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: 'Failed to fetch ad video' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const data: any = {}
    if (typeof body.title === 'string') data.title = body.title.trim()
    if (typeof body.description === 'string') data.description = body.description.trim() || null
    if (typeof body.videoUrl === 'string') data.videoUrl = body.videoUrl.trim()
    if (typeof body.posterImage === 'string') data.posterImage = body.posterImage.trim() || null
    if (typeof body.productSlug === 'string') data.productSlug = body.productSlug.trim() || null
    if (typeof body.duration === 'string') data.duration = body.duration.trim()
    if (typeof body.active === 'boolean') data.active = body.active
    if (typeof body.order === 'number') data.order = body.order

    const video = await db.adVideo.update({ where: { id }, data })
    return NextResponse.json({ success: true, video })
  } catch (error: any) {
    console.error('[AdVideo PUT] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: 'Failed to update ad video' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.adVideo.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[AdVideo DELETE] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: 'Failed to delete ad video' }, { status: 500 })
  }
}
