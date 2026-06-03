import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, like, or } from 'drizzle-orm'
import { customers, customerAccounts, customerTags, tags } from '../db/schema'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// GET /api/customers?storeId=xxx&search=xxx
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = c.req.query('storeId')
  const search = c.req.query('search')

  if (!storeId) return c.json({ success: false, error: 'Missing storeId' }, 400)

  let query = db.select().from(customers).where(eq(customers.storeId, storeId)) as any

  if (search) {
    const searchTerm = `%${search}%`
    const matchedAccounts = await db.select({ customerId: customerAccounts.customerId })
      .from(customerAccounts)
      .where(like(customerAccounts.account, searchTerm))
      .all()

    const customerIds = matchedAccounts.map(a => a.customerId)

    if (customerIds.length > 0) {
      query = db.select().from(customers).where(
        and(
          eq(customers.storeId, storeId),
          or(
            like(customers.nickname || '', searchTerm),
            ...customerIds.map(id => eq(customers.id, id))
          )
        )
      ) as any
    } else {
      query = db.select().from(customers).where(
        and(eq(customers.storeId, storeId), like(customers.nickname || '', searchTerm))
      ) as any
    }
  }

  const allCustomers = await query.all()

  // 获取每个顾客的账号和标签
  const customersWithDetails = await Promise.all(
    allCustomers.map(async (customer: any) => {
      const accounts = await db.select().from(customerAccounts)
        .where(eq(customerAccounts.customerId, customer.id))
        .all()

      const customerTagList = await db.select({ tagId: customerTags.tagId })
        .from(customerTags)
        .where(eq(customerTags.customerId, customer.id))
        .all()

      return {
        ...customer,
        name: customer.nickname,
        accounts,
        tagIds: customerTagList.map(t => t.tagId),
      }
    })
  )

  return c.json({ success: true, data: customersWithDetails })
})

// POST /api/customers
app.post('/', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  const id = crypto.randomUUID()
  const now = new Date()

  await db.insert(customers).values({
    id,
    storeId: body.storeId,
    nickname: body.name || null,
    remark: null,
    createdAt: now,
    updatedAt: now,
  })

  // 插入账号
  if (body.accounts && body.accounts.length > 0) {
    for (const acc of body.accounts) {
      await db.insert(customerAccounts).values({
        id: crypto.randomUUID(),
        customerId: id,
        platform: acc.platform as 'wechat' | 'telegram',
        account: acc.accountId,
        createdAt: now,
      })
    }
  }

  // 插入标签关联
  if (body.tagIds && body.tagIds.length > 0) {
    for (const tagId of body.tagIds) {
      await db.insert(customerTags).values({
        customerId: id,
        tagId,
      })
    }
  }

  return c.json({ success: true, data: { id } }, 201)
})

// PUT /api/customers?id=xxx
app.put('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  const body = await c.req.json()
  await db.update(customers)
    .set({ nickname: body.name, updatedAt: new Date() })
    .where(eq(customers.id, id))

  return c.json({ success: true })
})

// DELETE /api/customers?id=xxx
app.delete('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  await db.delete(customers).where(eq(customers.id, id))
  return c.json({ success: true })
})

export default app
