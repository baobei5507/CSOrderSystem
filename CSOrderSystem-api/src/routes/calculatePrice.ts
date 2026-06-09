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

    // 基础价格：优先使用常规价格，其次套餐基础价
    const regularPrice = girlPrice?.price || pkg.basePrice || 0
    const dailyPrice = girlPrice?.dailyPrice

    // 如果妹妹不参与优惠，直接返回基础价格（但有当日价时仍需比较）
    if (girl.excludeFromDiscount) {
      const regularTotal = regularPrice * hours
      // 如果有当日价格，比较哪个更便宜
      const finalTotal = dailyPrice && dailyPrice < regularTotal ? dailyPrice * hours : regularTotal
      const usedDailyPrice = dailyPrice && dailyPrice < regularTotal
      
      const girlIncome = calculateCommission(finalTotal, girl.commissionType, girl.commissionValue, hours)
      const serviceCommission = calculateCommission(finalTotal, store.serviceCommissionType, store.serviceCommissionValue, hours)
      
      return c.json({
        success: true,
        data: {
          basePrice: usedDailyPrice ? dailyPrice : regularPrice,
          hours,
          totalOriginalAmount: finalTotal,
          discountType: usedDailyPrice ? 'dailyPrice' : 'none',
          discountPercent: 100,
          discountAmount: 0,
          finalPrice: finalTotal,
          deductedBalance: 0,
          girlIncome,
          serviceCommission,
          usedMemberDayBenefit: false,
          reason: usedDailyPrice ? '使用当日特惠价格' : '该妹妹不参与优惠活动',
          breakdown: Array.from({ length: hours }, (_, i) => ({
            hour: i + 1,
            originalPrice: usedDailyPrice ? dailyPrice : regularPrice,
            discountPercent: 100,
            finalPrice: usedDailyPrice ? dailyPrice : regularPrice,
            type: usedDailyPrice ? 'dailyPrice' : 'none',
          })),
        }
      })
    }

    // 获取会员配置
    const memberConfig = await db.select().from(storeMemberConfigs).where(eq(storeMemberConfigs.storeId, storeId)).get()
    
    // 如果没有启用会员系统，比较当日价格和常规价格
    if (!memberConfig || !memberConfig.enabled) {
      const regularTotal = regularPrice * hours
      const finalTotal = dailyPrice && dailyPrice * hours < regularTotal ? dailyPrice * hours : regularTotal
      const usedDailyPrice = dailyPrice && dailyPrice * hours < regularTotal
      
      const girlIncome = calculateCommission(finalTotal, girl.commissionType, girl.commissionValue, hours)
      const serviceCommission = calculateCommission(finalTotal, store.serviceCommissionType, store.serviceCommissionValue, hours)
      
      return c.json({
        success: true,
        data: {
          basePrice: usedDailyPrice ? dailyPrice : regularPrice,
          hours,
          totalOriginalAmount: finalTotal,
          discountType: usedDailyPrice ? 'dailyPrice' : 'none',
          discountPercent: 100,
          discountAmount: 0,
          finalPrice: finalTotal,
          deductedBalance: 0,
          girlIncome,
          serviceCommission,
          usedMemberDayBenefit: false,
          reason: usedDailyPrice ? '使用当日特惠价格' : '会员系统未启用',
          breakdown: Array.from({ length: hours }, (_, i) => ({
            hour: i + 1,
            originalPrice: usedDailyPrice ? dailyPrice : regularPrice,
            discountPercent: 100,
            finalPrice: usedDailyPrice ? dailyPrice : regularPrice,
            type: usedDailyPrice ? 'dailyPrice' : 'none',
          })),
        }
      })
    }

    // 获取会员等级
    const levels = await db.select().from(memberLevels).where(eq(memberLevels.storeId, storeId)).all()
    
    // 确定顾客会员等级
    const customerLevel = customer.memberLevel || 0
    const levelConfig = levels.find(l => l.level === customerLevel)
    
    // 如果不是会员，比较当日价格和常规价格
    if (!levelConfig || customerLevel === 0) {
      const regularTotal = regularPrice * hours
      const finalTotal = dailyPrice && dailyPrice * hours < regularTotal ? dailyPrice * hours : regularTotal
      const usedDailyPrice = dailyPrice && dailyPrice * hours < regularTotal
      
      const girlIncome = calculateCommission(finalTotal, girl.commissionType, girl.commissionValue, hours)
      const serviceCommission = calculateCommission(finalTotal, store.serviceCommissionType, store.serviceCommissionValue, hours)
      
      return c.json({
        success: true,
        data: {
          basePrice: usedDailyPrice ? dailyPrice : regularPrice,
          hours,
          totalOriginalAmount: finalTotal,
          discountType: usedDailyPrice ? 'dailyPrice' : 'none',
          discountPercent: 100,
          discountAmount: 0,
          finalPrice: finalTotal,
          deductedBalance: 0,
          girlIncome,
          serviceCommission,
          usedMemberDayBenefit: false,
          reason: usedDailyPrice ? '使用当日特惠价格' : '非会员用户',
          breakdown: Array.from({ length: hours }, (_, i) => ({
            hour: i + 1,
            originalPrice: usedDailyPrice ? dailyPrice : regularPrice,
            discountPercent: 100,
            finalPrice: usedDailyPrice ? dailyPrice : regularPrice,
            type: usedDailyPrice ? 'dailyPrice' : 'none',
          })),
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
    
    // 应用前提价到常规价格
    const priceWithMarkup = regularPrice + (memberConfig.priceMarkup || 0)
    
    // 计算每个钟的价格明细（会员折扣后）
    const memberBreakdown = []
    let memberTotalPrice = 0
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
      
      memberBreakdown.push({
        hour,
        originalPrice: priceWithMarkup,
        discountPercent: hourDiscountPercent,
        finalPrice: hourFinalPrice,
        type: hourType,
      })
      
      memberTotalPrice += hourFinalPrice
      if (isFirstHourMemberDay) usedMemberDayBenefit = true
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
    
    const originalTotal = useDailyPrice ? dailyTotalPrice : priceWithMarkup * hours
    const discountAmount = useDailyPrice ? 0 : Math.round((priceWithMarkup * hours - memberTotalPrice) * 100) / 100
    
    // 计算平均折扣率
    const avgDiscountPercent = useDailyPrice ? 100 : (priceWithMarkup * hours > 0 
      ? Math.round((memberTotalPrice / (priceWithMarkup * hours)) * 100)
      : 100)
    
    // 计算余额抵扣
    const customerBalance = (customer.balance || 0) / 100 // 转换为元
    const minBalancePercent = memberConfig.minBalancePercent || 50
    const minRequiredBalance = finalTotalPrice * minBalancePercent / 100
    
    let deductedBalance = 0
    let finalPrice = finalTotalPrice
    
    if (customerBalance >= minRequiredBalance) {
      // 可以全额使用余额抵扣
      deductedBalance = Math.min(customerBalance, finalTotalPrice)
      finalPrice = Math.max(0, finalTotalPrice - deductedBalance)
    }

    // 计算提成（基于最终支付价格和小时数）
    const girlIncome = calculateCommission(finalPrice, girl.commissionType, girl.commissionValue, hours)
    const serviceCommission = calculateCommission(finalPrice, store.serviceCommissionType, store.serviceCommissionValue, hours)

    return c.json({
      success: true,
      data: {
        basePrice: useDailyPrice ? dailyPrice : regularPrice,
        hours,
        totalOriginalAmount: originalTotal,
        priceMarkup: useDailyPrice ? 0 : (memberConfig.priceMarkup || 0),
        discountType: useDailyPrice ? 'dailyPrice' : (usedMemberDayBenefit ? 'memberDay' : 'memberRegular'),
        discountPercent: avgDiscountPercent,
        discountAmount,
        finalPrice,
        deductedBalance: Math.round(deductedBalance * 100) / 100,
        girlIncome,
        serviceCommission,
        usedMemberDayBenefit: useDailyPrice ? false : usedMemberDayBenefit,
        reason: useDailyPrice 
          ? '使用当日特惠价格'
          : (usedMemberDayBenefit 
            ? `会员日特惠 ${levelConfig.name} 首钟${levelConfig.memberDayDiscount}折`
            : `会员折扣 ${levelConfig.name} ${levelConfig.regularDiscount}折`),
        breakdown: finalBreakdown,
      }
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return c.json({ success: false, error: error.message || 'Internal server error' }, 500)
  }
})

export default app
