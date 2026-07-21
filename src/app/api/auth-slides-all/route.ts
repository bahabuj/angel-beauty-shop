import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const slides = await db.authSlide.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ success: true, slides })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch auth slides' }, { status: 500 })
  }
}
