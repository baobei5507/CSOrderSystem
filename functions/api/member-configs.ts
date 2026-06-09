import type { PagesFunction } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { memberConfigs, memberLevels } from '../../db/schema'
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
        
        // 获取会员配置
        const config = await db.select().from(memberConfigs).where(eq(memberConfigs.storeId, storeId)).get()
        
        // 获取会员等级
        const levels = await db.select().from(memberLevels).where(eq(memberLevels.storeId, storeId)).all()
        
        if (!config) {
          // 返回默认配置
          return successResponse({
            enabled: false,
            priceMarkup: 0,
            minBalancePercent: 50,
            memberDays: [1, 2],
            levels: [
              { level: 1, name: '3K会员', minRecharge: 3000, regularDiscount: 95, memberDayDiscount: 85 },
              { level: 2, name: '5K会员', minRecharge: 5000, regularDiscount: 90, memberDayDiscount: 80 },
              { level: 3, name: '7K会员', minRecharge: 7000, regularDiscount: 88, memberDayDiscount: 75 },
              { level: 4, name: '1w会员', minRecharge: 10000, regularDiscount: 85, memberDayDiscount: 70 },
              { level: 5, name: '2w会员', minRecharge: 20000, regularDiscount: 83, memberDayDiscount: 65 },
            ],
          })
        }
        
        return successResponse({
          ...config,
          memberDays: config.memberDays.split(',').map(d => parseInt(d)).filter(d => !isNaN(d)),
          levels: levels.length > 0 ? levels : [
            { level: 1, name: '3K会员', minRecharge: 3000, regularDiscount: 95, memberDayDiscount: 85 },
            { level: 2, name: '5K会员', minRecharge: 5000, regularDiscount: 90, memberDayDiscount: 80 },
            { level: 3, name: '7K会员', minRecharge: 7000, regularDiscount: 88, memberDayDiscount: 75 },
            { level: 4, name: '1w会员', minRecharge: 10000, regularDiscount: 85, memberDayDiscount: 70 },
            { level: 5, name: '2w会员', minRecharge: 20000, regularDiscount: 83, memberDayDiscount: 65 },
          ],
        })
      }

      case 'POST':
      case 'PUT': {
        const body = await request.json() as {
          storeId: string
          enabled?: boolean
          priceMarkup?: number
          minBalancePercent?: number
          memberDays?: number[]
          levels?: Array<{
            level: number
            name: string
            minRecharge: number
            regularDiscount: number
            memberDayDiscount: number
          }>
        }
        
        const targetStoreId = storeId || body.storeId
        if (!targetStoreId) return errorResponse('Missing storeId')

        const timestamp = now()

        // 保存会员配置
        const existingConfig = await db.select().from(memberConfigs).where(eq(memberConfigs.storeId, targetStoreId)).get()
        
        if (existingConfig) {
          await db.update(memberConfigs)
            .set({
              enabled: body.enabled !== undefined ? body.enabled : existingConfig.enabled,
              priceMarkup: body.priceMarkup !== undefined ? body.priceMarkup : existingConfig.priceMarkup,
              minBalancePercent: body.minBalancePercent !== undefined ? body.minBalancePercent : existingConfig.minBalancePercent,
              memberDays: body.memberDays ? body.memberDays.join(',') : existingConfig.memberDays,
              updatedAt: timestamp,
            })
            .where(eq(memberConfigs.storeId, targetStoreId))
        } else {
          await db.insert(memberConfigs).values({
            id: generateId(),
            storeId: targetStoreId,
            enabled: body.enabled || false,
            priceMarkup: body.priceMarkup || 0,
            minBalancePercent: body.minBalancePercent || 50,
            memberDays: body.memberDays ? body.memberDays.join(',') : '1,2',
            createdAt: timestamp,
            updatedAt: timestamp,
          })
        }

        // 保存会员等级
        if (body.levels && body.levels.length > 0) {
          // 删除旧等级
          await db.delete(memberLevels).where(eq(memberLevels.storeId, targetStoreId))
          
          // 插入新等级
          for (const level of body.levels) {
            await db.insert(memberLevels).values({
              id: generateId(),
              storeId: targetStoreId,
              level: level.level,
              name: level.name,
              minRecharge: level.minRecharge,
              regularDiscount: level.regularDiscount,
              memberDayDiscount: level.memberDayDiscount,
              createdAt: timestamp,
              updatedAt: timestamp,
            })
          }
        }
        
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
