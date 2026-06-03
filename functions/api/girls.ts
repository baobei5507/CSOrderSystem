import type { PagesFunction } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { girls, girlPackagePrices, packages } from '../../db/schema'
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

    switch (request.method) {
      case 'GET': {
        if (!storeId) return errorResponse('Missing storeId')
        
        const allGirls = await db.select().from(girls).where(eq(girls.storeId, storeId)).all()
        return successResponse(allGirls)
      }

      case 'POST': {
        const body = await request.json() as {
          storeId: string
          name: string
          status: 'active' | 'rest' | 'left'
          commissionType: 'percent' | 'fixed'
          commissionValue: number
        }
        
        // 检查同店同名
        const existing = await db.select().from(girls)
          .where(and(eq(girls.storeId, body.storeId), eq(girls.name, body.name)))
          .get()
        
        if (existing) {
          return errorResponse('该店家下已存在同名妹妹')
        }

        const id = generateId()
        const timestamp = now()
        
        await db.insert(girls).values({
          id,
          storeId: body.storeId,
          name: body.name,
          status: body.status || 'active',
          commissionType: body.commissionType,
          commissionValue: body.commissionValue,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        
        return successResponse({ id }, 201)
      }

      case 'PUT': {
        const id = url.searchParams.get('id')
        if (!id) return errorResponse('Missing id')
        
        const body = await request.json() as {
          name?: string
          status?: 'active' | 'rest' | 'left'
          commissionType?: 'percent' | 'fixed'
          commissionValue?: number
        }

        await db.update(girls)
          .set({ ...body, updatedAt: now() })
          .where(eq(girls.id, id))
        
        return successResponse({ success: true })
      }

      case 'DELETE': {
        const id = url.searchParams.get('id')
        if (!id) return errorResponse('Missing id')
        
        await db.delete(girls).where(eq(girls.id, id))
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