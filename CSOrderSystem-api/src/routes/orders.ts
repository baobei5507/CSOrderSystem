import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import {
  orders,
  orderSnapshots,
  customers,
  customerAccounts,
  girls,
  packages,
  stores,
} from '../db/schema'
import type { Env } from '../index'

// 计算提成
function calculateCommission(price: number, type: 'percent' | 'fixed', value: number): number {
  if (type === 'percent') {
    return Math.round(price * value / 100)
  }
  return value
}

// 生成订单号
function generateOrderNo(): string {
  const date = new Date()
  const prefix = date.getFullYear().toString().slice(2) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `O${prefix}${random}`
}

const app = new Hono<{ Bindings: Env }>()

// GET /api/orders?storeId=xxx
app.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const storeId = c.req.query('storeId')

  if (!storeId) return c.json({ success: false, error: 'Missing storeId' }, 400)

  const allOrders = await db.select().from(orders)
    .where(eq(orders.storeId, storeId))
    .all()

  return c.json({ success: true, data: allOrders })
})

// POST /api/orders
app.post('/', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()

  // 获取关联数据
  const customer = await db.select().from(customers).where(eq(customers.id, body.customerId)).get()
  const girl = await db.select().from(girls).where(eq(girls.id, body.girlId)).get()
  const pkg = await db.select().from(packages).where(eq(packages.id, body.packageId)).get()
  const store = await db.select().from(stores).where(eq(stores.id, body.storeId)).get()

  if (!customer || !girl || !pkg || !store) {
    return c.json({ success: false, error: '关联数据不存在' }, 400)
  }

  // 处理优惠券折扣
  const discount = body.discount || 0
  const finalPrice = Math.max(0, body.price - discount)

  // 自动计算提成（基于原价，不受优惠券影响）
  const girlIncome = calculateCommission(body.price, girl.commissionType, girl.commissionValue)
  const serviceCommission = calculateCommission(body.price, store.serviceCommissionType, store.serviceCommissionValue)

  const orderId = crypto.randomUUID()
  const orderNo = generateOrderNo()

  // 处理预约时间 - 转换为 Unix 时间戳数字
  let appointmentTimeValue = null
  if (body.appointmentTime && body.appointmentTime.trim() !== '') {
    const date = new Date(body.appointmentTime)
    if (!isNaN(date.getTime())) {
      appointmentTimeValue = date.getTime()
    }
  }

  const now = new Date()

  // 创建订单
  await db.insert(orders).values({
    id: orderId,
    orderNo,
    storeId: body.storeId,
    customerId: body.customerId,
    customerAccountId: body.customerAccountId || null,
    girlId: body.girlId,
    packageId: body.packageId,
    appointmentTime: appointmentTimeValue,
    price: body.price,
    discount: discount,
    finalPrice: finalPrice,
    status: 'pending',
    serviceStaffName: c.env.DEFAULT_SERVICE_STAFF,
    girlIncome,
    serviceCommission,
    remark: null,
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
  })

  // 创建订单快照
  await db.insert(orderSnapshots).values({
    id: crypto.randomUUID(),
    orderId,
    customerNameSnapshot: customer.nickname,
    customerAccountSnapshot: null,
    girlNameSnapshot: girl.name,
    packageNameSnapshot: pkg.name,
    priceSnapshot: body.price,
    girlCommissionTypeSnapshot: girl.commissionType,
    girlCommissionValueSnapshot: girl.commissionValue,
    serviceCommissionTypeSnapshot: store.serviceCommissionType,
    serviceCommissionValueSnapshot: store.serviceCommissionValue,
    createdAt: now.getTime(),
  })

  return c.json({ success: true, data: { id: orderId, orderNo } }, 201)
})

// PUT /api/orders?id=xxx
app.put('/', async (c) => {
  const db = drizzle(c.env.DB)
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'Missing id' }, 400)

  const body = await c.req.json()
  const updateData = { ...body }
  
  // 移除可能传入的 Date 对象，改用时间戳
  if (body.updatedAt) delete updateData.updatedAt
  if (body.createdAt) delete updateData.createdAt
  if (body.appointmentTime && typeof body.appointmentTime === 'object') {
    updateData.appointmentTime = new Date(body.appointmentTime).getTime()
  }
  
  await db.update(orders)
    .set({ ...updateData, updatedAt: Date.now() })
    .where(eq(orders.id, id))

  return c.json({ success: true })
})

export default app
