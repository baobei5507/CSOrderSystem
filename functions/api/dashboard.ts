import type { PagesFunction } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, gte, lt, sql } from 'drizzle-orm'
import { orders, girls, customers, orderSnapshots } from '../../db/schema'
import { corsHeaders, successResponse, errorResponse } from './utils'

export interface Env {
  DB: D1Database
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const db = drizzle(env.DB)

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const url = new URL(request.url)
    const storeId = url.searchParams.get('storeId')
    if (!storeId) return errorResponse('Missing storeId')

    const now = Date.now()
    const todayStart = new Date().setHours(0, 0, 0, 0)
    const monthStart = new Date().setDate(1)
    monthStart && new Date(monthStart).setHours(0, 0, 0, 0)

    // 今日统计
    const todayOrders = await db.select().from(orders)
      .where(and(eq(orders.storeId, storeId), gte(orders.createdAt, todayStart)))
      .all()

    const todayStats = {
      orders: todayOrders.length,
      amount: todayOrders.reduce((sum, o) => sum + o.price, 0),
      serviceCommission: todayOrders.reduce((sum, o) => sum + o.serviceCommission, 0),
      girlIncome: todayOrders.reduce((sum, o) => sum + o.girlIncome, 0),
    }

    // 本月统计
    const monthOrders = await db.select().from(orders)
      .where(and(eq(orders.storeId, storeId), gte(orders.createdAt, monthStart)))
      .all()

    const monthStats = {
      orders: monthOrders.length,
      amount: monthOrders.reduce((sum, o) => sum + o.price, 0),
      serviceCommission: monthOrders.reduce((sum, o) => sum + o.serviceCommission, 0),
      girlIncome: monthOrders.reduce((sum, o) => sum + o.girlIncome, 0),
    }

    // 妹妹排行（基于订单快照）- 只统计已完成订单
    const girlRankings = await db.all(sql`
      SELECT 
        os.girl_name_snapshot as name,
        COUNT(*) as orderCount,
        SUM(o.price) as revenue,
        SUM(o.girl_income) as serviceCommission
      FROM order_snapshots os
      JOIN orders o ON os.order_id = o.id
      WHERE o.store_id = ${storeId}
      AND o.created_at >= ${monthStart}
      AND o.status = 'completed'
      GROUP BY os.girl_name_snapshot
      ORDER BY orderCount DESC
      LIMIT 10
    `)

    // 顾客排行
    const customerRankings = await db.all(sql`
      SELECT 
        os.customer_name_snapshot as nickname,
        COUNT(*) as orderCount,
        SUM(o.price) as totalAmount
      FROM order_snapshots os
      JOIN orders o ON os.order_id = o.id
      WHERE o.store_id = ${storeId}
      AND o.created_at >= ${monthStart}
      GROUP BY os.customer_name_snapshot
      ORDER BY totalAmount DESC
      LIMIT 10
    `)

    // 总顾客数
    const totalCustomers = await db.select({ count: sql`COUNT(*)` }).from(customers)
      .where(eq(customers.storeId, storeId))
      .get()

    // 本月新增顾客数
    const newCustomers = await db.select({ count: sql`COUNT(*)` }).from(customers)
      .where(and(eq(customers.storeId, storeId), gte(customers.createdAt, monthStart)))
      .get()

    // 在职妹妹数
    const activeGirls = await db.select({ count: sql`COUNT(*)` }).from(girls)
      .where(and(eq(girls.storeId, storeId), eq(girls.status, 'active')))
      .get()

    return successResponse({
      todayRevenue: todayStats.amount,
      todayOrders: todayStats.orders,
      todayCompleted: todayOrders.filter(o => o.status === 'completed').length,
      todayCancelled: todayOrders.filter(o => o.status === 'cancelled').length,
      monthRevenue: monthStats.amount,
      monthOrders: monthStats.orders,
      monthCompleted: monthOrders.filter(o => o.status === 'completed').length,
      monthCancelled: monthOrders.filter(o => o.status === 'cancelled').length,
      monthServiceCommission: monthStats.serviceCommission,
      totalCustomers: totalCustomers?.count || 0,
      newCustomersThisMonth: newCustomers?.count || 0,
      girlRanking: (girlRankings || []).map((g: any) => ({
        id: g.name, // 用 name 作为 id
        name: g.name,
        orderCount: g.orderCount,
        revenue: g.revenue,
        serviceCommission: g.serviceCommission,
      })),
      customerRanking: (customerRankings || []).map((c: any) => ({
        id: c.nickname,
        name: c.nickname,
        orderCount: c.orderCount,
        revenue: c.totalAmount,
      })),
    })
  } catch (error: any) {
    console.error('Dashboard API Error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}