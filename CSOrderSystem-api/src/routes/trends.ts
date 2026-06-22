import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, gte } from 'drizzle-orm'
import { orders, girls } from '../db/schema'
import type { Env } from '../index'
import { getStoreId } from './auth'

const app = new Hono<{ Bindings: Env }>()

// GET /api/trends/girl-trends?storeId=xxx&range=month|3months|6months|year
app.get('/girl-trends', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = getStoreId(c)
  const range = c.req.query('range') || '6months'

  if (!storeId) return c.json({ success: false, error: 'No store access' }, 403)

  const now = new Date()
  let startTime: number
  let groupBy: 'day' | 'week' | 'month'

  switch (range) {
    case 'month':
      startTime = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).getTime()
      groupBy = 'day'
      break
    case '3months':
      startTime = new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime()
      groupBy = 'week'
      break
    case '6months':
      startTime = new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime()
      groupBy = 'month'
      break
    case 'year':
      startTime = new Date(now.getFullYear() - 1, now.getMonth(), 1).getTime()
      groupBy = 'month'
      break
    default:
      startTime = new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime()
      groupBy = 'month'
  }

  try {
    // 获取所有订单
    const ordersList = await db.select()
      .from(orders)
      .where(and(
        eq(orders.storeId, storeId),
        eq(orders.status, 'completed'),
        gte(orders.createdAt, startTime)
      ))
      .all()

    // 获取所有妹妹
    const girlsList = await db.select()
      .from(girls)
      .where(eq(girls.storeId, storeId))
      .all()

    // 按时间分组统计
    const timePoints = new Map<string, Map<string, { orderCount: number; income: number }>>()

    for (const order of ordersList) {
      const date = new Date(order.createdAt)
      let timeKey: string

      if (groupBy === 'day') {
        timeKey = date.toISOString().split('T')[0]
      } else if (groupBy === 'week') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        timeKey = weekStart.toISOString().split('T')[0]
      } else {
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }

      if (!timePoints.has(timeKey)) {
        timePoints.set(timeKey, new Map())
      }

      const girlTimeMap = timePoints.get(timeKey)!
      const girlStats = girlTimeMap.get(order.girlId) || { orderCount: 0, income: 0 }
      girlStats.orderCount += 1
      girlStats.income += order.girlIncome || 0
      girlTimeMap.set(order.girlId, girlStats)
    }

    // 生成趋势数据
    const trendData: {
      date: string
      label: string
      [key: string]: number | string
    }[] = []

    // 生成时间序列
    const sortedTimeKeys = Array.from(timePoints.keys()).sort()
    
    for (const timeKey of sortedTimeKeys) {
      const point: any = { date: timeKey }
      
      // 格式化标签
      if (groupBy === 'day') {
        const [year, month, day] = timeKey.split('-')
        point.label = `${parseInt(month)}月${parseInt(day)}日`
      } else if (groupBy === 'week') {
        const date = new Date(timeKey)
        point.label = `${date.getMonth() + 1}月${date.getDate()}日`
      } else {
        const [year, month] = timeKey.split('-')
        point.label = `${year}年${parseInt(month)}月`
      }

      const girlTimeMap = timePoints.get(timeKey)!
      
      // 为每个妹妹添加数据
      for (const girl of girlsList) {
        const stats = girlTimeMap.get(girl.id)
        point[`${girl.name}_count`] = stats?.orderCount || 0
        point[`${girl.name}_income`] = stats?.income || 0
      }

      trendData.push(point)
    }

    // 生成妹妹列表（用于图例）
    const girlLegend = girlsList.map(g => ({
      id: g.id,
      name: g.name,
      color: getGirlColor(g.id),
    }))

    return c.json({
      success: true,
      data: {
        trendData,
        girlLegend,
        groupBy,
      },
    })
  } catch (err) {
    console.error('Trends error:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// 为每个妹妹分配颜色
function getGirlColor(girlId: string): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#8B5CF6', // purple
    '#EF4444', // red
    '#06B6D4', // cyan
    '#F97316', // orange
    '#EC4899', // pink
    '#84CC16', // lime
    '#6366F1', // indigo
  ]
  // 使用 girlId 的哈希值来确定颜色
  let hash = 0
  for (let i = 0; i < girlId.length; i++) {
    hash = girlId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default app
