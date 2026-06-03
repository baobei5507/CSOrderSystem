import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { stores } from '../db/schema'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// GET /api/stores
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
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
  const now = new Date()
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
  await db.update(stores)
    .set({ ...body, updatedAt: new Date() })
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
