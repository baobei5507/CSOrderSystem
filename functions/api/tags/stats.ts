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

    // 获取所有标签
    const allTags = await db.select().from(tags).where(eq(tags.storeId, storeId)).all()
    
    // 统计每个标签的顾客数
    const tagStats = []
    for (const tag of allTags) {
      const countResult = await db.select({
        count: sql<number>`COUNT(*)`,
      })
        .from(customerTags)
        .where(eq(customerTags.tagId, tag.id))
        .get()
      
      tagStats.push({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt,
        customerCount: countResult?.count || 0,
      })
    }
    
    // 按顾客数排序
    tagStats.sort((a, b) => b.customerCount - a.customerCount)

    return successResponse(tagStats)
  } catch (error: any) {
    console.error('Tag stats error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}
