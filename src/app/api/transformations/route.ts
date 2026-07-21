import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'
    const items = await db.transformation.findMany({
      where: all ? {} : { active: true },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ success: true, transformations: items })
  } catch (error) {
    console.error('Transformations GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch transformations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const item = await db.transformation.create({
      data: {
        name: body.name || '',
        duration: body.duration || '',
        result: body.result || '',
        beforeImg: body.beforeImg || '',
        afterImg: body.afterImg || '',
        active: body.active !== false,
        order: body.order || 0,
      },
    })
    return NextResponse.json({ success: true, transformation: item })
  } catch (error) {
    console.error('Transformation POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create transformation' }, { status: 500 })
  }
}
