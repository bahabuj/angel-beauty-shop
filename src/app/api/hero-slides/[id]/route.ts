import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const slide = await db.heroSlide.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
        ...(body.mediaUrl !== undefined && { mediaUrl: body.mediaUrl }),
        ...(body.mediaType !== undefined && { mediaType: body.mediaType }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.overlayDark !== undefined && { overlayDark: body.overlayDark }),
        ...(body.kenBurns !== undefined && { kenBurns: body.kenBurns }),
      },
    })
    return NextResponse.json({ success: true, slide })
  } catch (error) {
    console.error('Hero slide PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update hero slide' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.heroSlide.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Hero slide DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete hero slide' }, { status: 500 })
  }
}
