import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, sql } from 'drizzle-orm'
import { packages, orders } from '../db/schema'
import type { Env } from '../index'
import { getStoreId } from './auth'

const app = new Hono<{ Bindings: Env }>()

// GET /api/packages?storeId=xxx
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = getStoreId(c)
  if (!storeId) return c.json({ success: false, error: 'No store access' }, 403)

  const allPackages = await db.select().from(packages).where(eq(packages.storeId, storeId)).all()
  return c.json({ success: true, data: allPackages })
})

// POST /api/packages
app.post('/', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  const storeId = getStoreId(c, body.storeId)
  if (!storeId) return c.json({ success: false, error: 'No store access' }, 403)

  // 检查同店同编码
  const existing = await db.select().from(packages)
    .where(and(eq(packages.storeId, storeId), eq(packages.code, body.code)))
    .get()

  if (existing) {
    return c.json({ success: false, error: '该店家下已存在相同套餐编码' }, 400)
  }

  const id = crypto.randomUUID()
  const now = Date.now()

  await db.insert(packages).values({
    id,
    storeId,
    code: body.code,
    name: body.name,
    basePrice: body.basePrice || 0,
    status: body.status || 'active',
    createdAt: now,
    updatedAt: now,
  })

  const pkg = await db.select().from(packages).where(eq(packages.id, id)).get()
  return c.json({ success: true, data: pkg }, 201)
})

// PUT /api/packages?id=xxx
app.put('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  const storeId = getStoreId(c)
  const existing = await db.select().from(packages).where(eq(packages.id, id)).get()
  if (!existing) return c.json({ success: false, error: 'Not found' }, 404)
  if (storeId && existing.storeId !== storeId) return c.json({ success: false, error: 'No access' }, 403)

  const body = await c.req.json()
  const updateData = { ...body }
  if (body.createdAt) delete updateData.createdAt
  if (body.updatedAt) delete updateData.updatedAt
  await db.update(packages)
    .set({ ...updateData, updatedAt: Date.now() })
    .where(eq(packages.id, id))

  return c.json({ success: true })
})

// DELETE /api/packages?id=xxx
app.delete('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  const storeId = getStoreId(c)
  const existing = await db.select().from(packages).where(eq(packages.id, id)).get()
  if (!existing) return c.json({ success: false, error: 'Not found' }, 404)
  if (storeId && existing.storeId !== storeId) return c.json({ success: false, error: 'No access' }, 403)

  // 检查是否有历史订单，如果有则不允许删除（改为停用状态）
  const orderCount = await db.select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(eq(orders.packageId, id))
    .get()

  if (orderCount && orderCount.count > 0) {
    // 有历史订单，改为停用状态而不是删除
    await db.update(packages)
      .set({ status: 'inactive', updatedAt: Date.now() })
      .where(eq(packages.id, id))
    return c.json({ success: true, message: '该套餐有历史订单，已标记为停用状态' })
  }

  await db.delete(packages).where(eq(packages.id, id))
  return c.json({ success: true })
})

export default app
