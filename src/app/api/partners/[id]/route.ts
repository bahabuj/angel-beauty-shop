import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const partner = await db.partner.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.logo !== undefined && { logo: body.logo }),
        ...(body.url !== undefined && { url: body.url }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.order !== undefined && { order: body.order }),
      },
    })
    return NextResponse.json({ success: true, partner })
  } catch (error) {
    console.error('Partner PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update partner' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.partner.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Partner DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete partner' }, { status: 500 })
  }
}
