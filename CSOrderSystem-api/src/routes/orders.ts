import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import {
  orders,
  orderSnapshots,
  customers,
  customerAccounts,
  girls,
  packages,
  stores,
  storeMemberConfigs,
  balanceTransactions,
  memberDayUsage,
} from '../db/schema'
import type { Env } from '../index'

// 计算提成（基于原价和小时数）
function calculateCommission(price: number, type: 'percent' | 'fixed', value: number, hours: number = 1): number {
  if (type === 'percent') {
    return Math.round(price * value / 100)
  }
  // 固定提成：每小时固定金额 × 小时数
  return value * hours
}

// 生成订单号
function generateOrderNo(): string {
  const date = new Date()
  const prefix = date.getFullYear().toString().slice(2) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `O${prefix}${random}`
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

const app = new Hono<{ Bindings: Env }>()

// GET /api/orders?storeId=xxx
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = c.req.query('storeId')

  if (!storeId) return c.json({ success: false, error: 'Missing storeId' }, 400)

  const allOrders = await db.select().from(orders)
    .where(eq(orders.storeId, storeId))
    .all()

  return c.json({ success: true, data: allOrders })
})

// POST /api/orders/calculate - 计算订单价格（预览）
app.post('/calculate', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  const { storeId, customerId, girlId, packageId, hours = 1, date } = body

  if (!storeId || !customerId || !girlId || !packageId) {
    return c.json({ success: false, error: 'Missing required fields' }, 400)
  }

  try {
    // 获取关联数据
    const [customer, girl, pkg, store, config] = await Promise.all([
      db.select().from(customers).where(eq(customers.id, customerId)).get(),
      db.select().from(girls).where(eq(girls.id, girlId)).get(),
      db.select().from(packages).where(eq(packages.id, packageId)).get(),
      db.select().from(stores).where(eq(stores.id, storeId)).get(),
      db.select().from(storeMemberConfigs).where(eq(storeMemberConfigs.storeId, storeId)).get(),
    ])

    if (!customer || !girl || !pkg || !store) {
      return c.json({ success: false, error: '关联数据不存在' }, 400)
    }

    // 获取原价（每小时）
    const originalPricePerHour = pkg.basePrice || 0
    const totalOriginalAmount = originalPricePerHour * hours

    // 默认无折扣
    let result = {
      originalPricePerHour,
      hours,
      totalOriginalAmount,
      discountType: 'none' as const,
      discountPercent: 100,
      discountAmount: 0,
      finalPrice: totalOriginalAmount,
      deductedBalance: 0,
      breakdown: Array.from({ length: hours }, (_, i) => ({
        hour: i + 1,
        originalPrice: originalPricePerHour,
        discountPercent: 100,
        finalPrice: originalPricePerHour,
        type: 'none' as const,
      })),
      girlIncome: calculateCommission(totalOriginalAmount, girl.commissionType, girl.commissionValue, hours),
      serviceCommission: calculateCommission(totalOriginalAmount, store.serviceCommissionType, store.serviceCommissionValue, hours),
      usedMemberDayBenefit: false,
      reason: '非会员或无余额',
    }

    // 检查会员系统
    if (!config || !config.enabled || customer.memberLevel === 0 || customer.balance <= 0) {
      return c.json({ success: true, data: result })
    }

    // 解析会员等级配置
    const levels = JSON.parse(config.levels)
    const levelConfig = levels.find((l: any) => l.level === customer.memberLevel)
    if (!levelConfig) {
      return c.json({ success: true, data: result })
    }

    // 判断是否是会员日
    const checkDate = date ? new Date(date) : new Date()
    const day = checkDate.getDay() // 0=周日, 1=周一...
    const memberDays = JSON.parse(config.memberDays)
    const isMemberDay = memberDays.includes(day)

    // 检查今天是否已使用过会员日权益
    const today = formatDate(checkDate)
    const usage = await db.select().from(memberDayUsage)
      .where(and(
        eq(memberDayUsage.customerId, customerId),
        eq(memberDayUsage.storeId, storeId),
        eq(memberDayUsage.date, today)
      ))
      .get()
    const hasUsedMemberDay = !!usage

    // 计算每个钟的价格
    const breakdown = []
    let usedMemberDayBenefit = false
    let totalFinalPrice = 0

    for (let i = 0; i < hours; i++) {
      const hour = i + 1
      
      if (isMemberDay && !hasUsedMemberDay && i === 0) {
        // 检查余额是否满足会员日条件
        const minBalance = (customer.totalRecharge || 0) * (config.minBalancePercent / 100)
        
        if (customer.balance >= minBalance) {
          // 第一个钟：会员日折扣
          const finalPrice = Math.round(originalPricePerHour * levelConfig.memberDayDiscount / 100)
          breakdown.push({
            hour,
            originalPrice: originalPricePerHour,
            discountPercent: levelConfig.memberDayDiscount,
            finalPrice,
            type: 'memberDay' as const,
          })
          totalFinalPrice += finalPrice
          usedMemberDayBenefit = true
        } else {
          // 余额不足，fallback 到常规折扣
          const finalPrice = Math.round(originalPricePerHour * levelConfig.regularDiscount / 100)
          breakdown.push({
            hour,
            originalPrice: originalPricePerHour,
            discountPercent: levelConfig.regularDiscount,
            finalPrice,
            type: 'memberRegular' as const,
          })
          totalFinalPrice += finalPrice
        }
      } else {
        // 其他钟：常规会员折扣
        const finalPrice = Math.round(originalPricePerHour * levelConfig.regularDiscount / 100)
        breakdown.push({
          hour,
          originalPrice: originalPricePerHour,
          discountPercent: levelConfig.regularDiscount,
          finalPrice,
          type: 'memberRegular' as const,
        })
        totalFinalPrice += finalPrice
      }
    }

    const discountAmount = totalOriginalAmount - totalFinalPrice
    const avgDiscountPercent = Math.round((totalFinalPrice / totalOriginalAmount) * 100)

    // 提成计算（基于原价和小时数！）
    const girlIncome = calculateCommission(totalOriginalAmount, girl.commissionType, girl.commissionValue, hours)
    const serviceCommission = calculateCommission(totalOriginalAmount, store.serviceCommissionType, store.serviceCommissionValue, hours)

    result = {
      originalPricePerHour,
      hours,
      totalOriginalAmount,
      discountType: usedMemberDayBenefit ? 'memberDay' : 'memberRegular',
      discountPercent: avgDiscountPercent,
      discountAmount,
      finalPrice: totalFinalPrice,
      deductedBalance: totalFinalPrice,
      breakdown,
      girlIncome,
      serviceCommission,
      usedMemberDayBenefit,
      reason: usedMemberDayBenefit 
        ? `会员日${levelConfig.memberDayDiscount}折(第1小时)` 
        : `${levelConfig.name}常规${levelConfig.regularDiscount}折`,
    }

    return c.json({ success: true, data: result })
  } catch (err) {
    console.error('Calculate order error:', err)
    return c.json({ success: false, error: 'Calculation error' }, 500)
  }
})

// POST /api/orders
app.post('/', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()

  // 获取关联数据
  const [customer, girl, pkg, store] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, body.customerId)).get(),
    db.select().from(girls).where(eq(girls.id, body.girlId)).get(),
    db.select().from(packages).where(eq(packages.id, body.packageId)).get(),
    db.select().from(stores).where(eq(stores.id, body.storeId)).get(),
  ])

  if (!customer || !girl || !pkg || !store) {
    return c.json({ success: false, error: '关联数据不存在' }, 400)
  }

  const now = new Date()
  const nowTime = now.getTime()

  // 处理预约时间
  let appointmentTimeValue = null
  if (body.appointmentTime && body.appointmentTime.trim() !== '') {
    const date = new Date(body.appointmentTime)
    if (!isNaN(date.getTime())) {
      appointmentTimeValue = date.getTime()
    }
  }

  const orderId = crypto.randomUUID()
  const orderNo = generateOrderNo()

  // 计算价格和折扣
  const hours = body.hours || 1
  const originalPricePerHour = body.originalPricePerHour || pkg.basePrice || 0
  const totalOriginalAmount = body.totalOriginalAmount || (originalPricePerHour * hours)
  const finalPrice = body.finalPrice || totalOriginalAmount
  const discountAmount = body.discountAmount || (totalOriginalAmount - finalPrice)
  const discountPercent = body.discountPercent || Math.round((finalPrice / totalOriginalAmount) * 100)

  // 提成计算（基于原价和小时数！）
  const girlIncome = calculateCommission(totalOriginalAmount, girl.commissionType, girl.commissionValue, hours)
  const serviceCommission = calculateCommission(totalOriginalAmount, store.serviceCommissionType, store.serviceCommissionValue, hours)
  const storeProfit = finalPrice - girlIncome - serviceCommission

  // 创建订单
  await db.insert(orders).values({
    id: orderId,
    orderNo,
    storeId: body.storeId,
    customerId: body.customerId,
    customerAccountId: body.customerAccountId || null,
    girlId: body.girlId,
    packageId: body.packageId,
    appointmentTime: appointmentTimeValue,
    hours,
    originalPrice: originalPricePerHour,
    totalOriginalAmount,
    price: finalPrice, // 兼容旧字段
    discount: discountAmount, // 兼容旧字段
    finalPrice,
    discountType: body.discountType || 'none',
    discountPercent,
    discountAmount,
    deductedBalance: body.deductedBalance || finalPrice,
    usedMemberDayBenefit: body.usedMemberDayBenefit ? 1 : 0,
    girlIncome,
    serviceCommission,
    storeProfit,
    couponSource: body.couponSource || null,
    status: 'pending',
    serviceStaffName: c.env.DEFAULT_SERVICE_STAFF,
    remark: body.remark || null,
    createdAt: nowTime,
    updatedAt: nowTime,
  })

  // 扣除余额
  if (body.deductedBalance && body.deductedBalance > 0) {
    const beforeBalance = customer.balance || 0
    const afterBalance = beforeBalance - body.deductedBalance

    await db.update(customers)
      .set({ balance: afterBalance, updatedAt: nowTime })
      .where(eq(customers.id, body.customerId))

    // 创建余额流水
    await db.insert(balanceTransactions).values({
      id: crypto.randomUUID(),
      customerId: body.customerId,
      orderId,
      type: 'consume',
      amount: -body.deductedBalance,
      balanceBefore: beforeBalance,
      balanceAfter: afterBalance,
      remark: `订单消费 ${orderNo}`,
      createdAt: nowTime,
    })

    // 如果使用会员日权益，记录
    if (body.usedMemberDayBenefit) {
      const today = formatDate(now)
      await db.insert(memberDayUsage).values({
        id: crypto.randomUUID(),
        customerId: body.customerId,
        storeId: body.storeId,
        date: today,
        usedCount: 1,
        createdAt: nowTime,
      }).catch(() => {
        // 如果已存在则忽略错误
      })
    }
  }

  // 创建订单快照
  await db.insert(orderSnapshots).values({
    id: crypto.randomUUID(),
    orderId,
    customerNameSnapshot: customer.nickname,
    customerAccountSnapshot: null,
    girlNameSnapshot: girl.name,
    packageNameSnapshot: pkg.name,
    priceSnapshot: totalOriginalAmount,
    girlCommissionTypeSnapshot: girl.commissionType,
    girlCommissionValueSnapshot: girl.commissionValue,
    serviceCommissionTypeSnapshot: store.serviceCommissionType,
    serviceCommissionValueSnapshot: store.serviceCommissionValue,
    createdAt: nowTime,
  })

  return c.json({ success: true, data: { id: orderId, orderNo } }, 201)
})

// PUT /api/orders?id=xxx
app.put('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  const body = await c.req.json()
  const updateData = { ...body }
  
  // 移除可能传入的 Date 对象，改用时间戳
  if (body.updatedAt) delete updateData.updatedAt
  if (body.createdAt) delete updateData.createdAt
  if (body.appointmentTime && typeof body.appointmentTime === 'object') {
    updateData.appointmentTime = new Date(body.appointmentTime).getTime()
  }
  
  await db.update(orders)
    .set({ ...updateData, updatedAt: Date.now() })
    .where(eq(orders.id, id))

  return c.json({ success: true })
})

export default app
