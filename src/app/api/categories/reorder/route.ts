import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orders } = body

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Orders array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Validate each item has id and order
    for (const item of orders) {
      if (!item.id || typeof item.order !== 'number') {
        return NextResponse.json(
          { success: false, error: 'Each item must have an id (string) and order (number)' },
          { status: 400 }
        )
      }
    }

    await db.$transaction(
      orders.map((item: { id: string; order: number }) =>
        db.category.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reorder categories:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reorder categories' },
      { status: 500 }
    )
  }
}
