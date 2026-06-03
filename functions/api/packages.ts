import type { PagesFunction } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { packages } from '../../db/schema'
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
        
        const allPackages = await db.select().from(packages).where(eq(packages.storeId, storeId)).all()
        return successResponse(allPackages)
      }

      case 'POST': {
        const body = await request.json() as {
          storeId: string
          code: string
          name: string
          status?: 'active' | 'inactive'
        }
        
        // 检查同店同编码
        const existing = await db.select().from(packages)
          .where(and(eq(packages.storeId, body.storeId), eq(packages.code, body.code)))
          .get()
        
        if (existing) {
          return errorResponse('该店家下已存在相同套餐编码')
        }

        const id = generateId()
        const timestamp = now()
        
        await db.insert(packages).values({
          id,
          storeId: body.storeId,
          code: body.code,
          name: body.name,
          status: body.status || 'active',
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        
        return successResponse({ id }, 201)
      }

      case 'PUT': {
        const id = url.searchParams.get('id')
        if (!id) return errorResponse('Missing id')
        
        const body = await request.json() as {
          code?: string
          name?: string
          status?: 'active' | 'inactive'
        }

        await db.update(packages)
          .set({ ...body, updatedAt: now() })
          .where(eq(packages.id, id))
        
        return successResponse({ success: true })
      }

      case 'DELETE': {
        const id = url.searchParams.get('id')
        if (!id) return errorResponse('Missing id')
        
        await db.delete(packages).where(eq(packages.id, id))
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