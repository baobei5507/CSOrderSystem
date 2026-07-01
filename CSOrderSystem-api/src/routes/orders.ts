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
  girlPackagePrices,
  memberLevels,
} from '../db/schema'
import type { Env } from '../index'
import { getStoreId } from './auth'

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
  const storeId = getStoreId(c)

  if (!storeId) return c.json({ success: false, error: 'No store access' }, 403)

  const allOrders = await db.select().from(orders)
    .where(eq(orders.storeId, storeId))
    .all()

  return c.json({ success: true, data: allOrders })
})

// POST /api/orders/calculate - 计算订单价格（预览）
app.post('/calculate', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  const { customerId, girlId, packageId, hours = 1, date } = body
  const storeId = getStoreId(c, body.storeId)

  if (!storeId || !customerId || !girlId || !packageId) {
    return c.json({ success: false, error: 'Missing required fields' }, 400)
  }

  try {
    // 获取关联数据
    const [customer, girl, pkg, store, config, girlPrice] = await Promise.all([
      db.select().from(customers).where(eq(customers.id, customerId)).get(),
      db.select().from(girls).where(eq(girls.id, girlId)).get(),
      db.select().from(packages).where(eq(packages.id, packageId)).get(),
      db.select().from(stores).where(eq(stores.id, storeId)).get(),
      db.select().from(storeMemberConfigs).where(eq(storeMemberConfigs.storeId, storeId)).get(),
      db.select().from(girlPackagePrices).where(
        and(eq(girlPackagePrices.girlId, girlId), eq(girlPackagePrices.packageId, packageId))
      ).get(),
    ])

    if (!customer || !girl || !pkg || !store) {
      return c.json({ success: false, error: '关联数据不存在' }, 400)
    }

    // 获取价格：分离常规价格和当日价格
    const regularPrice = girlPrice?.price || pkg.basePrice || 0
    const dailyPrice = girlPrice?.dailyPrice
    
    // 默认无折扣结果（先不考虑当日价格，后面会比较）
    const regularTotal = regularPrice * hours

    // 默认无折扣
    let result = {
      originalPricePerHour: regularPrice,
      hours,
      totalOriginalAmount: regularTotal,
      discountType: 'none' as const,
      discountPercent: 100,
      discountAmount: 0,
      finalPrice: regularTotal,
      deductedBalance: 0,
      breakdown: Array.from({ length: hours }, (_, i) => ({
        hour: i + 1,
        originalPrice: regularPrice,
        discountPercent: 100,
        finalPrice: regularPrice,
        type: 'none' as const,
      })),
      girlIncome: calculateCommission(regularTotal, girl.commissionType, girl.commissionValue, hours),
      serviceCommission: calculateCommission(regularTotal, store.serviceCommissionType, store.serviceCommissionValue, hours),
      usedMemberDayBenefit: false,
      reason: girl.excludeFromDiscount ? '该妹妹不参与优惠活动' : '非会员或无余额',
    }

    // 检查会员系统 或 妹妹不参与优惠
    if (girl.excludeFromDiscount || !config || !config.enabled || customer.memberLevel === 0 || customer.balance <= 0) {
      // 比较当日价格和常规价格
      if (dailyPrice && dailyPrice * hours < regularTotal) {
        const dailyTotal = dailyPrice * hours
        result = {
          ...result,
          originalPricePerHour: dailyPrice,
          totalOriginalAmount: dailyTotal,
          finalPrice: dailyTotal,
          discountType: 'dailyPrice',
          reason: '使用当日特惠价格',
          breakdown: Array.from({ length: hours }, (_, i) => ({
            hour: i + 1,
            originalPrice: dailyPrice,
            discountPercent: 100,
            finalPrice: dailyPrice,
            type: 'dailyPrice' as const,
          })),
          girlIncome: calculateCommission(dailyTotal, girl.commissionType, girl.commissionValue, hours),
          serviceCommission: calculateCommission(dailyTotal, store.serviceCommissionType, store.serviceCommissionValue, hours),
        }
      }
      return c.json({ success: true, data: result })
    }

    // 获取会员等级
    const levels = await db.select().from(memberLevels).where(eq(memberLevels.storeId, storeId)).all()
    const levelConfig = levels.find(l => l.level === customer.memberLevel)
    if (!levelConfig) {
      return c.json({ success: true, data: result })
    }

    // 判断是否是会员日
    const checkDate = date ? new Date(date) : new Date()
    const day = checkDate.getDay() // 0=周日, 1=周一...
    const memberDays = config.memberDays.split(',').map(d => parseInt(d)).filter(d => !isNaN(d))
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

    // 应用前提价到常规价格
    const priceWithMarkup = regularPrice + (config.priceMarkup || 0)
    
    // 计算每个钟的会员折扣价格
    const memberBreakdown = []
    let usedMemberDayBenefit = false
    let memberTotalPrice = 0

    for (let i = 0; i < hours; i++) {
      const hour = i + 1
      
      if (isMemberDay && !hasUsedMemberDay && i === 0) {
        // 检查余额是否满足会员日条件
        const minBalance = (customer.totalRecharge || 0) * (config.minBalancePercent / 100)
        
        if (customer.balance >= minBalance) {
          // 第一个钟：会员日折扣
          const finalPrice = Math.round(priceWithMarkup * levelConfig.memberDayDiscount / 100)
          memberBreakdown.push({
            hour,
            originalPrice: priceWithMarkup,
            discountPercent: levelConfig.memberDayDiscount,
            finalPrice,
            type: 'memberDay' as const,
          })
          memberTotalPrice += finalPrice
          usedMemberDayBenefit = true
        } else {
          // 余额不足，fallback 到常规折扣
          const finalPrice = Math.round(priceWithMarkup * levelConfig.regularDiscount / 100)
          memberBreakdown.push({
            hour,
            originalPrice: priceWithMarkup,
            discountPercent: levelConfig.regularDiscount,
            finalPrice,
            type: 'regular' as const,
          })
          memberTotalPrice += finalPrice
        }
      } else {
        // 其他钟：常规会员折扣
        const finalPrice = Math.round(priceWithMarkup * levelConfig.regularDiscount / 100)
        memberBreakdown.push({
          hour,
          originalPrice: priceWithMarkup,
          discountPercent: levelConfig.regularDiscount,
          finalPrice,
          type: 'regular' as const,
        })
        memberTotalPrice += finalPrice
      }
    }

    // 比较：会员折扣价 vs 当日价格
    const dailyTotalPrice = dailyPrice ? dailyPrice * hours : Infinity
    const useDailyPrice = dailyTotalPrice < memberTotalPrice
    
    // 最终使用的价格和明细
    const finalTotalPrice = useDailyPrice ? dailyTotalPrice : memberTotalPrice
    const finalBreakdown = useDailyPrice 
      ? Array.from({ length: hours }, (_, i) => ({
          hour: i + 1,
          originalPrice: dailyPrice,
          discountPercent: 100,
          finalPrice: dailyPrice,
          type: 'dailyPrice' as const,
        }))
      : memberBreakdown
    
    const finalOriginalAmount = useDailyPrice ? dailyTotalPrice : regularTotal
    const discountAmount = useDailyPrice ? 0 : regularTotal - memberTotalPrice
    const avgDiscountPercent = useDailyPrice ? 100 : Math.round((memberTotalPrice / regularTotal) * 100)

    // 提成计算（基于最终价格）
    const girlIncome = calculateCommission(finalTotalPrice, girl.commissionType, girl.commissionValue, hours)
    const serviceCommission = calculateCommission(finalTotalPrice, store.serviceCommissionType, store.serviceCommissionValue, hours)

    result = {
      originalPricePerHour: useDailyPrice ? dailyPrice : regularPrice,
      hours,
      totalOriginalAmount: finalOriginalAmount,
      priceMarkup: useDailyPrice ? 0 : (config.priceMarkup || 0),
      discountType: useDailyPrice ? 'dailyPrice' : (usedMemberDayBenefit ? 'memberDay' : 'memberRegular'),
      discountPercent: avgDiscountPercent,
      discountAmount,
      finalPrice: finalTotalPrice,
      deductedBalance: finalTotalPrice,
      breakdown: finalBreakdown,
      girlIncome,
      serviceCommission,
      usedMemberDayBenefit: useDailyPrice ? false : usedMemberDayBenefit,
      reason: useDailyPrice 
        ? '使用当日特惠价格'
        : (usedMemberDayBenefit 
          ? `会员日${levelConfig.memberDayDiscount}折(第1小时)` 
          : `${levelConfig.name}常规${levelConfig.regularDiscount}折`),
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
  const storeId = getStoreId(c, body.storeId)
  if (!storeId) return c.json({ success: false, error: 'No store access' }, 403)

  // 获取关联数据
  const [customer, girl, pkg, store] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, body.customerId)).get(),
    db.select().from(girls).where(eq(girls.id, body.girlId)).get(),
    db.select().from(packages).where(eq(packages.id, body.packageId)).get(),
    db.select().from(stores).where(eq(stores.id, storeId)).get(),
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

  // 判断是否是试钟订单
  const isTrialOrder = body.discountType === 'trial' && girl.trialPrice

  // 计算价格和折扣（前端传来的是元）
  let hours, originalPricePerHourYuan, totalOriginalAmountYuan, finalPriceYuan, discountAmountYuan, discountPercent, girlIncome, serviceCommission, isFreeOrder, storeProfit

  if (isTrialOrder) {
    // 试钟订单：一口价，不按小时计费，不参与任何优惠
    hours = 1
    originalPricePerHourYuan = girl.trialPrice
    totalOriginalAmountYuan = girl.trialPrice
    finalPriceYuan = girl.trialPrice
    discountAmountYuan = 0
    discountPercent = 100
    // 提成基于 trialPrice
    girlIncome = calculateCommission(girl.trialPrice, girl.commissionType, girl.commissionValue, 1)
    serviceCommission = calculateCommission(girl.trialPrice, store.serviceCommissionType, store.serviceCommissionValue, 1)
    isFreeOrder = false
    storeProfit = girl.trialPrice - girlIncome - serviceCommission
  } else {
    // 常规订单
    hours = body.hours || 1
    originalPricePerHourYuan = body.originalPricePerHour || pkg.basePrice || 0
    totalOriginalAmountYuan = body.totalOriginalAmount || (originalPricePerHourYuan * hours)
    finalPriceYuan = body.finalPrice ?? totalOriginalAmountYuan
    discountAmountYuan = body.discountAmount ?? (totalOriginalAmountYuan - finalPriceYuan)
    discountPercent = body.discountPercent || Math.round((finalPriceYuan / totalOriginalAmountYuan) * 100)
    // 提成计算（基于原价和小时数，免单也照常计算提成）
    girlIncome = calculateCommission(totalOriginalAmountYuan, girl.commissionType, girl.commissionValue, hours)
    serviceCommission = calculateCommission(totalOriginalAmountYuan, store.serviceCommissionType, store.serviceCommissionValue, hours)
    isFreeOrder = finalPriceYuan === 0
    storeProfit = isFreeOrder ? 0 : finalPriceYuan - girlIncome - serviceCommission
  }
  
  // 转换为数据库存储单位：
  // - integer 字段存分（originalPrice, totalOriginalAmount, discountAmount）
  // - real 字段存元（finalPrice）
  const originalPricePerHour = Math.round(originalPricePerHourYuan * 100)
  const totalOriginalAmount = Math.round(totalOriginalAmountYuan * 100)
  const finalPrice = finalPriceYuan // real 类型，存元
  const discountAmount = Math.round(discountAmountYuan * 100)

  // 创建订单
  await db.insert(orders).values({
    id: orderId,
    orderNo,
    storeId,
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
    deductedBalance: body.deductedBalance ?? finalPrice,
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

  // 扣除余额（免单订单不扣余额，不消耗会员日权益）
  if (!isFreeOrder && body.deductedBalance && body.deductedBalance > 0) {
    const deductedBalanceFen = Math.round(body.deductedBalance * 100) // 元转分
    const beforeBalance = customer.balance || 0
    const afterBalance = beforeBalance - deductedBalanceFen

    await db.update(customers)
      .set({ balance: afterBalance, updatedAt: nowTime })
      .where(eq(customers.id, body.customerId))

    // 创建余额流水
    await db.insert(balanceTransactions).values({
      id: crypto.randomUUID(),
      customerId: body.customerId,
      orderId,
      type: 'consume',
      amount: -deductedBalanceFen,
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
        storeId,
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

  const storeId = getStoreId(c)
  const body = await c.req.json()
  const now = Date.now()

  // 字段白名单：只允许修改这些字段
  const allowedFields = [
    'status', 'finalPrice', 'girlIncome', 'serviceCommission',
    'discountAmount', 'deductedBalance', 'remark', 'appointmentTime',
    'actualMinutes', 'discountType', 'discountPercent', 'storeProfit',
  ]
  const updateData: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  // 处理预约时间（前端可能传时间戳数值或字符串）
  if (body.appointmentTime !== undefined) {
    if (typeof body.appointmentTime === 'number') {
      updateData.appointmentTime = body.appointmentTime
    } else if (typeof body.appointmentTime === 'string' && body.appointmentTime) {
      updateData.appointmentTime = new Date(body.appointmentTime).getTime()
    } else if (body.appointmentTime && typeof body.appointmentTime === 'object') {
      updateData.appointmentTime = new Date(body.appointmentTime).getTime()
    } else {
      updateData.appointmentTime = null
    }
  }

  // 获取原订单数据，用于计算余额变动
  const oldOrder = await db.select().from(orders).where(eq(orders.id, id)).get()
  if (!oldOrder) return c.json({ success: false, error: 'Order not found' }, 404)
  if (storeId && oldOrder.storeId !== storeId) return c.json({ success: false, error: 'No access' }, 403)

  // 处理余额变动
  // deductedBalance 在 DB 中存的是元（与创建时一致）
  const oldFinalPrice = oldOrder.finalPrice // 元
  const oldDeductedBalance = oldOrder.deductedBalance || 0 // 元
  const isCancelling = body.status === 'cancelled' && oldOrder.status !== 'cancelled'
  const isPriceAdjusting = body.finalPrice !== undefined && body.finalPrice !== oldFinalPrice && oldDeductedBalance > 0

  // 互斥逻辑：取消订单和价格调整不能同时触发退款
  if (isCancelling && oldDeductedBalance > 0) {
    // 场景1: 订单取消 → 退还全部已扣余额
    const refundFen = Math.round(oldDeductedBalance * 100) // 元转分
    const customer = await db.select().from(customers).where(eq(customers.id, oldOrder.customerId)).get()
    if (customer) {
      const beforeBalance = customer.balance || 0
      const afterBalance = beforeBalance + refundFen

      await db.update(customers)
        .set({ balance: afterBalance, updatedAt: now })
        .where(eq(customers.id, oldOrder.customerId))

      await db.insert(balanceTransactions).values({
        id: crypto.randomUUID(),
        customerId: oldOrder.customerId,
        orderId: id,
        type: 'refund',
        amount: refundFen,
        balanceBefore: beforeBalance,
        balanceAfter: afterBalance,
        remark: `订单取消退款 ${oldOrder.orderNo}`,
        createdAt: now,
      })

      updateData.deductedBalance = 0
    }
  } else if (isPriceAdjusting) {
    // 场景2: finalPrice 变化 → 按比例退还余额差额
    const newFinalPrice = body.finalPrice!
    const ratio = Math.min(newFinalPrice / oldFinalPrice, 1)
    const newDeductedBalance = Math.round(oldDeductedBalance * ratio)
    const balanceDiffYuan = oldDeductedBalance - newDeductedBalance

    if (balanceDiffYuan > 0) {
      const refundFen = Math.round(balanceDiffYuan * 100) // 元转分
      const customer = await db.select().from(customers).where(eq(customers.id, oldOrder.customerId)).get()
      if (customer) {
        const beforeBalance = customer.balance || 0
        const afterBalance = beforeBalance + refundFen

        await db.update(customers)
          .set({ balance: afterBalance, updatedAt: now })
          .where(eq(customers.id, oldOrder.customerId))

        await db.insert(balanceTransactions).values({
          id: crypto.randomUUID(),
          customerId: oldOrder.customerId,
          orderId: id,
          type: 'refund',
          amount: refundFen,
          balanceBefore: beforeBalance,
          balanceAfter: afterBalance,
          remark: `订单调整退款 ${oldOrder.orderNo} (¥${oldFinalPrice}→¥${newFinalPrice})`,
          createdAt: now,
        })

        updateData.deductedBalance = newDeductedBalance
      }
    }
  }

  updateData.updatedAt = now

  await db.update(orders)
    .set(updateData)
    .where(eq(orders.id, id))

  return c.json({ success: true })
})

// DELETE /api/orders?id=xxx
app.delete('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  const storeId = getStoreId(c)

  // 获取订单数据，用于退还余额
  const order = await db.select().from(orders).where(eq(orders.id, id)).get()
  if (!order) return c.json({ success: false, error: 'Order not found' }, 404)
  if (storeId && order.storeId !== storeId) return c.json({ success: false, error: 'No access' }, 403)

  const now = Date.now()

  // 如果订单有扣除余额，需要退还
  if (order.deductedBalance && order.deductedBalance > 0 && order.status !== 'cancelled') {
    const refundFen = Math.round(order.deductedBalance * 100) // 元转分（deductedBalance存元）
    const customer = await db.select().from(customers).where(eq(customers.id, order.customerId)).get()
    if (customer) {
      const beforeBalance = customer.balance || 0
      const afterBalance = beforeBalance + refundFen

      await db.update(customers)
        .set({ balance: afterBalance, updatedAt: now })
        .where(eq(customers.id, order.customerId))

      await db.insert(balanceTransactions).values({
        id: crypto.randomUUID(),
        customerId: order.customerId,
        orderId: id,
        type: 'refund',
        amount: refundFen,
        balanceBefore: beforeBalance,
        balanceAfter: afterBalance,
        remark: `订单删除退款 ${order.orderNo}`,
        createdAt: now,
      })
    }
  }

  // 删除订单快照
  await db.delete(orderSnapshots).where(eq(orderSnapshots.orderId, id))

  // 删除订单
  await db.delete(orders).where(eq(orders.id, id))

  return c.json({ success: true })
})

export default app
