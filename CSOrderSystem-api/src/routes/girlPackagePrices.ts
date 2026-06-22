import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { girlPackagePrices, packages, girls } from '../db/schema'
import type { Env } from '../index'
import { getStoreId } from './auth'

const app = new Hono<{ Bindings: Env }>()

// GET /api/girl-package-prices?girlId=xxx
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const girlId = c.req.query('girlId')
  if (!girlId) return c.json({ success: false, error: 'Missing girlId' }, 400)

  const storeId = getStoreId(c)
  // 验证 girlId 属于当前用户的店铺
  if (storeId) {
    const girl = await db.select().from(girls).where(eq(girls.id, girlId)).get()
    if (!girl || girl.storeId !== storeId) return c.json({ success: false, error: 'No access' }, 403)
  }

  const prices = await db.select({
    price: girlPackagePrices.price,
    dailyPrice: girlPackagePrices.dailyPrice,
    packageId: girlPackagePrices.packageId,
    packageName: packages.name,
    packageCode: packages.code,
  })
    .from(girlPackagePrices)
    .innerJoin(packages, eq(girlPackagePrices.packageId, packages.id))
    .where(eq(girlPackagePrices.girlId, girlId))
    .all()

  return c.json({ success: true, data: prices })
})

// POST /api/girl-package-prices
app.post('/', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  const { girlId, packageId, price, dailyPrice } = body
  const storeId = getStoreId(c, body.storeId)
  if (!storeId) return c.json({ success: false, error: 'No store access' }, 403)

  if (!girlId || !packageId || price === undefined) {
    return c.json({ success: false, error: 'Missing required fields' }, 400)
  }

  // 检查是否已存在
  const existing = await db.select()
    .from(girlPackagePrices)
    .where(and(
      eq(girlPackagePrices.girlId, girlId),
      eq(girlPackagePrices.packageId, packageId)
    ))
    .get()

  const now = Date.now()
  if (existing) {
    // 更新价格
    await db.update(girlPackagePrices)
      .set({ price, dailyPrice, updatedAt: now })
      .where(and(
        eq(girlPackagePrices.girlId, girlId),
        eq(girlPackagePrices.packageId, packageId)
      ))
  } else {
    // 新建
    await db.insert(girlPackagePrices).values({
      id: crypto.randomUUID(),
      storeId,
      girlId,
      packageId,
      price,
      dailyPrice,
      createdAt: now,
      updatedAt: now,
    })
  }

  return c.json({ success: true }, 201)
})

// DELETE /api/girl-package-prices?girlId=xxx&packageId=xxx
app.delete('/', async (c) => {
  const db = drizzle(c.env.DB)
  const girlId = c.req.query('girlId')
  const packageId = c.req.query('packageId')

  if (!girlId || !packageId) {
    return c.json({ success: false, error: 'Missing girlId or packageId' }, 400)
  }

  const storeId = getStoreId(c)
  if (storeId) {
    const girl = await db.select().from(girls).where(eq(girls.id, girlId)).get()
    if (!girl || girl.storeId !== storeId) return c.json({ success: false, error: 'No access' }, 403)
  }

  await db.delete(girlPackagePrices)
    .where(and(
      eq(girlPackagePrices.girlId, girlId),
      eq(girlPackagePrices.packageId, packageId)
    ))

  return c.json({ success: true })
})

export default app
