import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { tags, customerTags } from '../db/schema'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// GET /api/tags?storeId=xxx
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = c.req.query('storeId')
  if (!storeId) return c.json({ success: false, error: 'Missing storeId' }, 400)

  const allTags = await db.select().from(tags).where(eq(tags.storeId, storeId)).all()
  return c.json({ success: true, data: allTags })
})

// POST /api/tags
app.post('/', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  const id = crypto.randomUUID()
  const now = new Date()

  await db.insert(tags).values({
    id,
    storeId: body.storeId,
    name: body.name,
    color: body.color,
    createdAt: now,
  })

  return c.json({ success: true, data: { id, name: body.name, color: body.color, storeId: body.storeId, createdAt: now } }, 201)
})

// PUT /api/tags?id=xxx
app.put('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  const body = await c.req.json()
  await db.update(tags)
    .set(body)
    .where(eq(tags.id, id))

  return c.json({ success: true })
})

// DELETE /api/tags?id=xxx
app.delete('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  // 先删除顾客标签关联
  await db.delete(customerTags).where(eq(customerTags.tagId, id))
  await db.delete(tags).where(eq(tags.id, id))
  return c.json({ success: true })
})

export default app
