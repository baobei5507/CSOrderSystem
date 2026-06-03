import type { PagesFunction } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, like, or, gte, lt } from 'drizzle-orm'
import { 
  orders, 
  orderSnapshots, 
  customers, 
  customerAccounts, 
  girls, 
  packages,
  stores,
  girlPackagePrices
} from '../../db/schema'
import { corsHeaders, successResponse, errorResponse, generateId, now } from './utils'

export interface Env {
  DB: D1Database
}

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

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const db = drizzle(env.DB)

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(request.url)
    const storeId = url.searchParams.get('storeId')
    const search = url.searchParams.get('search')

    switch (request.method) {
      case 'GET': {
        if (!storeId) return errorResponse('Missing storeId')
        
        let query = db.select().from(orders).where(eq(orders.storeId, storeId))
        
        if (search) {
          const searchTerm = `%${search}%`
          query = db.select().from(orders).where(
            and(
              eq(orders.storeId, storeId),
              or(
                like(orders.orderNo, searchTerm),
                like(orders.serviceStaffName, searchTerm)
              )
            )
          ) as any
        }
        
        const allOrders = await query.orderBy(orders.createdAt, 'desc').all()
        return successResponse(allOrders)
      }

      case 'POST': {
        const body = await request.json() as {
          storeId: string
          customerId: string
          customerAccountId: string
          girlId: string
          packageId: string
          appointmentTime?: number
          price: number
          status?: 'pending' | 'completed' | 'cancelled'
          serviceStaffName: string
          remark?: string
        }

        const timestamp = now()

        // 获取关联数据
        const customer = await db.select().from(customers).where(eq(customers.id, body.customerId)).get()
        const account = await db.select().from(customerAccounts).where(eq(customerAccounts.id, body.customerAccountId)).get()
        const girl = await db.select().from(girls).where(eq(girls.id, body.girlId)).get()
        const pkg = await db.select().from(packages).where(eq(packages.id, body.packageId)).get()
        const store = await db.select().from(stores).where(eq(stores.id, body.storeId)).get()

        if (!customer || !girl || !pkg || !store) {
          return errorResponse('关联数据不存在')
        }

        // 自动计算
        const girlIncome = calculateCommission(body.price, girl.commissionType, girl.commissionValue)
        const serviceCommission = calculateCommission(body.price, store.serviceCommissionType, store.serviceCommissionValue)

        const orderId = generateId()
        const orderNo = generateOrderNo()

        // 创建订单
        await db.insert(orders).values({
          id: orderId,
          orderNo,
          storeId: body.storeId,
          customerId: body.customerId,
          customerAccountId: body.customerAccountId,
          girlId: body.girlId,
          packageId: body.packageId,
          appointmentTime: body.appointmentTime || null,
          price: body.price,
          status: body.status || 'pending',
          serviceStaffName: body.serviceStaffName,
          girlIncome,
          serviceCommission,
          remark: body.remark || null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })

        // 创建订单快照
        await db.insert(orderSnapshots).values({
          id: generateId(),
          orderId,
          customerNameSnapshot: customer.nickname,
          customerAccountSnapshot: account?.account,
          girlNameSnapshot: girl.name,
          packageNameSnapshot: pkg.name,
          priceSnapshot: body.price,
          girlCommissionTypeSnapshot: girl.commissionType,
          girlCommissionValueSnapshot: girl.commissionValue,
          serviceCommissionTypeSnapshot: store.serviceCommissionType,
          serviceCommissionValueSnapshot: store.serviceCommissionValue,
          createdAt: timestamp,
        })
        
        return successResponse({ id: orderId, orderNo }, 201)
      }

      case 'PUT': {
        const id = url.searchParams.get('id')
        if (!id) return errorResponse('Missing id')
        
        const body = await request.json() as {
          status?: 'pending' | 'completed' | 'cancelled'
          appointmentTime?: number
          remark?: string
        }

        await db.update(orders)
          .set({ ...body, updatedAt: now() })
          .where(eq(orders.id, id))
        
        return successResponse({ success: true })
      }

      case 'DELETE': {
        const id = url.searchParams.get('id')
        if (!id) return errorResponse('Missing id')
        
        await db.delete(orders).where(eq(orders.id, id))
        return successResponse({ success: true })
      }

      default:
        return errorResponse('Method not allowed', 405)
    }
  } catch (error: any) {
    console.error('API Error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}