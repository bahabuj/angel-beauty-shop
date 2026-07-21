import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [productCount, orderCount, subscriberCount, promoCount, recentOrders] = await Promise.all([
      db.product.count(),
      db.order.count(),
      db.newsletterSubscriber.count(),
      db.promoBanner.count({ where: { active: true } }),
      db.order.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
    ])
    const totalRevenue = await db.order.aggregate({ _sum: { total: true } })
    return NextResponse.json({
      success: true,
      stats: {
        productCount,
        orderCount,
        subscriberCount,
        promoCount,
        totalRevenue: totalRevenue._sum.total || 0,
        recentOrders,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 })
  }
}
