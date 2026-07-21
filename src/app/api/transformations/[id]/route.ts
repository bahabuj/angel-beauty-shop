import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const item = await db.transformation.update({ where: { id }, data: body })
    return NextResponse.json({ success: true, transformation: item })
  } catch (error) {
    console.error('Transformation PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update transformation' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.transformation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Transformation DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete transformation' }, { status: 500 })
  }
}
