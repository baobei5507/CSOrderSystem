import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc } from 'drizzle-orm'
import { customers, balanceTransactions, rechargeRecords, memberDayUsage, memberLevels } from '../db/schema'

const app = new Hono<{ Bindings: { DB: D1Database } }>()

// 根据数据库配置的会员等级计算等级
async function calculateMemberLevel(db: any, storeId: string, totalRecharge: number): Promise<number> {
  const levels = await db.select().from(memberLevels)
    .where(eq(memberLevels.storeId, storeId))
    .all()
  
  if (levels.length === 0) {
    // 没有配置等级时，使用默认阈值（分）
    if (totalRecharge >= 2000000) return 5
    if (totalRecharge >= 1000000) return 4
    if (totalRecharge >= 700000) return 3
    if (totalRecharge >= 500000) return 2
    if (totalRecharge >= 300000) return 1
    return 0
  }

  // 按 level 降序排列，找到第一个满足条件的
  const sortedLevels = levels.sort((a: any, b: any) => b.level - a.level)
  for (const lvl of sortedLevels) {
    if (totalRecharge >= lvl.minRecharge) {
      return lvl.level
    }
  }
  return 0
}

// POST /api/recharge - 充值
app.post('/', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  const now = Date.now()
  
  const { customerId, storeId, amount, giftAmount = 0, remark = '' } = body
  
  if (!customerId || !storeId || !amount) {
    return c.json({ success: false, error: 'Missing required fields' }, 400)
  }
  
  try {
    // 获取顾客当前信息
    const customer = await db.select().from(customers)
      .where(eq(customers.id, customerId))
      .get()
    
    if (!customer) {
      return c.json({ success: false, error: 'Customer not found' }, 404)
    }
    
    const beforeLevel = customer.memberLevel || 0
    const beforeBalance = customer.balance || 0
    const beforeTotalRecharge = customer.totalRecharge || 0
    
    // 计算新等级
    const newTotalRecharge = beforeTotalRecharge + amount
    const afterLevel = await calculateMemberLevel(db, body.storeId, newTotalRecharge)
    
    // 计算新余额
    const totalAdd = amount + giftAmount
    const afterBalance = beforeBalance + totalAdd
    
    // 更新顾客信息
    await db.update(customers)
      .set({
        balance: afterBalance,
        totalRecharge: newTotalRecharge,
        memberLevel: afterLevel,
        updatedAt: now,
      })
      .where(eq(customers.id, customerId))
    
    // 创建充值记录
    const rechargeId = crypto.randomUUID()
    await db.insert(rechargeRecords).values({
      id: rechargeId,
      customerId,
      storeId,
      amount,
      giftAmount,
      beforeLevel,
      afterLevel,
      remark,
      createdAt: now,
    })
    
    // 创建余额流水
    await db.insert(balanceTransactions).values({
      id: crypto.randomUUID(),
      customerId,
      type: 'recharge',
      amount: totalAdd,
      balanceBefore: beforeBalance,
      balanceAfter: afterBalance,
      remark: `充值¥${(amount/100).toFixed(2)}${giftAmount > 0 ? `,赠送¥${(giftAmount/100).toFixed(2)}` : ''}`,
      createdAt: now,
    })
    
    return c.json({
      success: true,
      data: {
        rechargeId,
        beforeLevel,
        afterLevel,
        beforeBalance,
        afterBalance,
        addedAmount: totalAdd,
      }
    }, 201)
  } catch (err) {
    console.error('Recharge error:', err)
    return c.json({ success: false, error: 'Database error' }, 500)
  }
})

// GET /api/recharge/history?customerId=xxx
app.get('/history', async (c) => {
  const db = drizzle(c.env.DB)
  const customerId = c.req.query('customerId')
  
  if (!customerId) {
    return c.json({ success: false, error: 'Missing customerId' }, 400)
  }
  
  try {
    const records = await db.select().from(rechargeRecords)
      .where(eq(rechargeRecords.customerId, customerId))
      .orderBy(desc(rechargeRecords.createdAt))
      .all()
    
    return c.json({ success: true, data: records })
  } catch (err) {
    console.error('Get recharge history error:', err)
    return c.json({ success: false, error: 'Database error' }, 500)
  }
})

// GET /api/balance/transactions?customerId=xxx
app.get('/transactions', async (c) => {
  const db = drizzle(c.env.DB)
  const customerId = c.req.query('customerId')
  
  if (!customerId) {
    return c.json({ success: false, error: 'Missing customerId' }, 400)
  }
  
  try {
    const transactions = await db.select().from(balanceTransactions)
      .where(eq(balanceTransactions.customerId, customerId))
      .orderBy(desc(balanceTransactions.createdAt))
      .all()
    
    return c.json({ success: true, data: transactions })
  } catch (err) {
    console.error('Get balance transactions error:', err)
    return c.json({ success: false, error: 'Database error' }, 500)
  }
})

// GET /api/member-day/check?customerId=xxx&storeId=xxx&date=YYYY-MM-DD
app.get('/member-day/check', async (c) => {
  const db = drizzle(c.env.DB)
  const { customerId, storeId, date } = c.req.query()
  
  if (!customerId || !storeId || !date) {
    return c.json({ success: false, error: 'Missing parameters' }, 400)
  }
  
  try {
    const usage = await db.select().from(memberDayUsage)
      .where(and(
        eq(memberDayUsage.customerId, customerId),
        eq(memberDayUsage.storeId, storeId),
        eq(memberDayUsage.date, date)
      ))
      .get()
    
    return c.json({
      success: true,
      data: {
        hasUsed: !!usage,
        usedCount: usage?.usedCount || 0,
      }
    })
  } catch (err) {
    console.error('Check member day error:', err)
    return c.json({ success: false, error: 'Database error' }, 500)
  }
})

export default app
