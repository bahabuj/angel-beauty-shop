import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const promos = await db.promoBanner.findMany({ orderBy: { order: 'asc' } })
    return NextResponse.json({ success: true, promos })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch promos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const promo = await db.promoBanner.create({ data })
    return NextResponse.json({ success: true, promo })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create promo' }, { status: 500 })
  }
}
