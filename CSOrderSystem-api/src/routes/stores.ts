import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { stores } from '../db/schema'
import type { Env } from '../index'
import { getStoreId } from './auth'

const app = new Hono<{ Bindings: Env }>()

// GET /api/stores
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const userStoreId = getStoreId(c)
  if (userStoreId) {
    // 非admin用户只能看自己的店铺
    const store = await db.select().from(stores).where(eq(stores.id, userStoreId)).all()
    return c.json({ success: true, data: store })
  }
  // admin可以看所有店铺
  const allStores = await db.select().from(stores).all()
  return c.json({ success: true, data: allStores })
})

// POST /api/stores
app.post('/', async (c) => {
  console.log('[API] Creating store...')
  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  console.log('[API] Parsed body:', body)
  
  const id = crypto.randomUUID()
  const now = Date.now()
  console.log('[API] Inserting store with id:', id, 'name:', body.name)

  try {
    await db.insert(stores).values({
      id,
      name: body.name,
      serviceCommissionType: body.serviceCommissionType || 'fixed',
      serviceCommissionValue: body.serviceCommissionValue || 10,
      createdAt: now,
      updatedAt: now,
    })
    console.log('[API] Store inserted successfully')

    const store = await db.select().from(stores).where(eq(stores.id, id)).get()
    console.log('[API] Retrieved store:', store)
    return c.json({ success: true, data: store }, 201)
  } catch (err) {
    console.error('[API] Error creating store:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// PUT /api/stores?id=xxx
app.put('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  const body = await c.req.json()
  const updateData = { ...body }
  if (body.createdAt) delete updateData.createdAt
  if (body.updatedAt) delete updateData.updatedAt
  await db.update(stores)
    .set({ ...updateData, updatedAt: Date.now() })
    .where(eq(stores.id, id))

  return c.json({ success: true })
})

// DELETE /api/stores?id=xxx
app.delete('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  await db.delete(stores).where(eq(stores.id, id))
  return c.json({ success: true })
})

export default app
