import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import storesRoute from './routes/stores'
import girlsRoute from './routes/girls'
import packagesRoute from './routes/packages'
import girlPackagePricesRoute from './routes/girlPackagePrices'
import customersRoute from './routes/customers'
import tagsRoute from './routes/tags'
import ordersRoute from './routes/orders'
import dashboardRoute from './routes/dashboard'
import analysisRoute from './routes/analysis'
import dailyReportRoute from './routes/dailyReport'

// 环境变量类型
export interface Env {
  DB: D1Database
  DEFAULT_SERVICE_STAFF: string
  CORS_ORIGIN?: string
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

// API 路由
app.route('/api/stores', storesRoute)
app.route('/api/girls', girlsRoute)
app.route('/api/packages', packagesRoute)
app.route('/api/girl-package-prices', girlPackagePricesRoute)
app.route('/api/customers', customersRoute)
app.route('/api/tags', tagsRoute)
app.route('/api/orders', ordersRoute)
app.route('/api/dashboard', dashboardRoute)
app.route('/api/analysis', analysisRoute)
app.route('/api/daily-report', dailyReportRoute)

// 错误处理
app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json({ success: false, error: err.message }, 500)
})

// 404
app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404))

export default app
