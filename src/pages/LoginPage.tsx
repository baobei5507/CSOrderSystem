import { useState } from 'react'
import { useAppStore } from '@/stores/appStore'

export function LoginPage() {
  const { setAuth } = useAppStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isInit, setIsInit] = useState(false) // 是否初始化模式
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const API_BASE = 'https://cs-order-api.550759734-d15.workers.dev/api'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError('请输入账号和密码')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const endpoint = isInit ? '/auth/init' : '/auth/login'
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || '操作失败')
        // 如果登录时提示账号不存在，自动切换到初始化模式提示
        if (!isInit && data.error === '账号不存在') {
          setError('账号不存在，如果是首次使用请点击"初始化账号"')
        }
        return
      }

      // 保存 token 和用户信息
      setAuth(data.data.token, data.data.user)
    } catch (err) {
      setError('网络错误，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-chiikawa-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          {/* Logo / Title */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-chiikawa-pink/20 mb-3">
              <svg className="w-8 h-8 text-chiikawa-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-chiikawa-brown">订单管理系统</h1>
            <p className="text-sm text-chiikawa-brown/60 mt-1">
              {isInit ? '创建管理员账号' : '请登录以继续'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-chiikawa-brown/70 mb-1">账号</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入账号"
                className="w-full px-3 py-2 border border-chiikawa-peach/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-chiikawa-pink/40 bg-chiikawa-cream/50 text-chiikawa-brown"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-chiikawa-brown/70 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                className="w-full px-3 py-2 border border-chiikawa-peach/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-chiikawa-pink/40 bg-chiikawa-cream/50 text-chiikawa-brown"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 rounded-lg p-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-chiikawa-brown text-white rounded-lg font-medium hover:bg-chiikawa-brown/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? '处理中...' : (isInit ? '创建账号' : '登录')}
            </button>
          </form>

          {/* 切换模式 */}
          <div className="text-center">
            <button
              onClick={() => { setIsInit(!isInit); setError('') }}
              className="text-sm text-chiikawa-brown/60 hover:text-chiikawa-brown transition-colors"
            >
              {isInit ? '已有账号？点击登录' : '首次使用？点击初始化账号'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}