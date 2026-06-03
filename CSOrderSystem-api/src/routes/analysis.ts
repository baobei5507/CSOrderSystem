import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, gte, sql } from 'drizzle-orm'
import { orders, girls, customers, packages, tags, customerTags } from '../db/schema'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// GET /api/analysis/customer-preferences?storeId=xxx&range=month|3months|6months|all
app.get('/customer-preferences', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = c.req.query('storeId')
  const range = c.req.query('range') || 'month'

  if (!storeId) return c.json({ success: false, error: 'Missing storeId' }, 400)

  const now = new Date()
  let startTime: number

  switch (range) {
    case 'month':
      startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      break
    case '3months':
      startTime = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime()
      break
    case '6months':
      startTime = new Date(now.getFullYear(), now.getMonth() - 5, 1).getTime()
      break
    case 'all':
    default:
      startTime = 0
      break
  }

  // 沉睡顾客判定时间（30天前）
  const inactiveThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime()

  try {
    // 获取该时间范围内的所有已完成订单
    const ordersList = await db.select()
      .from(orders)
      .where(and(
        eq(orders.storeId, storeId),
        eq(orders.status, 'completed'),
        gte(orders.createdAt, startTime)
      ))
      .all()

    // 获取所有顾客
    const customersList = await db.select()
      .from(customers)
      .where(eq(customers.storeId, storeId))
      .all()

    // 获取所有妹妹
    const girlsList = await db.select()
      .from(girls)
      .where(eq(girls.storeId, storeId))
      .all()

    // 获取所有套餐
    const packagesList = await db.select()
      .from(packages)
      .where(eq(packages.storeId, storeId))
      .all()

    // 获取所有标签和顾客标签关联
    const tagsList = await db.select()
      .from(tags)
      .where(eq(tags.storeId, storeId))
      .all()

    const customerTagsList = await db.select()
      .from(customerTags)
      .all()

    // 构建顾客ID到标签的映射
    const customerTagMap = new Map<string, typeof tagsList>()
    for (const ct of customerTagsList) {
      const tag = tagsList.find(t => t.id === ct.tagId)
      if (tag) {
        if (!customerTagMap.has(ct.customerId)) {
          customerTagMap.set(ct.customerId, [])
        }
        customerTagMap.get(ct.customerId)!.push(tag)
      }
    }

    // 1. 顾客消费排行榜（含偏好分析）
    const customerStats = new Map<string, {
      customerId: string
      customerName: string
      totalSpent: number
      orderCount: number
      lastOrderDate: number
      girlCounts: Map<string, { id: string; name: string; count: number }>
      packageCounts: Map<string, { id: string; name: string; code: string; count: number }>
    }>()

    for (const order of ordersList) {
      const customer = customersList.find(c => c.id === order.customerId)
      if (!customer) continue

      const stats = customerStats.get(order.customerId) || {
        customerId: order.customerId,
        customerName: customer.nickname || customer.name || '未命名',
        totalSpent: 0,
        orderCount: 0,
        lastOrderDate: 0,
        girlCounts: new Map(),
        packageCounts: new Map(),
      }

      stats.totalSpent += order.price || 0
      stats.orderCount += 1
      if (order.createdAt > stats.lastOrderDate) {
        stats.lastOrderDate = order.createdAt
      }

      // 统计偏好的妹妹
      const girl = girlsList.find(g => g.id === order.girlId)
      if (girl) {
        const girlStat = stats.girlCounts.get(order.girlId) || { id: order.girlId, name: girl.name, count: 0 }
        girlStat.count += 1
        stats.girlCounts.set(order.girlId, girlStat)
      }

      // 统计偏好的套餐
      const pkg = packagesList.find(p => p.id === order.packageId)
      if (pkg) {
        const pkgStat = stats.packageCounts.get(order.packageId) || { id: order.packageId, name: pkg.name, code: pkg.code, count: 0 }
        pkgStat.count += 1
        stats.packageCounts.set(order.packageId, pkgStat)
      }

      customerStats.set(order.customerId, stats)
    }

    const customerRankings = Array.from(customerStats.values())
      .map(stats => {
        // 找出最喜欢的妹妹
        let favoriteGirl = { id: '', name: '', count: 0 }
        for (const [_, girl] of stats.girlCounts) {
          if (girl.count > favoriteGirl.count) {
            favoriteGirl = girl
          }
        }

        // 找出最喜欢的套餐
        let favoritePackage = { id: '', name: '', code: '', count: 0 }
        for (const [_, pkg] of stats.packageCounts) {
          if (pkg.count > favoritePackage.count) {
            favoritePackage = pkg
          }
        }

        const customerTags = customerTagMap.get(stats.customerId) || []

        return {
          customerId: stats.customerId,
          customerName: stats.customerName,
          totalSpent: stats.totalSpent,
          orderCount: stats.orderCount,
          avgOrderValue: stats.orderCount > 0 ? Math.round(stats.totalSpent / stats.orderCount) : 0,
          lastOrderDate: stats.lastOrderDate,
          favoriteGirlId: favoriteGirl.id || undefined,
          favoriteGirlName: favoriteGirl.name || undefined,
          favoritePackageId: favoritePackage.id || undefined,
          favoritePackageName: favoritePackage.name || undefined,
          tags: customerTags.map(t => ({ id: t.id, name: t.name, color: t.color || '#ccc' })),
        }
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)

    // 2. 妹妹人气排行
    const girlStats = new Map<string, {
      girlId: string
      girlName: string
      orderCount: number
      totalRevenue: number
      uniqueCustomers: Set<string>
    }>()

    for (const order of ordersList) {
      const girl = girlsList.find(g => g.id === order.girlId)
      if (!girl) continue

      const stats = girlStats.get(order.girlId) || {
        girlId: order.girlId,
        girlName: girl.name,
        orderCount: 0,
        totalRevenue: 0,
        uniqueCustomers: new Set(),
      }

      stats.orderCount += 1
      stats.totalRevenue += order.price || 0
      stats.uniqueCustomers.add(order.customerId)
      girlStats.set(order.girlId, stats)
    }

    const girlPreferences = Array.from(girlStats.values())
      .map(stats => ({
        girlId: stats.girlId,
        girlName: stats.girlName,
        orderCount: stats.orderCount,
        totalRevenue: stats.totalRevenue,
        uniqueCustomers: stats.uniqueCustomers.size,
      }))
      .sort((a, b) => b.orderCount - a.orderCount)

    // 3. 套餐偏好排行
    const packageStats = new Map<string, {
      packageId: string
      packageName: string
      packageCode: string
      orderCount: number
      totalRevenue: number
    }>()

    for (const order of ordersList) {
      const pkg = packagesList.find(p => p.id === order.packageId)
      if (!pkg) continue

      const stats = packageStats.get(order.packageId) || {
        packageId: order.packageId,
        packageName: pkg.name,
        packageCode: pkg.code,
        orderCount: 0,
        totalRevenue: 0,
      }

      stats.orderCount += 1
      stats.totalRevenue += order.price || 0
      packageStats.set(order.packageId, stats)
    }

    const packagePreferences = Array.from(packageStats.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)

    // 4. 标签群体分析
    const tagStats = new Map<string, {
      tagId: string
      tagName: string
      tagColor: string
      customers: Set<string>
      totalSpent: number
      orderCount: number
    }>()

    // 先统计每个标签的顾客集合
    for (const ct of customerTagsList) {
      const tag = tagsList.find(t => t.id === ct.tagId)
      if (!tag) continue

      const stats = tagStats.get(ct.tagId) || {
        tagId: ct.tagId,
        tagName: tag.name,
        tagColor: tag.color || '#ccc',
        customers: new Set(),
        totalSpent: 0,
        orderCount: 0,
      }

      stats.customers.add(ct.customerId)
      tagStats.set(ct.tagId, stats)
    }

    // 再统计每个标签的消费数据
    for (const order of ordersList) {
      const customerTagIds = customerTagsList
        .filter(ct => ct.customerId === order.customerId)
        .map(ct => ct.tagId)

      for (const tagId of customerTagIds) {
        const stats = tagStats.get(tagId)
        if (stats) {
          stats.totalSpent += order.price || 0
          stats.orderCount += 1
        }
      }
    }

    const tagAnalysis = Array.from(tagStats.values())
      .map(stats => ({
        tagId: stats.tagId,
        tagName: stats.tagName,
        tagColor: stats.tagColor,
        customerCount: stats.customers.size,
        totalSpent: stats.totalSpent,
        avgOrderValue: stats.orderCount > 0 ? Math.round(stats.totalSpent / stats.orderCount) : 0,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)

    // 5. 沉睡顾客分析（30天未消费）
    const activeCustomerIds = new Set(ordersList.map(o => o.customerId))
    
    // 获取所有历史订单来确定最后消费时间
    const allOrders = await db.select()
      .from(orders)
      .where(and(
        eq(orders.storeId, storeId),
        eq(orders.status, 'completed')
      ))
      .all()

    const lastOrderMap = new Map<string, { date: number; totalSpent: number; orderCount: number }>()
    for (const order of allOrders) {
      const existing = lastOrderMap.get(order.customerId)
      if (!existing || order.createdAt > existing.date) {
        lastOrderMap.set(order.customerId, {
          date: order.createdAt,
          totalSpent: (existing?.totalSpent || 0) + (order.price || 0),
          orderCount: (existing?.orderCount || 0) + 1,
        })
      } else {
        lastOrderMap.set(order.customerId, {
          date: existing.date,
          totalSpent: existing.totalSpent + (order.price || 0),
          orderCount: existing.orderCount + 1,
        })
      }
    }

    const inactiveCustomers: {
      customerId: string
      customerName: string
      lastOrderDate: number
      daysSinceLastOrder: number
      totalSpent: number
      orderCount: number
    }[] = []

    for (const customer of customersList) {
      const lastOrder = lastOrderMap.get(customer.id)
      if (lastOrder && lastOrder.date < inactiveThreshold) {
        const daysSinceLastOrder = Math.floor((now.getTime() - lastOrder.date) / (24 * 60 * 60 * 1000))
        inactiveCustomers.push({
          customerId: customer.id,
          customerName: customer.nickname || customer.name || '未命名',
          lastOrderDate: lastOrder.date,
          daysSinceLastOrder,
          totalSpent: lastOrder.totalSpent,
          orderCount: lastOrder.orderCount,
        })
      }
    }

    inactiveCustomers.sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder)

    return c.json({
      success: true,
      data: {
        customerRankings,
        girlPreferences,
        packagePreferences,
        tagAnalysis,
        inactiveCustomers,
      },
    })
  } catch (err) {
    console.error('Analysis error:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

export default app
