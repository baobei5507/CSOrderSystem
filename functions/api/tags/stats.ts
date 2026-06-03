import type { PagesFunction } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { eq, sql } from 'drizzle-orm'
import { tags, customerTags } from '../../../db/schema'
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
    const storeId = url.searchParams.get('storeId')
    
    if (!storeId) return errorResponse('Missing storeId')

    const tagStats = await db.select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
      customerCount: sql<number>`COUNT(${customerTags.customerId})`,
    })
      .from(tags)
      .leftJoin(customerTags, eq(tags.id, customerTags.tagId))
      .where(eq(tags.storeId, storeId))
      .groupBy(tags.id)
      .orderBy(sql`COUNT(${customerTags.customerId}) DESC`)
      .all()

    return successResponse(tagStats.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color,
      createdAt: t.createdAt,
      customerCount: t.customerCount || 0,
    })))
  } catch (error: any) {
    console.error('Tag stats error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}
