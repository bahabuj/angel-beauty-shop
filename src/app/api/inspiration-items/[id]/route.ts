import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const item = await db.inspirationItem.update({ where: { id }, data: body })
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Inspiration item PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update inspiration item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.inspirationItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Inspiration item DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete inspiration item' }, { status: 500 })
  }
}
