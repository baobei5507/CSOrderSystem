import type { PagesFunction } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { girlPackagePrices } from '../../db/schema'
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
    const girlId = url.searchParams.get('girlId')
    const storeId = url.searchParams.get('storeId')

    switch (request.method) {
      case 'GET': {
        if (!girlId) return errorResponse('Missing girlId')
        
        const prices = await db.select().from(girlPackagePrices).where(eq(girlPackagePrices.girlId, girlId)).all()
        return successResponse(prices)
      }

      case 'POST': {
        const body = await request.json() as {
          storeId: string
          girlId: string
          packageId: string
          price: number
          dailyPrice?: number | null
        }
        
        if (!body.storeId || !body.girlId || !body.packageId) {
          return errorResponse('Missing required fields')
        }

        const timestamp = now()
        
        // 检查是否已存在
        const existing = await db.select().from(girlPackagePrices).where(
          and(
            eq(girlPackagePrices.girlId, body.girlId),
            eq(girlPackagePrices.packageId, body.packageId)
          )
        ).get()
        
        if (existing) {
          // 更新
          await db.update(girlPackagePrices)
            .set({
              price: body.price,
              dailyPrice: body.dailyPrice !== undefined ? body.dailyPrice : existing.dailyPrice,
              updatedAt: timestamp,
            })
            .where(eq(girlPackagePrices.id, existing.id))
          
          return successResponse({ id: existing.id })
        } else {
          // 新建
          const id = generateId()
          await db.insert(girlPackagePrices).values({
            id,
            storeId: body.storeId,
            girlId: body.girlId,
            packageId: body.packageId,
            price: body.price,
            dailyPrice: body.dailyPrice || null,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          
          return successResponse({ id }, 201)
        }
      }

      case 'PUT': {
        const id = url.searchParams.get('id')
        if (!id) return errorResponse('Missing id')
        
        const body = await request.json() as {
          price?: number
          dailyPrice?: number | null
        }

        await db.update(girlPackagePrices)
          .set({ ...body, updatedAt: now() })
          .where(eq(girlPackagePrices.id, id))
        
        return successResponse({ success: true })
      }

      case 'DELETE': {
        const id = url.searchParams.get('id')
        if (!id) return errorResponse('Missing id')
        
        await db.delete(girlPackagePrices).where(eq(girlPackagePrices.id, id))
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
