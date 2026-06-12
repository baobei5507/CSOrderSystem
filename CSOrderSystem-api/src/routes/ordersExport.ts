import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { 
  orders, 
  customers, 
  girls, 
  packages,
  balanceTransactions,
  memberLevels
} from '../db/schema'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// POST /api/orders/export - 导出订单数据
app.post('/', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  const { storeId, startDate, endDate, status } = body

  if (!storeId) {
    return c.json({ success: false, error: 'Missing storeId' }, 400)
  }

  try {
    // 构建查询条件
    const conditions = [eq(orders.storeId, storeId)]
    
    // 日期范围筛选
    if (startDate && endDate) {
      const startTime = new Date(startDate).getTime()
      const endTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1 // 包含当天
      conditions.push(gte(orders.createdAt, startTime))
      conditions.push(lte(orders.createdAt, endTime))
    }
    
    // 状态筛选
    if (status) {
      conditions.push(eq(orders.status, status))
    }

    // 查询订单
    const ordersList = await db.select().from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .all()

    // 获取关联数据
    const customerIds = [...new Set(ordersList.map(o => o.customerId))]
    const girlIds = [...new Set(ordersList.map(o => o.girlId))]
    const packageIds = [...new Set(ordersList.map(o => o.packageId))]
    const orderIds = ordersList.map(o => o.id)

    const [customersList, girlsList, packagesList, transactionsList] = await Promise.all([
      db.select().from(customers).where(eq(customers.storeId, storeId)).all(),
      db.select().from(girls).where(eq(girls.storeId, storeId)).all(),
      db.select().from(packages).where(eq(packages.storeId, storeId)).all(),
      db.select().from(balanceTransactions).all()
    ])

    // 过滤出订单相关的交易记录
    const orderTransactions = transactionsList.filter(t => 
      t.orderId && orderIds.includes(t.orderId)
    )

    // 构建查找表
    const customerMap = new Map(customersList.map(c => [c.id, c]))
    const girlMap = new Map(girlsList.map(g => [g.id, g]))
    const packageMap = new Map(packagesList.map(p => [p.id, p]))
    
    // 构建订单到交易的映射（获取订单处理完后的最终余额）
    // 找该订单最后一条流水（consume/refund都算），取 balanceAfter
    const orderBalanceMap = new Map<string, number>()
    for (const order of ordersList) {
      const orderTxns = orderTransactions
        .filter(t => t.orderId === order.id)
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      const lastTxn = orderTxns[orderTxns.length - 1]
      if (lastTxn) {
        orderBalanceMap.set(order.id, lastTxn.balanceAfter || 0)
      }
    }

    // 获取会员等级名称映射
    const memberLevelsList = await db.select().from(memberLevels)
      .where(eq(memberLevels.storeId, storeId))
      .all()
    const levelNameMap = new Map(memberLevelsList.map(l => [l.level, l.name]))

    // 组装导出数据
    const exportData = ordersList.map(order => {
      const customer = customerMap.get(order.customerId)
      const girl = girlMap.get(order.girlId)
      const pkg = packageMap.get(order.packageId)
      const memberLevel = customer?.memberLevel || 0
      const memberLevelName = memberLevel > 0 ? (levelNameMap.get(memberLevel) || `LV${memberLevel}`) : '-'

      // 计算实际时长相关的调整数据
      const bookedMinutes = (order.hours || 1) * 60
      const isAdjusted = order.actualMinutes !== null && order.actualMinutes !== undefined
      const ratio = isAdjusted ? (order.actualMinutes! / bookedMinutes) : 1

      // 调整后的原价总计（分）和调整后的单价（分/小时）
      const adjustedTotalOriginal = order.totalOriginalAmount 
        ? Math.round(order.totalOriginalAmount * ratio) 
        : (order.originalPrice ? Math.round(order.originalPrice * ratio) : 0)
      const adjustedUnitPrice = order.originalPrice 
        ? Math.round(order.originalPrice * ratio) 
        : 0

      return {
        orderNo: order.orderNo,
        createdAt: order.createdAt,
        girlName: girl?.name || '-',
        serviceStaffName: order.serviceStaffName,
        customerName: customer?.nickname || '-',
        customerMemberLevel: memberLevel,
        memberLevelName, // 会员等级名称，如"3K会员"
        appointmentTime: order.appointmentTime,
        hours: order.hours,
        actualMinutes: order.actualMinutes, // null=按预约时长完成
        isAdjusted, // 是否有实际时长调整
        packageName: pkg?.name || '-',
        originalPrice: adjustedUnitPrice, // 调整后的单价（分），前端除以100
        couponSource: order.couponSource,
        discountAmount: order.discountAmount, // 分，前端除以100（已在完成时调整）
        finalPrice: order.finalPrice, // 元，real类型（已在完成时调整）
        girlIncome: order.girlIncome, // 妹妹收入（元）
        serviceCommission: order.serviceCommission, // 客服提成（元）
        balanceAtOrder: orderBalanceMap.get(order.id) || customer?.balance || 0, // 分，前端除以100
        status: order.status,
        remark: order.remark,
      }
    })

    return c.json({ success: true, data: exportData })
  } catch (err) {
    console.error('Export orders error:', err)
    return c.json({ success: false, error: 'Export failed' }, 500)
  }
})

export default app
