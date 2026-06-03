import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, like, or, sql } from 'drizzle-orm'
import { customers, customerAccounts, customerTags, tags, orders } from '../db/schema'
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
      const accountList = await db.select().from(customerAccounts)
        .where(eq(customerAccounts.customerId, customer.id))
        .all()

      const customerTagList = await db.select({ tagId: customerTags.tagId })
        .from(customerTags)
        .where(eq(customerTags.customerId, customer.id))
        .all()

      // 将 account 字段映射为 accountId
      const accounts = accountList.map(acc => ({
        ...acc,
        accountId: acc.account,
      }))

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
  const now = Date.now()

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

  // 获取创建的账号
  const accountList = await db.select().from(customerAccounts)
    .where(eq(customerAccounts.customerId, id))
    .all()

  const accounts = accountList.map(acc => ({
    ...acc,
    accountId: acc.account,
  }))

  return c.json({ success: true, data: { id, accounts } }, 201)
})

// PUT /api/customers?id=xxx
app.put('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  const body = await c.req.json()
  const now = Date.now()

  // 更新顾客基本信息
  await db.update(customers)
    .set({ nickname: body.name, updatedAt: now })
    .where(eq(customers.id, id))

  // 获取现有账号，避免删除被订单引用的账号
  const existingAccounts = await db.select().from(customerAccounts)
    .where(eq(customerAccounts.customerId, id))
    .all()

  // 智能同步账号：更新现有、添加新、删除未被引用的
  if (body.accounts) {
    const newAccountIds = new Set<string>()
    
    for (const acc of body.accounts) {
      if (acc.id) {
        // 更新现有账号
        await db.update(customerAccounts)
          .set({
            platform: acc.platform as 'wechat' | 'telegram',
            account: acc.accountId,
          })
          .where(eq(customerAccounts.id, acc.id))
        newAccountIds.add(acc.id)
      } else {
        // 创建新账号
        const result = await db.insert(customerAccounts).values({
          id: crypto.randomUUID(),
          customerId: id,
          platform: acc.platform as 'wechat' | 'telegram',
          account: acc.accountId,
          createdAt: now,
        }).returning({ id: customerAccounts.id })
        if (result[0]) newAccountIds.add(result[0].id)
      }
    }

    // 只删除那些不在新列表中的旧账号
    for (const oldAcc of existingAccounts) {
      if (!newAccountIds.has(oldAcc.id)) {
        await db.delete(customerAccounts).where(eq(customerAccounts.id, oldAcc.id))
      }
    }
  }

  // 删除旧标签关联，插入新标签关联
  await db.delete(customerTags).where(eq(customerTags.customerId, id))
  if (body.tagIds && body.tagIds.length > 0) {
    for (const tagId of body.tagIds) {
      await db.insert(customerTags).values({
        customerId: id,
        tagId,
      })
    }
  }

  return c.json({ success: true })
})

// DELETE /api/customers?id=xxx
app.delete('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  // 检查是否有历史订单，如果有则不允许删除
  const orderCount = await db.select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(eq(orders.customerId, id))
    .get()

  if (orderCount && orderCount.count > 0) {
    return c.json({ success: false, error: '该顾客有历史订单，无法删除' }, 400)
  }

  // 先删除关联数据
  await db.delete(customerAccounts).where(eq(customerAccounts.customerId, id))
  await db.delete(customerTags).where(eq(customerTags.customerId, id))
  await db.delete(customers).where(eq(customers.id, id))
  return c.json({ success: true })
})

export default app
