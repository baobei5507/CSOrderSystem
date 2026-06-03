import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, sql } from 'drizzle-orm'
import { tags, customerTags, customers, orders } from '../db/schema'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// GET /api/tags/stats?storeId=xxx - 标签统计列表（必须在 / 之前）
app.get('/stats', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = c.req.query('storeId')
  if (!storeId) return c.json({ success: false, error: 'Missing storeId' }, 400)

  try {
    const tagStats = await db.select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
      customerCount: sql<number>`COUNT(${customerTags.customerId})`,
    })
      .from(tags)
      .leftJoin(customerTags, eq(tags.id, customerTags.tagId))
      .where(eq(tags.storeId, storeId))
      .groupBy(tags.id)
      .orderBy(sql`COUNT(${customerTags.customerId}) DESC`)
      .all()

    return c.json({ 
      success: true, 
      data: tagStats.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        createdAt: t.createdAt,
        customerCount: t.customerCount || 0,
      }))
    })
  } catch (err) {
    console.error('Tag stats error:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// GET /api/tags?storeId=xxx - 获取所有标签
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = c.req.query('storeId')
  if (!storeId) return c.json({ success: false, error: 'Missing storeId' }, 400)

  const allTags = await db.select().from(tags).where(eq(tags.storeId, storeId)).all()
  return c.json({ success: true, data: allTags })
})

// GET /api/tags/detail?id=xxx - 单个标签详情（包含关联顾客）
app.get('/detail', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  try {
    // 获取标签信息
    const tagInfo = await db.select().from(tags).where(eq(tags.id, id)).get()
    if (!tagInfo) return c.json({ success: false, error: 'Tag not found' }, 404)

    // 获取关联的顾客
    const customerList = await db.select({
      customerId: customerTags.customerId,
    })
      .from(customerTags)
      .where(eq(customerTags.tagId, id))
      .all()

    const customerIds = customerList.map(c => c.customerId)
    
    // 获取顾客详情和订单统计
    const customerDetails = []
    for (const customerId of customerIds) {
      const customer = await db.select().from(customers).where(eq(customers.id, customerId)).get()
      if (customer) {
        const customerOrders = await db.select()
          .from(orders)
          .where(eq(orders.customerId, customerId))
          .all()
        
        const completedOrders = customerOrders.filter(o => o.status === 'completed')
        const totalSpent = completedOrders.reduce((sum, o) => sum + (o.price || 0), 0)
        
        customerDetails.push({
          id: customer.id,
          nickname: customer.nickname,
          phone: customer.phone,
          orderCount: customerOrders.length,
          totalSpent,
        })
      }
    }

    // 按消费金额排序
    customerDetails.sort((a, b) => b.totalSpent - a.totalSpent)

    return c.json({
      success: true,
      data: {
        tag: {
          id: tagInfo.id,
          name: tagInfo.name,
          color: tagInfo.color,
          customerCount: customerDetails.length,
        },
        customers: customerDetails,
      },
    })
  } catch (err) {
    console.error('Tag detail error:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

// POST /api/tags
app.post('/', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  const id = crypto.randomUUID()
  const now = Date.now()

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
