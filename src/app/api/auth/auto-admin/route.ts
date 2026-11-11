import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { encode } from 'next-auth/jwt'

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || ''
const AUTO_ADMIN_TOKEN = process.env.AUTO_ADMIN_TOKEN || ''

export async function POST(req: Request) {
  try {
    if (!AUTO_ADMIN_TOKEN) {
      return NextResponse.json({ success: false, error: 'Auto-admin not configured. Set AUTO_ADMIN_TOKEN env var.' }, { status: 403 })
    }
    const authToken = req.headers.get('x-admin-token') || new URL(req.url).searchParams.get('token')
    if (authToken !== AUTO_ADMIN_TOKEN) {
      return NextResponse.json({ success: false, error: 'Invalid admin token' }, { status: 403 })
    }
    const admin = await db.user.findFirst({ where: { role: 'admin' }, select: { id: true, email: true, name: true, role: true, phone: true, image: true, avatar: true } })
    if (!admin) return NextResponse.json({ success: false, error: 'No admin user found' }, { status: 404 })
    const token = await encode({ token: { name: admin.name, email: admin.email, picture: admin.image || admin.avatar || null, sub: admin.id, id: admin.id, role: admin.role, phone: admin.phone }, secret: NEXTAUTH_SECRET, maxAge: 30 * 24 * 60 * 60 })
    const response = NextResponse.json({ success: true, user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role, phone: admin.phone, image: admin.image || admin.avatar } })
    response.cookies.set('next-auth.session-token', token, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60 })
    return response
  } catch (error) {
    console.error('Auto-admin error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
