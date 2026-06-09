import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { storeMemberConfigs, memberLevels } from '../db/schema'

const app = new Hono<{ Bindings: { DB: D1Database } }>()

// 默认会员等级
const defaultLevels = [
  { level: 1, name: '3K会员', minRecharge: 300000, regularDiscount: 95, memberDayDiscount: 85 },
  { level: 2, name: '5K会员', minRecharge: 500000, regularDiscount: 90, memberDayDiscount: 80 },
  { level: 3, name: '7K会员', minRecharge: 700000, regularDiscount: 88, memberDayDiscount: 75 },
  { level: 4, name: '1w会员', minRecharge: 1000000, regularDiscount: 85, memberDayDiscount: 70 },
  { level: 5, name: '2w会员', minRecharge: 2000000, regularDiscount: 83, memberDayDiscount: 65 },
]

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
    
    // 获取会员等级
    const levels = await db.select().from(memberLevels)
      .where(eq(memberLevels.storeId, storeId))
      .all()
    
    if (!config) {
      // 返回默认配置
      return c.json({
        success: true,
        data: {
          enabled: false,
          levels: levels.length > 0 ? levels : defaultLevels,
          memberDays: [1, 2], // 周一、周二
          minBalancePercent: 50,
          priceMarkup: 0,
        }
      })
    }
    
    return c.json({
      success: true,
      data: {
        ...config,
        levels: levels.length > 0 ? levels : defaultLevels,
        memberDays: config.memberDays ? config.memberDays.split(',').map(d => parseInt(d)).filter(d => !isNaN(d)) : [1, 2],
        priceMarkup: config.priceMarkup || 0,
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
      // 更新配置
      await db.update(storeMemberConfigs)
        .set({
          memberDays: body.memberDays ? body.memberDays.join(',') : existing.memberDays,
          minBalancePercent: body.minBalancePercent !== undefined ? body.minBalancePercent : existing.minBalancePercent,
          priceMarkup: body.priceMarkup !== undefined ? body.priceMarkup : existing.priceMarkup,
          enabled: body.enabled !== undefined ? (body.enabled ? 1 : 0) : existing.enabled,
          updatedAt: now,
        })
        .where(eq(storeMemberConfigs.storeId, body.storeId))
    } else {
      // 创建配置
      await db.insert(storeMemberConfigs).values({
        id,
        storeId: body.storeId,
        memberDays: body.memberDays ? body.memberDays.join(',') : '1,2',
        minBalancePercent: body.minBalancePercent !== undefined ? body.minBalancePercent : 50,
        priceMarkup: body.priceMarkup !== undefined ? body.priceMarkup : 0,
        enabled: body.enabled !== undefined ? (body.enabled ? 1 : 0) : 0,
        createdAt: now,
        updatedAt: now,
      })
    }
    
    // 保存会员等级（先删除旧等级，再插入新等级）
    if (body.levels && body.levels.length > 0) {
      // 删除旧等级
      await db.delete(memberLevels)
        .where(eq(memberLevels.storeId, body.storeId))
      
      // 插入新等级
      for (const level of body.levels) {
        await db.insert(memberLevels).values({
          id: crypto.randomUUID(),
          storeId: body.storeId,
          level: level.level,
          name: level.name,
          minRecharge: level.minRecharge,
          regularDiscount: level.regularDiscount,
          memberDayDiscount: level.memberDayDiscount,
          createdAt: now,
          updatedAt: now,
        })
      }
    }
    
    return c.json({ success: true, data: { id } }, 201)
  } catch (err) {
    console.error('Save member config error:', err)
    return c.json({ success: false, error: 'Database error' }, 500)
  }
})

export default app
