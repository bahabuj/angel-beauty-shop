import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const slides = await db.authSlide.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ success: true, slides })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch auth slides' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const slide = await db.authSlide.create({ data })
    return NextResponse.json({ success: true, slide })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create auth slide' }, { status: 500 })
  }
}
