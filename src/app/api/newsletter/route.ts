import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const subscribers = await db.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, subscribers })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch subscribers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 })
    const existing = await db.newsletterSubscriber.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ success: false, error: 'Already subscribed' }, { status: 400 })
    const subscriber = await db.newsletterSubscriber.create({ data: { email } })
    return NextResponse.json({ success: true, subscriber })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Subscription failed' }, { status: 500 })
  }
}
