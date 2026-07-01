import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, gte, lt } from 'drizzle-orm'
import { orders, girls, customers, packages } from '../db/schema'
import type { Env } from '../index'
import { getStoreId } from './auth'

const app = new Hono<{ Bindings: Env }>()

// GET /api/daily-report?storeId=xxx&date=2026-06-03
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = getStoreId(c)
  const dateStr = c.req.query('date')

  if (!storeId) return c.json({ success: false, error: 'No store access' }, 403)

  // 解析日期，默认为今天
  const targetDate = dateStr ? new Date(dateStr) : new Date()
  const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime()
  const dayEnd = dayStart + 24 * 60 * 60 * 1000

  try {
    // 获取当日所有已完成订单
    const dayOrders = await db.select()
      .from(orders)
      .where(and(
        eq(orders.storeId, storeId),
        gte(orders.createdAt, dayStart),
        lt(orders.createdAt, dayEnd)
      ))
      .all()

    // 获取所有妹妹和顾客、套餐用于关联
    const allGirls = await db.select().from(girls).where(eq(girls.storeId, storeId)).all()
    const allCustomers = await db.select().from(customers).where(eq(customers.storeId, storeId)).all()
    const allPackages = await db.select().from(packages).where(eq(packages.storeId, storeId)).all()

    // 只统计已完成的订单用于收入计算
    const completedOrders = dayOrders.filter(o => o.status === 'completed')
    // 免单订单(finalPrice=0)不计入收入和提成
    const paidOrders = completedOrders.filter(o => (o.finalPrice || 0) > 0)

    // 计算汇总数据 - 拆分"我的"、"其他客服(有提成)"和"其他人(无提成)"
    const myPaidOrders = paidOrders.filter(o => o.orderSource === 'my' || !o.orderSource)
    const otherStaffPaidOrders = paidOrders.filter(o => o.orderSource === 'otherStaff')
    const otherPaidOrders = paidOrders.filter(o => o.orderSource === 'other')

    const summary = {
      totalRevenue: paidOrders.reduce((sum, o) => sum + (o.finalPrice || 0), 0),
      totalOrders: completedOrders.length,
      totalGirlIncome: paidOrders.reduce((sum, o) => sum + (o.girlIncome || 0), 0),
      totalServiceCommission: paidOrders.reduce((sum, o) => sum + (o.serviceCommission || 0), 0),
      // 拆分统计
      myRevenue: myPaidOrders.reduce((sum, o) => sum + (o.finalPrice || 0), 0),
      myOrders: completedOrders.filter(o => o.orderSource === 'my' || !o.orderSource).length,
      myCommission: myPaidOrders.reduce((sum, o) => sum + (o.serviceCommission || 0), 0),
      otherStaffRevenue: otherStaffPaidOrders.reduce((sum, o) => sum + (o.finalPrice || 0), 0),
      otherStaffOrders: completedOrders.filter(o => o.orderSource === 'otherStaff').length,
      otherStaffCommission: otherStaffPaidOrders.reduce((sum, o) => sum + (o.serviceCommission || 0), 0),
      otherRevenue: otherPaidOrders.reduce((sum, o) => sum + (o.finalPrice || 0), 0),
      otherOrders: completedOrders.filter(o => o.orderSource === 'other').length,
    }

    // 计算每个妹妹的当日统计
    const girlStatsMap = new Map<string, {
      girlId: string
      girlName: string
      orderCount: number
      income: number
    }>()

    for (const order of completedOrders) {
      const girl = allGirls.find(g => g.id === order.girlId)
      if (!girl) continue

      const stats = girlStatsMap.get(order.girlId) || {
        girlId: order.girlId,
        girlName: girl.name,
        orderCount: 0,
        income: 0,
      }

      stats.orderCount += 1
      // 免单订单不计入妹妹收入
      if ((order.finalPrice || 0) > 0) {
        stats.income += order.girlIncome || 0
      }
      girlStatsMap.set(order.girlId, stats)
    }

    // 计算占比并排序（按单量排序）
    const totalOrders = summary.totalOrders || 1 // 避免除以0
    const girlStats = Array.from(girlStatsMap.values())
      .map(stats => ({
        ...stats,
        percentage: Math.round((stats.orderCount / totalOrders) * 100),
      }))
      .sort((a, b) => b.orderCount - a.orderCount)

    // 构建订单明细
    const ordersDetail = dayOrders.map(order => {
      const customer = allCustomers.find(c => c.id === order.customerId)
      const girl = allGirls.find(g => g.id === order.girlId)
      const pkg = allPackages.find(p => p.id === order.packageId)

      return {
        id: order.id,
        orderNo: order.orderNo,
        customerName: customer?.nickname || '未命名',
        girlName: girl?.name || '未知',
        packageName: pkg?.name || '未知套餐',
        price: order.finalPrice,
        girlIncome: order.girlIncome,
        serviceCommission: order.serviceCommission,
        status: order.status,
        createdAt: order.createdAt,
        orderSource: order.orderSource || 'my', // 'my' | 'otherStaff' | 'other'
        otherStaffName: order.otherStaffName || null,
      }
    }).sort((a, b) => b.createdAt - a.createdAt) // 按时间倒序

    return c.json({
      success: true,
      data: {
        summary,
        girlStats,
        orders: ordersDetail,
      },
    })
  } catch (err) {
    console.error('Daily report error:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

export default app
