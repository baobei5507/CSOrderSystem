import type { PagesFunction } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { tags } from '../../db/schema'
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
        
        const allTags = await db.select().from(tags).where(eq(tags.storeId, storeId)).all()
        return successResponse(allTags)
      }

      case 'POST': {
        const body = await request.json() as {
          storeId: string
          name: string
          color?: string
        }

        const id = generateId()
        const timestamp = now()
        
        await db.insert(tags).values({
          id,
          storeId: body.storeId,
          name: body.name,
          color: body.color || null,
          createdAt: timestamp,
        })
        
        return successResponse({ id }, 201)
      }

      case 'PUT': {
        const id = url.searchParams.get('id')
        if (!id) return errorResponse('Missing id')
        
        const body = await request.json() as {
          name?: string
          color?: string
        }

        await db.update(tags)
          .set(body)
          .where(eq(tags.id, id))
        
        return successResponse({ success: true })
      }

      case 'DELETE': {
        const id = url.searchParams.get('id')
        if (!id) return errorResponse('Missing id')
        
        await db.delete(tags).where(eq(tags.id, id))
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