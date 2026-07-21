import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const item = await db.announcementItem.update({
      where: { id },
      data: {
        ...(body.text !== undefined && { text: body.text }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.separator !== undefined && { separator: body.separator }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.order !== undefined && { order: body.order }),
      },
    })
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Announcement item PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update announcement item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.announcementItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Announcement item DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete announcement item' }, { status: 500 })
  }
}
