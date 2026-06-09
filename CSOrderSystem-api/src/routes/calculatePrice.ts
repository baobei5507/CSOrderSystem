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
  memberLevels
} from '../db/schema'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// 计算提成
function calculateCommission(price: number, type: 'percent' | 'fixed', value: number): number {
  if (type === 'percent') {
    return Math.round(price * value / 100 * 100) / 100
  }
  return value
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
      const girlIncome = calculateCommission(totalPrice, girl.commissionType, girl.commissionValue)
      const serviceCommission = calculateCommission(totalPrice, store.serviceCommissionType, store.serviceCommissionValue)
      
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
      const girlIncome = calculateCommission(totalPrice, girl.commissionType, girl.commissionValue)
      const serviceCommission = calculateCommission(totalPrice, store.serviceCommissionType, store.serviceCommissionValue)
      
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
      const girlIncome = calculateCommission(totalPrice, girl.commissionType, girl.commissionValue)
      const serviceCommission = calculateCommission(totalPrice, store.serviceCommissionType, store.serviceCommissionValue)
      
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
    
    // 确定折扣
    const discountPercent = isMemberDay ? levelConfig.memberDayDiscount : levelConfig.regularDiscount
    
    // 应用前提价
    const priceWithMarkup = basePrice + (memberConfig.priceMarkup || 0)
    
    // 计算折扣后价格
    const originalTotal = priceWithMarkup * hours
    const discountedTotal = Math.round(originalTotal * discountPercent / 100 * 100) / 100
    
    // 计算余额抵扣
    const customerBalance = (customer.balance || 0) / 100 // 转换为元
    const minBalancePercent = memberConfig.minBalancePercent || 50
    const minRequiredBalance = discountedTotal * minBalancePercent / 100
    
    let deductedBalance = 0
    let finalPrice = discountedTotal
    
    if (customerBalance >= minRequiredBalance) {
      // 可以全额使用余额抵扣
      deductedBalance = Math.min(customerBalance, discountedTotal)
      finalPrice = Math.max(0, discountedTotal - deductedBalance)
    }

    // 计算提成
    const girlIncome = calculateCommission(finalPrice, girl.commissionType, girl.commissionValue)
    const serviceCommission = calculateCommission(finalPrice, store.serviceCommissionType, store.serviceCommissionValue)

    return c.json({
      success: true,
      data: {
        basePrice,
        hours,
        totalOriginalAmount: originalTotal,
        priceMarkup: memberConfig.priceMarkup || 0,
        discountType: isMemberDay ? 'memberDay' : 'memberRegular',
        discountPercent,
        discountAmount: Math.round((originalTotal - discountedTotal) * 100) / 100,
        finalPrice,
        deductedBalance: Math.round(deductedBalance * 100) / 100,
        girlIncome,
        serviceCommission,
        usedMemberDayBenefit: isMemberDay,
        reason: isMemberDay 
          ? `会员日特惠 ${levelConfig.name} ${discountPercent}折`
          : `会员折扣 ${levelConfig.name} ${discountPercent}折`,
        breakdown: Array.from({ length: hours }, (_, i) => ({
          hour: i + 1,
          originalPrice: priceWithMarkup,
          discountPercent,
          finalPrice: Math.round(priceWithMarkup * discountPercent / 100 * 100) / 100,
          type: isMemberDay ? 'memberDay' : 'regular',
        })),
      }
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return c.json({ success: false, error: error.message || 'Internal server error' }, 500)
  }
})

export default app
