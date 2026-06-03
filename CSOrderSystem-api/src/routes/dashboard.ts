import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, gte, sql } from 'drizzle-orm'
import { orders, girls, customers, tags, customerTags } from '../db/schema'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// GET /api/dashboard?storeId=xxx
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = c.req.query('storeId')

  if (!storeId) return c.json({ success: false, error: 'Missing storeId' }, 400)

  const todayStart = new Date().setHours(0, 0, 0, 0)
  const monthStart = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0)

  // 今日统计
  const todayOrdersList = await db.select().from(orders)
    .where(and(eq(orders.storeId, storeId), gte(orders.createdAt, todayStart)))
    .all()

  const todayRevenue = todayOrdersList.reduce((sum, o) => sum + o.price, 0)
  const todayCompleted = todayOrdersList.filter(o => o.status === 'completed').length
  const todayCancelled = todayOrdersList.filter(o => o.status === 'cancelled').length

  // 本月统计
  const monthOrdersList = await db.select().from(orders)
    .where(and(eq(orders.storeId, storeId), gte(orders.createdAt, monthStart)))
    .all()

  const monthRevenue = monthOrdersList.reduce((sum, o) => sum + o.price, 0)
  const monthCompleted = monthOrdersList.filter(o => o.status === 'completed').length
  const monthCancelled = monthOrdersList.filter(o => o.status === 'cancelled').length
  const monthServiceCommission = monthOrdersList.reduce((sum, o) => sum + (o.serviceCommission || 0), 0)

  // 本月新增顾客数
  const newCustomersCount = await db.select({ count: sql<number>`COUNT(*)` })
    .from(customers)
    .where(and(eq(customers.storeId, storeId), gte(customers.createdAt, monthStart)))
    .get()

  // 总顾客数
  const totalCustomersCount = await db.select({ count: sql<number>`COUNT(*)` })
    .from(customers)
    .where(eq(customers.storeId, storeId))
    .get()

  // 妹妹排行（按收入排序）
  const girlRanking = await db.select({
    id: girls.id,
    name: girls.name,
    orderCount: sql<number>`COUNT(${orders.id})`,
    revenue: sql<number>`SUM(${orders.price})`,
    serviceCommission: sql<number>`SUM(${orders.serviceCommission})`,
  })
    .from(girls)
    .leftJoin(orders, eq(girls.id, orders.girlId))
    .where(and(eq(girls.storeId, storeId), gte(orders.createdAt, monthStart), eq(orders.status, 'completed')))
    .groupBy(girls.id)
    .orderBy(sql`SUM(${orders.price}) DESC`)
    .all()

  // 顾客排行
  const customerRanking = await db.select({
    id: customers.id,
    name: customers.nickname,
    orderCount: sql<number>`COUNT(${orders.id})`,
    revenue: sql<number>`SUM(${orders.price})`,
  })
    .from(customers)
    .leftJoin(orders, eq(customers.id, orders.customerId))
    .where(and(eq(customers.storeId, storeId), gte(orders.createdAt, monthStart), eq(orders.status, 'completed')))
    .groupBy(customers.id)
    .orderBy(sql`SUM(${orders.price}) DESC`)
    .all()

  // 高频标签统计（负面标签示例：红色标签）
  const tagStats = await db.select({
    tagId: tags.id,
    tagName: tags.name,
    tagColor: tags.color,
    count: sql<number>`COUNT(${customerTags.customerId})`,
  })
    .from(tags)
    .leftJoin(customerTags, eq(tags.id, customerTags.tagId))
    .where(eq(tags.storeId, storeId))
    .groupBy(tags.id)
    .orderBy(sql`COUNT(${customerTags.customerId}) DESC`)
    .limit(10)
    .all()

  return c.json({
    success: true,
    data: {
      // 今日统计
      todayRevenue,
      todayOrders: todayOrdersList.length,
      todayCompleted,
      todayCancelled,
      // 本月统计
      monthRevenue,
      monthOrders: monthOrdersList.length,
      monthCompleted,
      monthCancelled,
      monthServiceCommission,
      // 顾客统计
      totalCustomers: totalCustomersCount?.count || 0,
      newCustomersThisMonth: newCustomersCount?.count || 0,
      // 排行
      girlRanking: girlRanking.map(g => ({
        id: g.id,
        name: g.name,
        orderCount: g.orderCount || 0,
        revenue: g.revenue || 0,
        serviceCommission: g.serviceCommission || 0,
      })),
      customerRanking: customerRanking.map(c => ({
        id: c.id,
        name: c.name || '未命名',
        orderCount: c.orderCount || 0,
        revenue: c.revenue || 0,
      })),
      // 标签统计
      tagStats: tagStats.map(t => ({
        id: t.tagId,
        name: t.tagName,
        color: t.tagColor,
        count: t.count || 0,
      })),
    },
  })
})

export default app
