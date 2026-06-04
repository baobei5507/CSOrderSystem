import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { storeMemberConfigs } from '../db/schema'

const app = new Hono<{ Bindings: { DB: D1Database } }>()

// GET /api/member-config?storeId=xxx
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = c.req.query('storeId')
  
  if (!storeId) {
    return c.json({ success: false, error: 'Missing storeId' }, 400)
  }
  
  try {
    const config = await db.select().from(storeMemberConfigs)
      .where(eq(storeMemberConfigs.storeId, storeId))
      .get()
    
    if (!config) {
      // 返回默认配置
      return c.json({
        success: true,
        data: {
          enabled: false,
          levels: [
            { level: 1, name: '3K会员', minRecharge: 300000, regularDiscount: 95, memberDayDiscount: 85 },
            { level: 2, name: '5K会员', minRecharge: 500000, regularDiscount: 90, memberDayDiscount: 80 },
            { level: 3, name: '7K会员', minRecharge: 700000, regularDiscount: 88, memberDayDiscount: 75 },
            { level: 4, name: '1w会员', minRecharge: 1000000, regularDiscount: 85, memberDayDiscount: 70 },
            { level: 5, name: '2w会员', minRecharge: 2000000, regularDiscount: 83, memberDayDiscount: 65 },
          ],
          memberDays: [1, 2], // 周一、周二
          minBalancePercent: 50,
        }
      })
    }
    
    return c.json({
      success: true,
      data: {
        ...config,
        levels: JSON.parse(config.levels),
        memberDays: JSON.parse(config.memberDays),
      }
    })
  } catch (err) {
    console.error('Get member config error:', err)
    return c.json({ success: false, error: 'Database error' }, 500)
  }
})

// POST /api/member-config
app.post('/', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  const now = Date.now()
  const id = crypto.randomUUID()
  
  try {
    // 检查是否已存在
    const existing = await db.select().from(storeMemberConfigs)
      .where(eq(storeMemberConfigs.storeId, body.storeId))
      .get()
    
    if (existing) {
      // 更新
      await db.update(storeMemberConfigs)
        .set({
          levels: JSON.stringify(body.levels),
          memberDays: JSON.stringify(body.memberDays),
          minBalancePercent: body.minBalancePercent || 50,
          enabled: body.enabled ? 1 : 0,
          updatedAt: now,
        })
        .where(eq(storeMemberConfigs.storeId, body.storeId))
    } else {
      // 创建
      await db.insert(storeMemberConfigs).values({
        id,
        storeId: body.storeId,
        levels: JSON.stringify(body.levels),
        memberDays: JSON.stringify(body.memberDays),
        minBalancePercent: body.minBalancePercent || 50,
        enabled: body.enabled ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      })
    }
    
    return c.json({ success: true, data: { id } }, 201)
  } catch (err) {
    console.error('Save member config error:', err)
    return c.json({ success: false, error: 'Database error' }, 500)
  }
})

export default app
