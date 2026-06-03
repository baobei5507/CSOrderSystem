import type { PagesFunction } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, like, or } from 'drizzle-orm'
import { customers, customerAccounts, customerTags, tags } from '../../db/schema'
import { corsHeaders, successResponse, errorResponse, generateId, now } from './utils'

export interface Env {
  DB: D1Database
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
        
        let query = db.select().from(customers).where(eq(customers.storeId, storeId))
        
        if (search) {
          const searchTerm = `%${search}%`
          // 搜索昵称或账号
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
          allCustomers.map(async (customer) => {
            const accounts = await db.select().from(customerAccounts)
              .where(eq(customerAccounts.customerId, customer.id))
              .all()
            
            const customerTagList = await db.select({ tag: tags })
              .from(customerTags)
              .innerJoin(tags, eq(customerTags.tagId, tags.id))
              .where(eq(customerTags.customerId, customer.id))
              .all()
            
            return {
              ...customer,
              accounts,
              tags: customerTagList.map(t => t.tag),
            }
          })
        )
        
        return successResponse(customersWithDetails)
      }

      case 'POST': {
        const body = await request.json() as {
          storeId: string
          nickname?: string
          remark?: string
          accounts?: { platform: 'wechat' | 'telegram'; account: string }[]
          tagIds?: string[]
        }

        const id = generateId()
        const timestamp = now()
        
        await db.insert(customers).values({
          id,
          storeId: body.storeId,
          nickname: body.nickname || null,
          remark: body.remark || null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })

        // 插入账号
        if (body.accounts && body.accounts.length > 0) {
          for (const acc of body.accounts) {
            await db.insert(customerAccounts).values({
              id: generateId(),
              customerId: id,
              platform: acc.platform,
              account: acc.account,
              createdAt: timestamp,
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
        
        return successResponse({ id }, 201)
      }

      case 'PUT': {
        const id = url.searchParams.get('id')
        if (!id) return errorResponse('Missing id')
        
        const body = await request.json() as {
          nickname?: string
          remark?: string
        }

        await db.update(customers)
          .set({ ...body, updatedAt: now() })
          .where(eq(customers.id, id))
        
        return successResponse({ success: true })
      }

      case 'DELETE': {
        const id = url.searchParams.get('id')
        if (!id) return errorResponse('Missing id')
        
        await db.delete(customers).where(eq(customers.id, id))
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