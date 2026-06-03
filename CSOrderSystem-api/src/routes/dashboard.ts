import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, gte, sql } from 'drizzle-orm'
import { orders, girls, customers } from '../db/schema'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// GET /api/dashboard?storeId=xxx
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = c.req.query('storeId')

  if (!storeId) return c.json({ success: false, error: 'Missing storeId' }, 400)

  const now = Date.now()
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const monthStart = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0)

  // 今日统计
  const todayOrdersList = await db.select().from(orders)
    .where(and(eq(orders.storeId, storeId), gte(orders.createdAt, todayStart)))
    .all()

  const todayRevenue = todayOrdersList.reduce((sum, o) => sum + o.price, 0)

  // 本月统计
  const monthOrdersList = await db.select().from(orders)
    .where(and(eq(orders.storeId, storeId), gte(orders.createdAt, monthStart)))
    .all()

  const monthRevenue = monthOrdersList.reduce((sum, o) => sum + o.price, 0)

  // 妹妹排行（简化版）
  const girlRanking = await db.select({
    id: girls.id,
    name: girls.name,
    orderCount: sql<number>`COUNT(${orders.id})`,
    revenue: sql<number>`SUM(${orders.price})`,
  })
    .from(girls)
    .leftJoin(orders, eq(girls.id, orders.girlId))
    .where(and(eq(girls.storeId, storeId), gte(orders.createdAt, monthStart)))
    .groupBy(girls.id)
    .orderBy(sql`COUNT(${orders.id}) DESC`)
    .all()

  // 顾客排行（简化版）
  const customerRanking = await db.select({
    id: customers.id,
    name: customers.nickname,
    orderCount: sql<number>`COUNT(${orders.id})`,
    revenue: sql<number>`SUM(${orders.price})`,
  })
    .from(customers)
    .leftJoin(orders, eq(customers.id, orders.customerId))
    .where(and(eq(customers.storeId, storeId), gte(orders.createdAt, monthStart)))
    .groupBy(customers.id)
    .orderBy(sql`SUM(${orders.price}) DESC`)
    .all()

  return c.json({
    success: true,
    data: {
      todayRevenue,
      todayOrders: todayOrdersList.length,
      monthRevenue,
      monthOrders: monthOrdersList.length,
      girlRanking: girlRanking.map(g => ({
        id: g.id,
        name: g.name,
        orderCount: g.orderCount || 0,
        revenue: g.revenue || 0,
      })),
      customerRanking: customerRanking.map(c => ({
        id: c.id,
        name: c.name || '未命名',
        orderCount: c.orderCount || 0,
        revenue: c.revenue || 0,
      })),
    },
  })
})

export default app
