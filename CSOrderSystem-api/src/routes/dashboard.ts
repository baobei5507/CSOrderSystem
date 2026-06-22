import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, gte, sql } from 'drizzle-orm'
import { orders, girls, customers, tags, customerTags } from '../db/schema'
import type { Env } from '../index'
import { getStoreId } from './auth'

const app = new Hono<{ Bindings: Env }>()

// GET /api/dashboard?storeId=xxx
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = getStoreId(c)

  if (!storeId) return c.json({ success: false, error: 'No store access' }, 403)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  try {
    // 今日统计
    const todayOrdersList = await db.select().from(orders)
      .where(and(eq(orders.storeId, storeId), gte(orders.createdAt, todayStart)))
      .all()

    const todayCompletedList = todayOrdersList.filter(o => o.status === 'completed')
    // 免单订单(finalPrice=0)不计入收入
    const todayPaidList = todayCompletedList.filter(o => (o.finalPrice || 0) > 0)
    const todayRevenue = todayPaidList.reduce((sum, o) => sum + (o.finalPrice || 0), 0)
    const todayCompleted = todayCompletedList.length
    const todayCancelled = todayOrdersList.filter(o => o.status === 'cancelled').length

    // 本月统计
    const monthOrdersList = await db.select().from(orders)
      .where(and(eq(orders.storeId, storeId), gte(orders.createdAt, monthStart)))
      .all()

    const monthCompletedList = monthOrdersList.filter(o => o.status === 'completed')
    // 免单订单(finalPrice=0)不计入收入
    const monthPaidList = monthCompletedList.filter(o => (o.finalPrice || 0) > 0)
    const monthRevenue = monthPaidList.reduce((sum, o) => sum + (o.finalPrice || 0), 0)
    const monthCompleted = monthCompletedList.length
    const monthCancelled = monthOrdersList.filter(o => o.status === 'cancelled').length
    const monthServiceCommission = monthPaidList.reduce((sum, o) => sum + (o.serviceCommission || 0), 0)

    // 本月新增顾客数
    const newCustomersResult = await db.select({ count: sql<number>`COUNT(*)` })
      .from(customers)
      .where(and(eq(customers.storeId, storeId), gte(customers.createdAt, monthStart)))
      .get()

    // 总顾客数
    const totalCustomersResult = await db.select({ count: sql<number>`COUNT(*)` })
      .from(customers)
      .where(eq(customers.storeId, storeId))
      .get()

    // 妹妹排行（按收入排序）- 修复：使用子查询而不是复杂的left join条件
    const allGirls = await db.select().from(girls).where(eq(girls.storeId, storeId)).all()
    const girlRanking = []
    for (const girl of allGirls) {
      const girlOrders = await db.select()
        .from(orders)
        .where(and(
          eq(orders.girlId, girl.id),
          eq(orders.status, 'completed'),
          gte(orders.createdAt, monthStart)
        ))
        .all()
      
      // 排除免单订单
      const paidOrders = girlOrders.filter(o => (o.finalPrice || 0) > 0)
      const revenue = paidOrders.reduce((sum, o) => sum + (o.finalPrice || 0), 0)
      const girlIncome = paidOrders.reduce((sum, o) => sum + (o.girlIncome || 0), 0)
      
      if (girlOrders.length > 0) {
        girlRanking.push({
          id: girl.id,
          name: girl.name,
          orderCount: girlOrders.length,
          revenue,
          girlIncome,
        })
      }
    }
    girlRanking.sort((a, b) => b.revenue - a.revenue)

    // 顾客排行
    const allCustomers = await db.select().from(customers).where(eq(customers.storeId, storeId)).all()
    const customerRanking = []
    for (const customer of allCustomers) {
      const customerOrders = await db.select()
        .from(orders)
        .where(and(
          eq(orders.customerId, customer.id),
          eq(orders.status, 'completed'),
          gte(orders.createdAt, monthStart)
        ))
        .all()
      
      // 排除免单订单
      const paidOrders = customerOrders.filter(o => (o.finalPrice || 0) > 0)
      const revenue = paidOrders.reduce((sum, o) => sum + (o.finalPrice || 0), 0)
      
      if (customerOrders.length > 0) {
        customerRanking.push({
          id: customer.id,
          name: customer.nickname || '未命名',
          orderCount: customerOrders.length,
          revenue,
        })
      }
    }
    customerRanking.sort((a, b) => b.revenue - a.revenue)

    // 高频标签统计
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
        totalCustomers: totalCustomersResult?.count || 0,
        newCustomersThisMonth: newCustomersResult?.count || 0,
        // 排行
        girlRanking: girlRanking.slice(0, 10),
        customerRanking: customerRanking.slice(0, 10),
        // 标签统计
        tagStats: tagStats.map(t => ({
          id: t.tagId,
          name: t.tagName,
          color: t.tagColor,
          count: t.count || 0,
        })),
      },
    })
  } catch (err) {
    console.error('Dashboard error:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

export default app
