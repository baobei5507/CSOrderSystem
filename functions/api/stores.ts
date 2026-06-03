import type { PagesFunction } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { stores } from '../../db/schema'
import { eq } from 'drizzle-orm'

export interface Env {
  DB: D1Database
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const db = drizzle(env.DB)

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers })
  }

  try {
    switch (request.method) {
      case 'GET': {
        const allStores = await db.select().from(stores).all()
        return new Response(JSON.stringify({ success: true, data: allStores }), { headers })
      }

      case 'POST': {
        const body = await request.json()
        const id = crypto.randomUUID()
        const now = Date.now()
        
        await db.insert(stores).values({
          id,
          name: body.name,
          serviceCommissionType: body.serviceCommissionType,
          serviceCommissionValue: body.serviceCommissionValue,
          createdAt: now,
          updatedAt: now,
        })
        
        return new Response(JSON.stringify({ success: true, data: { id } }), { headers })
      }

      case 'PUT': {
        const url = new URL(request.url)
        const id = url.searchParams.get('id')
        if (!id) {
          return new Response(JSON.stringify({ success: false, error: 'Missing id' }), { 
            status: 400, 
            headers 
          })
        }
        
        const body = await request.json()
        await db.update(stores)
          .set({
            name: body.name,
            serviceCommissionType: body.serviceCommissionType,
            serviceCommissionValue: body.serviceCommissionValue,
            updatedAt: Date.now(),
          })
          .where(eq(stores.id, id))
        
        return new Response(JSON.stringify({ success: true }), { headers })
      }

      case 'DELETE': {
        const url = new URL(request.url)
        const id = url.searchParams.get('id')
        if (!id) {
          return new Response(JSON.stringify({ success: false, error: 'Missing id' }), { 
            status: 400, 
            headers 
          })
        }
        
        await db.delete(stores).where(eq(stores.id, id))
        return new Response(JSON.stringify({ success: true }), { headers })
      }

      default:
        return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { 
          status: 405, 
          headers 
        })
    }
  } catch (error) {
    console.error('API Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }), 
      { status: 500, headers }
    )
  }
}