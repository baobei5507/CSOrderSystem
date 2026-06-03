import type { PagesFunction } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { tags, customerTags, customers, orders } from '../../../db/schema'
import { corsHeaders, successResponse, errorResponse } from '../utils'

export interface Env {
  DB: D1Database
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const db = drizzle(env.DB)

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) return errorResponse('Missing id')

    // 获取标签信息
    const tagInfo = await db.select().from(tags).where(eq(tags.id, id)).get()
    if (!tagInfo) return errorResponse('Tag not found', 404)

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

    return successResponse({
      tag: {
        id: tagInfo.id,
        name: tagInfo.name,
        color: tagInfo.color,
        customerCount: customerDetails.length,
      },
      customers: customerDetails,
    })
  } catch (error: any) {
    console.error('Tag detail error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}
