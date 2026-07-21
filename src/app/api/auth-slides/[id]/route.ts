import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const slide = await db.authSlide.findUnique({ where: { id } })
    if (!slide) return NextResponse.json({ success: false, error: 'Slide not found' }, { status: 404 })
    return NextResponse.json({ success: true, slide })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch slide' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await req.json()
    const slide = await db.authSlide.update({ where: { id }, data })
    return NextResponse.json({ success: true, slide })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update slide' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.authSlide.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete slide' }, { status: 500 })
  }
}
