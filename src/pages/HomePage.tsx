import { useState, useEffect } from 'react'
import { TrendingUp, Users, DollarSign, Calendar, ChevronRight, Crown, User, CheckCircle2, XCircle, Tag } from 'lucide-react'
import { StoreSelector } from '@/components/StoreSelector'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatMoney } from '@/lib/utils'
import { useApi } from '@/hooks/useApi'
import { useAppStore } from '@/stores/appStore'

interface DashboardData {
  todayRevenue: number
  todayOrders: number
  todayCompleted: number
  todayCancelled: number
  monthRevenue: number
  monthOrders: number
  monthCompleted: number
  monthCancelled: number
  monthServiceCommission: number
  totalCustomers: number
  newCustomersThisMonth: number
  girlRanking: { id: string; name: string; orderCount: number; revenue: number; serviceCommission: number }[]
  customerRanking: { id: string; name: string; orderCount: number; revenue: number }[]
  tagStats: { id: string; name: string; color: string | null; count: number }[]
}

export function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { currentStore } = useAppStore()
  const { getDashboard } = useApi()

  useEffect(() => {
    if (currentStore) {
      loadDashboard()
    }
  }, [currentStore])

  const loadDashboard = async () => {
    setIsLoading(true)
    try {
      const dashboardData = await getDashboard(currentStore!.id)
      setData(dashboardData)
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const today = new Date().toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  })

  const StatCard = ({ title, value, subtitle, icon: Icon, trend }: {
    title: string
    value: string | number
    subtitle?: string
    icon: React.ElementType
    trend?: string
  }) => (
    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-md overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-apple-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-apple-900 mt-1">{value}</p>
            {subtitle && <p className="text-xs text-apple-400 mt-1">{subtitle}</p>}
          </div>
          <div className="w-10 h-10 rounded-xl bg-apple-blue/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-apple-blue" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-3">
            <TrendingUp className="w-3 h-3 text-apple-green" />
            <span className="text-xs text-apple-green font-medium">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (!currentStore) {
    return (
      <div className="pb-24">
        <div className="sticky top-0 z-10 bg-apple-50/95 backdrop-blur-md px-4 pt-4 pb-4">
          <StoreSelector />
        </div>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <p className="text-apple-400 mb-4">请先选择或创建一个店家</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-apple-50/95 backdrop-blur-md px-4 pt-4 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-apple-400">{today}</p>
            <h1 className="text-2xl font-semibold text-apple-900">数据看板</h1>
          </div>
          <StoreSelector />
        </div>
      </div>

      <div className="px-4 space-y-6">
        {isLoading ? (
          <div className="text-center py-12 text-apple-400">加载中...</div>
        ) : data ? (
          <>
            {/* Today's Stats */}
            <section>
              <h2 className="text-lg font-semibold text-apple-900 mb-3">今日概况</h2>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  title="今日收入"
                  value={formatMoney(data.todayRevenue)}
                  subtitle={`${data.todayOrders} 笔订单`}
                  icon={DollarSign}
                />
                <StatCard
                  title="今日订单"
                  value={data.todayOrders}
                  subtitle={`${data.todayCompleted}完成 · ${data.todayCancelled}取消`}
                  icon={Calendar}
                />
              </div>
            </section>

            {/* Month Stats */}
            <section>
              <h2 className="text-lg font-semibold text-apple-900 mb-3">本月累计</h2>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  title="本月收入"
                  value={formatMoney(data.monthRevenue)}
                  subtitle={`${data.monthOrders} 笔订单`}
                  icon={TrendingUp}
                />
                <StatCard
                  title="本月订单"
                  value={data.monthOrders}
                  subtitle={`${data.monthCompleted}完成 · ${data.monthCancelled}取消`}
                  icon={Users}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <StatCard
                  title="客服提成"
                  value={formatMoney(data.monthServiceCommission)}
                  icon={DollarSign}
                />
                <StatCard
                  title="新增顾客"
                  value={data.newCustomersThisMonth}
                  subtitle={`共${data.totalCustomers}位顾客`}
                  icon={User}
                />
              </div>
            </section>

            {/* Girl Ranking */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-apple-900">妹妹排行</h2>
                <button className="text-sm text-apple-blue flex items-center">
                  查看全部
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {data.girlRanking.slice(0, 5).map((girl, index) => (
                  <div
                    key={girl.id}
                    className={cn(
                      "flex items-center gap-3 p-4",
                      index !== data.girlRanking.slice(0, 5).length - 1 && "border-b border-apple-100"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 ? "bg-yellow-100 text-yellow-600" :
                      index === 1 ? "bg-gray-100 text-gray-600" :
                      index === 2 ? "bg-orange-100 text-orange-600" :
                      "bg-apple-100 text-apple-400"
                    )}>
                      {index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-apple-pink to-apple-orange flex items-center justify-center text-white font-bold">
                      {girl.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-apple-900">{girl.name}</p>
                      <p className="text-sm text-apple-400">{girl.orderCount} 单</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-apple-900">{formatMoney(girl.revenue)}</p>
                      {index === 0 && <Crown className="w-4 h-4 text-yellow-500 ml-auto" />}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Customer Ranking */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-apple-900">顾客排行</h2>
                <button className="text-sm text-apple-blue flex items-center">
                  查看全部
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {data.customerRanking.slice(0, 5).map((customer, index) => (
                  <div
                    key={customer.id}
                    className={cn(
                      "flex items-center gap-3 p-4",
                      index !== data.customerRanking.slice(0, 5).length - 1 && "border-b border-apple-100"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 ? "bg-yellow-100 text-yellow-600" :
                      index === 1 ? "bg-gray-100 text-gray-600" :
                      index === 2 ? "bg-orange-100 text-orange-600" :
                      "bg-apple-100 text-apple-400"
                    )}>
                      {index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-apple-blue to-apple-indigo flex items-center justify-center text-white font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-apple-900">{customer.name}</p>
                      <p className="text-sm text-apple-400">{customer.orderCount} 单</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-apple-900">{formatMoney(customer.revenue)}</p>
                      {index === 0 && <Crown className="w-4 h-4 text-yellow-500 ml-auto" />}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Tag Stats */}
            {data.tagStats && data.tagStats.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-apple-900">标签统计</h2>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    {data.tagStats.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-white"
                        style={{ backgroundColor: tag.color || '#3B82F6' }}
                      >
                        <Tag className="w-3 h-3" />
                        <span>{tag.name}</span>
                        <span className="opacity-80">({tag.count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-apple-400">暂无数据</div>
        )}
      </div>
    </div>
  )
}
