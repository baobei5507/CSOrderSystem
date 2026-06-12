import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { drizzle } from 'drizzle-orm/d1'
import { sql } from 'drizzle-orm'
import type { ExportedHandler, ExecutionContext } from '@cloudflare/workers-types'
import storesRoute from './routes/stores'
import girlsRoute from './routes/girls'
import packagesRoute from './routes/packages'
import girlPackagePricesRoute from './routes/girlPackagePrices'
import customersRoute from './routes/customers'
import tagsRoute from './routes/tags'
import ordersRoute from './routes/orders'
import dashboardRoute from './routes/dashboard'
import analysisRoute from './routes/analysis'
import customerAnalysisRoute from './routes/customerAnalysis'
import trendsRoute from './routes/trends'
import dailyReportRoute from './routes/dailyReport'
import memberConfigRoute from './routes/memberConfig'
import rechargeRoute from './routes/recharge'
import calculatePriceRoute from './routes/calculatePrice'
import ordersExportRoute from './routes/ordersExport'
import authRoute, { authMiddleware } from './routes/auth'
import { girlPackagePrices } from './db/schema'

// 环境变量类型
export interface Env {
  DB: D1Database
  DEFAULT_SERVICE_STAFF: string
  CORS_ORIGIN?: string
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Env }>()

// 中间件
app.use('*', logger())
app.use('*', cors({
  origin: (origin, c) => {
    const allowed = c.env.CORS_ORIGIN || '*'
    return allowed === '*' ? origin : allowed
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// 健康检查
app.get('/', (c) => c.json({ success: true, message: 'CS Order API is running' }))

// API 路由（auth 不需要鉴权）
app.route('/api/auth', authRoute)

// 所有其他 API 路由需要鉴权
app.use('/api/*', authMiddleware)

app.route('/api/stores', storesRoute)
app.route('/api/girls', girlsRoute)
app.route('/api/packages', packagesRoute)
app.route('/api/girl-package-prices', girlPackagePricesRoute)
app.route('/api/customers', customersRoute)
app.route('/api/tags', tagsRoute)
app.route('/api/orders', ordersRoute)
app.route('/api/dashboard', dashboardRoute)
app.route('/api/analysis', analysisRoute)
app.route('/api/analysis', customerAnalysisRoute)
app.route('/api/trends', trendsRoute)
app.route('/api/daily-report', dailyReportRoute)
app.route('/api/member-config', memberConfigRoute)
app.route('/api/recharge', rechargeRoute)
app.route('/api/calculate-price', calculatePriceRoute)
app.route('/api/orders/export', ordersExportRoute)

// 错误处理
app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json({ success: false, error: err.message }, 500)
})

// 404
app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404))

// 默认导出：同时支持 HTTP 请求和 Cron 触发器
export default {
  // HTTP 请求处理
  fetch: app.fetch,

  // Cron Trigger：每天凌晨自动清空当日价格
  scheduled: async (event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(
      (async () => {
        console.log('Running daily price reset cron job at:', new Date().toISOString())
        try {
          const db = drizzle(env.DB)
          // 清空所有 daily_price
          const result = await db.update(girlPackagePrices)
            .set({ dailyPrice: null, updatedAt: Date.now() })
            .where(sql`daily_price IS NOT NULL`)
            .returning()
          console.log('Daily price reset completed, affected rows:', result.length)
        } catch (err) {
          console.error('Daily price reset failed:', err)
        }
      })()
    )
  }
} satisfies ExportedHandler<Env>
