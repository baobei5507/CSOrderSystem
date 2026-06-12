import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// PBKDF2 密码哈希
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// JWT 签名
async function signJWT(payload: object, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const header = { alg: 'HS256', typ: 'JWT' }
  const headerB64 = btoa(JSON.stringify(header))
  const payloadB64 = btoa(JSON.stringify(payload))
  const data = encoder.encode(`${headerB64}.${payloadB64}`)
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, data)
  const sigB64 = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${headerB64}.${payloadB64}.${sigB64}`
}

// JWT 验证
async function verifyJWT(token: string, secret: string): Promise<object | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const encoder = new TextEncoder()
  const data = encoder.encode(`${parts[0]}.${parts[1]}`)
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const sigHex = parts[2]
  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(hex => parseInt(hex, 16)))
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, data)
  if (!valid) return null
  try {
    return JSON.parse(atob(parts[1]))
  } catch {
    return null
  }
}

// POST /api/auth/login
app.post('/login', async (c) => {
  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  const { username, password } = body

  if (!username || !password) {
    return c.json({ success: false, error: '请输入账号和密码' }, 400)
  }

  const user = await db.select().from(users).where(eq(users.username, username)).get()
  if (!user) {
    return c.json({ success: false, error: '账号不存在' }, 401)
  }

  const hash = await hashPassword(password, user.salt)
  if (hash !== user.passwordHash) {
    return c.json({ success: false, error: '密码错误' }, 401)
  }

  // 生成 JWT（有效期7天）
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    userId: user.id,
    username: user.username,
    storeId: user.storeId,
    role: user.role,
    iat: now,
    exp: now + 7 * 24 * 3600,
  }
  const token = await signJWT(payload, c.env.JWT_SECRET)

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        storeId: user.storeId,
        role: user.role,
      },
    },
  })
})

// POST /api/auth/register - 注册新用户（仅管理员可操作）
app.post('/register', async (c) => {
  // 验证当前用户是管理员
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: '未授权' }, 401)
  }
  const token = authHeader.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || (payload as any).role !== 'admin') {
    return c.json({ success: false, error: '需要管理员权限' }, 403)
  }

  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  const { username, password, storeId, role = 'staff' } = body

  if (!username || !password) {
    return c.json({ success: false, error: '请输入账号和密码' }, 400)
  }

  // 检查用户名是否已存在
  const existing = await db.select().from(users).where(eq(users.username, username)).get()
  if (existing) {
    return c.json({ success: false, error: '用户名已存在' }, 400)
  }

  const now = Date.now()
  const salt = crypto.randomUUID().replace(/-/g, '')
  const passwordHash = await hashPassword(password, salt)

  const userId = crypto.randomUUID()
  await db.insert(users).values({
    id: userId,
    username,
    passwordHash,
    salt,
    storeId: storeId || null,
    role,
    createdAt: now,
    updatedAt: now,
  })

  return c.json({
    success: true,
    data: {
      id: userId,
      username,
      storeId,
      role,
    },
  }, 201)
})

// GET /api/auth/me - 获取当前用户信息
app.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: '未授权' }, 401)
  }
  const token = authHeader.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload) {
    return c.json({ success: false, error: 'Token无效或已过期' }, 401)
  }

  const db = drizzle(c.env.DB)
  const user = await db.select().from(users).where(eq(users.id, (payload as any).userId)).get()
  if (!user) {
    return c.json({ success: false, error: '用户不存在' }, 401)
  }

  return c.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      storeId: user.storeId,
      role: user.role,
    },
  })
})

// POST /api/auth/init - 初始化默认管理员（仅当无用户时可用）
app.post('/init', async (c) => {
  const db = drizzle(c.env.DB)
  // 检查是否已有任何用户
  const existingUsers = await db.select().from(users).all()
  if (existingUsers.length > 0) {
    return c.json({ success: false, error: '已有用户，不能初始化' }, 400)
  }

  const body = await c.req.json()
  const { username, password } = body

  if (!username || !password) {
    return c.json({ success: false, error: '请输入账号和密码' }, 400)
  }

  const now = Date.now()
  const salt = crypto.randomUUID().replace(/-/g, '')
  const passwordHash = await hashPassword(password, salt)

  const userId = crypto.randomUUID()
  await db.insert(users).values({
    id: userId,
    username,
    passwordHash,
    salt,
    storeId: null,
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  })

  // 自动生成 token
  const tokenPayload = {
    userId,
    username,
    storeId: null,
    role: 'admin',
    iat: Math.floor(now / 1000),
    exp: Math.floor(now / 1000) + 7 * 24 * 3600,
  }
  const token = await signJWT(tokenPayload, c.env.JWT_SECRET)

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: userId,
        username,
        storeId: null,
        role: 'admin',
      },
    },
  }, 201)
})

// 验证 JWT 中间件导出
export async function authMiddleware(c: any, next: any) {
  // 跳过 auth 路由自身的请求
  const path = new URL(c.req.url).pathname
  if (path.startsWith('/api/auth/')) {
    return next()
  }

  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: '未授权，请先登录' }, 401)
  }

  const token = authHeader.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload) {
    return c.json({ success: false, error: '登录已过期，请重新登录' }, 401)
  }

  // 检查过期
  const now = Math.floor(Date.now() / 1000)
  if ((payload as any).exp < now) {
    return c.json({ success: false, error: '登录已过期，请重新登录' }, 401)
  }

  // 将用户信息注入上下文
  c.set('user', payload)
  return next()
}

export default app