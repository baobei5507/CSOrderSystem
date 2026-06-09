import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { 
  customers, 
  girls, 
  packages as packagesTable,
  stores,
  girlPackagePrices,
  storeMemberConfigs,
  memberLevels,
  memberDayUsage
} from '../db/schema'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// 格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// 计算提成（基于价格和小时数）
function calculateCommission(price: number, type: 'percent' | 'fixed', value: number, hours: number = 1): number {
  if (type === 'percent') {
    return Math.round(price * value / 100 * 100) / 100
  }
  // 固定提成：每小时固定金额 × 小时数
  return value * hours
}

// POST /api/calculate-price
app.post('/', async (c) => {
  const db = drizzle(c.env.DB)
  
  try {
    const body = await c.req.json() as {
      storeId: string
      customerId: string
      girlId: string
      packageId: string
      hours?: number
      date?: string
    }

    const { storeId, customerId, girlId, packageId, hours = 1, date } = body

    if (!storeId || !customerId || !girlId || !packageId) {
      return c.json({ success: false, error: 'Missing required fields' }, 400)
    }

    // 获取关联数据
    const customer = await db.select().from(customers).where(eq(customers.id, customerId)).get()
    const girl = await db.select().from(girls).where(eq(girls.id, girlId)).get()
    const pkg = await db.select().from(packagesTable).where(eq(packagesTable.id, packageId)).get()
    const store = await db.select().from(stores).where(eq(stores.id, storeId)).get()

    if (!customer || !girl || !pkg || !store) {
      return c.json({ success: false, error: '关联数据不存在' }, 400)
    }

    // 获取妹妹套餐价格
    const girlPrice = await db.select().from(girlPackagePrices).where(
      and(
        eq(girlPackagePrices.girlId, girlId),
        eq(girlPackagePrices.packageId, packageId)
      )
    ).get()

    // 基础价格：优先使用当日价格，其次常规价格，最后套餐基础价
    const basePrice = girlPrice?.dailyPrice || girlPrice?.price || pkg.basePrice || 0

    // 如果妹妹不参与优惠，直接返回基础价格
    if (girl.excludeFromDiscount) {
      const totalPrice = basePrice * hours
      const girlIncome = calculateCommission(totalPrice, girl.commissionType, girl.commissionValue, hours)
      const serviceCommission = calculateCommission(totalPrice, store.serviceCommissionType, store.serviceCommissionValue, hours)
      
      return c.json({
        success: true,
        data: {
          basePrice,
          hours,
          totalOriginalAmount: totalPrice,
          discountType: 'none',
          discountPercent: 100,
          discountAmount: 0,
          finalPrice: totalPrice,
          deductedBalance: 0,
          girlIncome,
          serviceCommission,
          usedMemberDayBenefit: false,
          reason: '该妹妹不参与优惠活动',
        }
      })
    }

    // 获取会员配置
    const memberConfig = await db.select().from(storeMemberConfigs).where(eq(storeMemberConfigs.storeId, storeId)).get()
    
    // 如果没有启用会员系统，直接返回基础价格
    if (!memberConfig || !memberConfig.enabled) {
      const totalPrice = basePrice * hours
      const girlIncome = calculateCommission(totalPrice, girl.commissionType, girl.commissionValue, hours)
      const serviceCommission = calculateCommission(totalPrice, store.serviceCommissionType, store.serviceCommissionValue, hours)
      
      return c.json({
        success: true,
        data: {
          basePrice,
          hours,
          totalOriginalAmount: totalPrice,
          discountType: 'none',
          discountPercent: 100,
          discountAmount: 0,
          finalPrice: totalPrice,
          deductedBalance: 0,
          girlIncome,
          serviceCommission,
          usedMemberDayBenefit: false,
          reason: '会员系统未启用',
        }
      })
    }

    // 获取会员等级
    const levels = await db.select().from(memberLevels).where(eq(memberLevels.storeId, storeId)).all()
    
    // 确定顾客会员等级
    const customerLevel = customer.memberLevel || 0
    const levelConfig = levels.find(l => l.level === customerLevel)
    
    // 如果不是会员，直接返回基础价格
    if (!levelConfig || customerLevel === 0) {
      const totalPrice = basePrice * hours
      const girlIncome = calculateCommission(totalPrice, girl.commissionType, girl.commissionValue, hours)
      const serviceCommission = calculateCommission(totalPrice, store.serviceCommissionType, store.serviceCommissionValue, hours)
      
      return c.json({
        success: true,
        data: {
          basePrice,
          hours,
          totalOriginalAmount: totalPrice,
          discountType: 'none',
          discountPercent: 100,
          discountAmount: 0,
          finalPrice: totalPrice,
          deductedBalance: 0,
          girlIncome,
          serviceCommission,
          usedMemberDayBenefit: false,
          reason: '非会员用户',
        }
      })
    }

    // 判断是否是会员日
    const targetDate = date ? new Date(date) : new Date()
    const dayOfWeek = targetDate.getDay()
    const memberDays = memberConfig.memberDays.split(',').map(d => parseInt(d)).filter(d => !isNaN(d))
    const isMemberDay = memberDays.includes(dayOfWeek)
    
    // 检查今天是否已使用过会员日权益
    const today = formatDate(targetDate)
    const usage = await db.select().from(memberDayUsage)
      .where(and(
        eq(memberDayUsage.customerId, customerId),
        eq(memberDayUsage.storeId, storeId),
        eq(memberDayUsage.date, today)
      ))
      .get()
    const hasUsedMemberDay = !!usage
    
    // 应用前提价
    const priceWithMarkup = basePrice + (memberConfig.priceMarkup || 0)
    
    // 计算每个钟的价格明细
    const breakdown = []
    let totalFinalPrice = 0
    let usedMemberDayBenefit = false
    
    for (let i = 0; i < hours; i++) {
      const hour = i + 1
      
      // 只有首钟、是会员日、且今天未使用过会员日权益，才享受会员日特惠
      const isFirstHourMemberDay = isMemberDay && i === 0 && !hasUsedMemberDay
      const hourDiscountPercent = isFirstHourMemberDay 
        ? levelConfig.memberDayDiscount 
        : levelConfig.regularDiscount
      const hourType = isFirstHourMemberDay ? 'memberDay' : 'regular'
      
      const hourFinalPrice = Math.round(priceWithMarkup * hourDiscountPercent / 100 * 100) / 100
      
      breakdown.push({
        hour,
        originalPrice: priceWithMarkup,
        discountPercent: hourDiscountPercent,
        finalPrice: hourFinalPrice,
        type: hourType,
      })
      
      totalFinalPrice += hourFinalPrice
      if (isFirstHourMemberDay) usedMemberDayBenefit = true
    }
    
    const originalTotal = priceWithMarkup * hours
    const discountAmount = Math.round((originalTotal - totalFinalPrice) * 100) / 100
    
    // 计算平均折扣率
    const avgDiscountPercent = originalTotal > 0 
      ? Math.round((totalFinalPrice / originalTotal) * 100)
      : 100
    
    // 计算余额抵扣
    const customerBalance = (customer.balance || 0) / 100 // 转换为元
    const minBalancePercent = memberConfig.minBalancePercent || 50
    const minRequiredBalance = totalFinalPrice * minBalancePercent / 100
    
    let deductedBalance = 0
    let finalPrice = totalFinalPrice
    
    if (customerBalance >= minRequiredBalance) {
      // 可以全额使用余额抵扣
      deductedBalance = Math.min(customerBalance, totalFinalPrice)
      finalPrice = Math.max(0, totalFinalPrice - deductedBalance)
    }

    // 计算提成（基于最终支付价格和小时数）
    const girlIncome = calculateCommission(finalPrice, girl.commissionType, girl.commissionValue, hours)
    const serviceCommission = calculateCommission(finalPrice, store.serviceCommissionType, store.serviceCommissionValue, hours)

    return c.json({
      success: true,
      data: {
        basePrice,
        hours,
        totalOriginalAmount: originalTotal,
        priceMarkup: memberConfig.priceMarkup || 0,
        discountType: usedMemberDayBenefit ? 'memberDay' : 'memberRegular',
        discountPercent: avgDiscountPercent,
        discountAmount,
        finalPrice,
        deductedBalance: Math.round(deductedBalance * 100) / 100,
        girlIncome,
        serviceCommission,
        usedMemberDayBenefit,
        reason: usedMemberDayBenefit 
          ? `会员日特惠 ${levelConfig.name} 首钟${levelConfig.memberDayDiscount}折`
          : `会员折扣 ${levelConfig.name} ${levelConfig.regularDiscount}折`,
        breakdown,
      }
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return c.json({ success: false, error: error.message || 'Internal server error' }, 500)
  }
})

export default app
