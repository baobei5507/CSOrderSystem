import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, sql } from 'drizzle-orm'
import { girls, orders } from '../db/schema'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// GET /api/girls?storeId=xxx
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = c.req.query('storeId')
  if (!storeId) return c.json({ success: false, error: 'Missing storeId' }, 400)

  const allGirls = await db.select().from(girls).where(eq(girls.storeId, storeId)).all()
  return c.json({ success: true, data: allGirls })
})

// POST /api/girls
app.post('/', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()

  // 检查同店同名
  const existing = await db.select().from(girls)
    .where(and(eq(girls.storeId, body.storeId), eq(girls.name, body.name)))
    .get()

  if (existing) {
    return c.json({ success: false, error: '该店家下已存在同名妹妹' }, 400)
  }

  const id = crypto.randomUUID()
  const now = new Date()

  await db.insert(girls).values({
    id,
    storeId: body.storeId,
    name: body.name,
    status: body.status || 'active',
    commissionType: body.commissionType,
    commissionValue: body.commissionValue,
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
  await db.update(girls)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(girls.id, id))

  return c.json({ success: true })
})

// DELETE /api/girls?id=xxx
app.delete('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  // 检查是否有历史订单，如果有则不允许删除（改为离职状态）
  const orderCount = await db.select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(eq(orders.girlId, id))
    .get()

  if (orderCount && orderCount.count > 0) {
    // 有历史订单，改为离职状态而不是删除
    await db.update(girls)
      .set({ status: 'left', updatedAt: new Date() })
      .where(eq(girls.id, id))
    return c.json({ success: true, message: '该妹妹有历史订单，已标记为离职状态' })
  }

  await db.delete(girls).where(eq(girls.id, id))
  return c.json({ success: true })
})

export default app
