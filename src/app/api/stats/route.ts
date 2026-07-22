import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [
      productCount, productCountLastMonth,
      orderCount, orderCountLastMonth,
      subscriberCount, subscriberCountLastMonth,
      promoCount, recentOrders,
      totalRevenueAgg, revenueThisMonthAgg, revenueLastMonthAgg,
      revenueByMonthRaw,
    ] = await Promise.all([
      db.product.count(),
      db.product.count({ where: { createdAt: { lt: startOfThisMonth } } }),
      db.order.count(),
      db.order.count({ where: { createdAt: { lt: startOfThisMonth } } }),
      db.newsletterSubscriber.count(),
      db.newsletterSubscriber.count({ where: { createdAt: { lt: startOfThisMonth } } }),
      db.promoBanner.count({ where: { active: true } }),
      db.order.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, customerName: true, total: true, status: true, createdAt: true } }),
      db.order.aggregate({ _sum: { total: true } }),
      db.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: startOfThisMonth } } }),
      db.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
      db.order.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { total: true, createdAt: true } }),
    ])

    function momChange(current: number, previous: number): number | null {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    const productMom = momChange(productCount - productCountLastMonth, productCountLastMonth)
    const orderMom = momChange(orderCount - orderCountLastMonth, orderCountLastMonth)
    const subscriberMom = momChange(subscriberCount - subscriberCountLastMonth, subscriberCountLastMonth)
    const revenueThisMonth = revenueThisMonthAgg._sum.total || 0
    const revenueLastMonth = revenueLastMonthAgg._sum.total || 0
    const revenueMom = momChange(revenueThisMonth, revenueLastMonth)

    const monthMap = new Map<string, number>()
    const monthLabels: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, 0)
      monthLabels.push(d.toLocaleDateString('en-US', { month: 'short' }))
    }
    for (const order of revenueByMonthRaw) {
      const d = order.createdAt
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) || 0) + (order.total || 0))
    }
    const revenueByMonth = Array.from(monthMap.entries()).map(([key, revenue], idx) => ({ month: monthLabels[idx], revenue: Math.round(revenue * 100) / 100 }))

    return NextResponse.json({
      success: true,
      stats: {
        productCount, orderCount, subscriberCount, promoCount,
        totalRevenue: totalRevenueAgg._sum.total || 0,
        recentOrders, revenueByMonth,
        changes: { products: productMom, orders: orderMom, revenue: revenueMom, subscribers: subscriberMom },
      },
    })
  } catch (error) {
    console.error('[stats] Failed:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 })
  }
}
