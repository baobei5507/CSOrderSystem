import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, sql } from 'drizzle-orm'
import { girls, orders } from '../db/schema'
import type { Env } from '../index'
import { getStoreId } from './auth'

const app = new Hono<{ Bindings: Env }>()

// GET /api/girls?storeId=xxx
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = getStoreId(c)
  if (!storeId) return c.json({ success: false, error: 'No store access' }, 403)

  const allGirls = await db.select().from(girls).where(eq(girls.storeId, storeId)).all()
  return c.json({ success: true, data: allGirls })
})

// POST /api/girls
app.post('/', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  const storeId = getStoreId(c, body.storeId)
  if (!storeId) return c.json({ success: false, error: 'No store access' }, 403)

  // 检查同店同名
  const existing = await db.select().from(girls)
    .where(and(eq(girls.storeId, storeId), eq(girls.name, body.name)))
    .get()

  if (existing) {
    return c.json({ success: false, error: '该店家下已存在同名妹妹' }, 400)
  }

  const id = crypto.randomUUID()
  const now = Date.now()

  await db.insert(girls).values({
    id,
    storeId,
    name: body.name,
    status: body.status || 'active',
    commissionType: body.commissionType,
    commissionValue: body.commissionValue,
    excludeFromDiscount: body.excludeFromDiscount ? 1 : 0,
    trialPrice: body.trialPrice || null,
    createdAt: now,
    updatedAt: now,
  })

  return c.json({ success: true, data: { id } }, 201)
})

// PUT /api/girls?id=xxx
app.put('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  const body = await c.req.json()
  const storeId = getStoreId(c)
  
  // 验证操作对象属于当前用户的店铺
  const existing = await db.select().from(girls).where(eq(girls.id, id)).get()
  if (!existing) return c.json({ success: false, error: 'Not found' }, 404)
  if (storeId && existing.storeId !== storeId) return c.json({ success: false, error: 'No access' }, 403)

  const updateData: Record<string, any> = {}
  // 白名单字段，防止注入无关字段
  const allowedFields = ['name', 'status', 'commissionType', 'commissionValue', 'excludeFromDiscount', 'trialPrice']
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      if (key === 'excludeFromDiscount') {
        updateData[key] = body[key] ? 1 : 0
      } else if (key === 'trialPrice') {
        updateData[key] = body[key] || null
      } else {
        updateData[key] = body[key]
      }
    }
  }
  updateData.updatedAt = Date.now()
  await db.update(girls)
    .set(updateData)
    .where(eq(girls.id, id))

  return c.json({ success: true })
})

// DELETE /api/girls?id=xxx
app.delete('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  const storeId = getStoreId(c)
  // 验证操作对象属于当前用户的店铺
  const existing = await db.select().from(girls).where(eq(girls.id, id)).get()
  if (!existing) return c.json({ success: false, error: 'Not found' }, 404)
  if (storeId && existing.storeId !== storeId) return c.json({ success: false, error: 'No access' }, 403)

  // 检查是否有历史订单，如果有则不允许删除（改为离职状态）
  const orderCount = await db.select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(eq(orders.girlId, id))
    .get()

  if (orderCount && orderCount.count > 0) {
    // 有历史订单，改为离职状态而不是删除
    await db.update(girls)
      .set({ status: 'left', updatedAt: Date.now() })
      .where(eq(girls.id, id))
    return c.json({ success: true, message: '该妹妹有历史订单，已标记为离职状态' })
  }

  await db.delete(girls).where(eq(girls.id, id))
  return c.json({ success: true })
})

export default app
