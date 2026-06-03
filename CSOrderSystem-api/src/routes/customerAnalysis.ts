import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc } from 'drizzle-orm'
import { orders, girls, customers, packages } from '../db/schema'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// GET /api/analysis/customer-detail?storeId=xxx&customerId=xxx
app.get('/customer-detail', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = c.req.query('storeId')
  const customerId = c.req.query('customerId')

  if (!storeId || !customerId) {
    return c.json({ success: false, error: 'Missing storeId or customerId' }, 400)
  }

  try {
    // 获取顾客信息
    const customer = await db.select()
      .from(customers)
      .where(and(
        eq(customers.id, customerId),
        eq(customers.storeId, storeId)
      ))
      .get()

    if (!customer) {
      return c.json({ success: false, error: 'Customer not found' }, 404)
    }

    // 获取该顾客的所有已完成订单
    const customerOrders = await db.select()
      .from(orders)
      .where(and(
        eq(orders.storeId, storeId),
        eq(orders.customerId, customerId),
        eq(orders.status, 'completed')
      ))
      .orderBy(desc(orders.createdAt))
      .all()

    // 获取所有妹妹和套餐
    const allGirls = await db.select().from(girls).where(eq(girls.storeId, storeId)).all()
    const allPackages = await db.select().from(packages).where(eq(packages.storeId, storeId)).all()

    // 统计妹妹偏好
    const girlStatsMap = new Map<string, {
      girlId: string
      girlName: string
      orderCount: number
      totalSpent: number
    }>()

    // 统计套餐偏好
    const packageStatsMap = new Map<string, {
      packageId: string
      packageName: string
      packageCode: string
      orderCount: number
      totalSpent: number
    }>()

    let totalSpent = 0

    for (const order of customerOrders) {
      totalSpent += order.price || 0

      // 统计妹妹
      const girl = allGirls.find(g => g.id === order.girlId)
      if (girl) {
        const stats = girlStatsMap.get(order.girlId) || {
          girlId: order.girlId,
          girlName: girl.name,
          orderCount: 0,
          totalSpent: 0,
        }
        stats.orderCount += 1
        stats.totalSpent += order.price || 0
        girlStatsMap.set(order.girlId, stats)
      }

      // 统计套餐
      const pkg = allPackages.find(p => p.id === order.packageId)
      if (pkg) {
        const stats = packageStatsMap.get(order.packageId) || {
          packageId: order.packageId,
          packageName: pkg.name,
          packageCode: pkg.code,
          orderCount: 0,
          totalSpent: 0,
        }
        stats.orderCount += 1
        stats.totalSpent += order.price || 0
        packageStatsMap.set(order.packageId, stats)
      }
    }

    // 转换为数组并排序（按次数降序）
    const girlStats = Array.from(girlStatsMap.values())
      .sort((a, b) => b.orderCount - a.orderCount)

    const packageStats = Array.from(packageStatsMap.values())
      .sort((a, b) => b.orderCount - a.orderCount)

    return c.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          name: customer.nickname || customer.name || '未命名',
          totalOrders: customerOrders.length,
          totalSpent,
        },
        girlStats,
        packageStats,
        recentOrders: customerOrders.slice(0, 10).map(order => ({
          id: order.id,
          orderNo: order.orderNo,
          girlName: allGirls.find(g => g.id === order.girlId)?.name || '未知',
          packageName: allPackages.find(p => p.id === order.packageId)?.name || '未知',
          price: order.price,
          createdAt: order.createdAt,
        })),
      },
    })
  } catch (err) {
    console.error('Customer analysis error:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

export default app
