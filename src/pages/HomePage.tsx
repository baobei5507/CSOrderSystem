import { useState, useEffect } from 'react'
import { ChevronRight, Crown, Sparkles } from 'lucide-react'
import { StoreSelector } from '@/components/StoreSelector'
import { cn, formatMoney } from '@/lib/utils'
import { useApi } from '@/hooks/useApi'
import { useAppStore } from '@/stores/appStore'
import { EmptyDataState } from '@/components/EmptyState'
import { WelcomeHeader, CuteStatCard, ChiikawaLoading, CharacterAvatar, CuteCard } from '@/components/ChiikawaTheme'

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
  girlRanking: { id: string; name: string; orderCount: number; revenue: number; girlIncome: number }[]
  customerRanking: { id: string; name: string; orderCount: number; revenue: number }[]
}

export function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [chartDimension, setChartDimension] = useState<'orders' | 'commission'>('orders')
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
        {/* 可爱欢迎区域 */}
        <WelcomeHeader 
          title="今天也要加油哦！"
          subtitle={`${today} · ${currentStore?.name || '未选择店家'}`}
          character="chiikawa"
        />

        {isLoading ? (
          <ChiikawaLoading />
        ) : data ? (
          <>
            {/* Today's Stats */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-chiikawa-pink" />
                <h2 className="text-lg font-semibold text-chiikawa-brown">今日概况</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CuteStatCard
                  title="今日收入"
                  value={formatMoney(data.todayRevenue)}
                  subtitle={`${data.todayCompleted} 笔完成订单`}
                  character="chiikawa"
                  variant="pink"
                />
                <CuteStatCard
                  title="完成订单"
                  value={data.todayCompleted}
                  subtitle="今日已完成"
                  character="hachiware"
                  variant="blue"
                />
                <CuteStatCard
                  title="取消订单"
                  value={data.todayCancelled}
                  subtitle="今日已取消"
                  character="usagi"
                  variant="yellow"
                />
              </div>
            </section>

            {/* Month Stats */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-chiikawa-blue" />
                <h2 className="text-lg font-semibold text-chiikawa-brown">本月累计</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CuteStatCard
                  title="本月收入"
                  value={formatMoney(data.monthRevenue)}
                  subtitle={`${data.monthCompleted} 笔完成订单`}
                  character="chiikawa"
                  variant="pink"
                />
                <CuteStatCard
                  title="完成订单"
                  value={data.monthCompleted}
                  subtitle="本月已完成"
                  character="hachiware"
                  variant="blue"
                />
                <CuteStatCard
                  title="取消订单"
                  value={data.monthCancelled}
                  subtitle="本月已取消"
                  character="usagi"
                  variant="yellow"
                />
                <CuteStatCard
                  title="客服提成"
                  value={formatMoney(data.monthServiceCommission)}
                  character="usagi"
                  variant="yellow"
                />
                <CuteStatCard
                  title="新增顾客"
                  value={data.newCustomersThisMonth}
                  subtitle={`共${data.totalCustomers}位顾客`}
                  character="kuri"
                  variant="cream"
                />
              </div>
            </section>

            {/* Girl Ranking */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-chiikawa-yellow" />
                  <h2 className="text-lg font-semibold text-chiikawa-brown">妹妹排行</h2>
                </div>
                <button className="text-sm text-chiikawa-brown/70 flex items-center hover:text-chiikawa-brown">
                  查看全部
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <CuteCard variant="cream">
                {data.girlRanking.slice(0, 5).map((girl, index) => (
                  <div
                    key={girl.id}
                    className={cn(
                      "flex items-center gap-3 p-4",
                      index !== data.girlRanking.slice(0, 5).length - 1 && "border-b border-chiikawa-peach/20"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm",
                      index === 0 ? "bg-gradient-to-br from-yellow-300 to-yellow-400 text-white" :
                      index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white" :
                      index === 2 ? "bg-gradient-to-br from-orange-300 to-orange-400 text-white" :
                      "bg-chiikawa-cream text-chiikawa-brown"
                    )}>
                      {index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-chiikawa-pink to-chiikawa-peach flex items-center justify-center text-white font-bold text-sm">
                      {girl.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-chiikawa-brown">{girl.name}</p>
                      <p className="text-sm text-chiikawa-brown/50">{girl.orderCount} 单</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-chiikawa-brown">{formatMoney(girl.revenue)}</p>
                      {index === 0 && <Crown className="w-4 h-4 text-yellow-500 ml-auto" />}
                    </div>
                  </div>
                ))}
              </CuteCard>
            </section>

            {/* Customer Ranking */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-chiikawa-mint" />
                  <h2 className="text-lg font-semibold text-chiikawa-brown">顾客排行</h2>
                </div>
                <button className="text-sm text-chiikawa-brown/70 flex items-center hover:text-chiikawa-brown">
                  查看全部
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <CuteCard variant="mint">
                {data.customerRanking.slice(0, 5).map((customer, index) => (
                  <div
                    key={customer.id}
                    className={cn(
                      "flex items-center gap-3 p-4",
                      index !== data.customerRanking.slice(0, 5).length - 1 && "border-b border-chiikawa-mint/30"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm",
                      index === 0 ? "bg-gradient-to-br from-yellow-300 to-yellow-400 text-white" :
                      index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white" :
                      index === 2 ? "bg-gradient-to-br from-orange-300 to-orange-400 text-white" :
                      "bg-chiikawa-cream text-chiikawa-brown"
                    )}>
                      {index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-chiikawa-blue to-chiikawa-blue-light flex items-center justify-center text-white font-bold text-sm">
                      {customer.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-chiikawa-brown">{customer.name}</p>
                      <p className="text-sm text-chiikawa-brown/50">{customer.orderCount} 单</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-chiikawa-brown">{formatMoney(customer.revenue)}</p>
                      {index === 0 && <Crown className="w-4 h-4 text-yellow-500 ml-auto" />}
                    </div>
                  </div>
                ))}
              </CuteCard>
            </section>

            {/* Girl Trend Chart */}
            {data.girlRanking && data.girlRanking.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-chiikawa-blue" />
                    <h2 className="text-lg font-semibold text-chiikawa-brown">妹妹趋势</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setChartDimension('orders')}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                        chartDimension === 'orders' 
                          ? "bg-chiikawa-pink text-white shadow-sm" 
                          : "bg-chiikawa-cream text-chiikawa-brown"
                      )}
                    >
                      订单量
                    </button>
                    <button
                      onClick={() => setChartDimension('commission')}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                        chartDimension === 'commission' 
                          ? "bg-chiikawa-blue text-white shadow-sm" 
                          : "bg-chiikawa-cream text-chiikawa-brown"
                      )}
                    >
                      妹妹提成
                    </button>
                  </div>
                </div>
                <CuteCard variant="blue" className="p-4">
                  <div className="space-y-3">
                    {data.girlRanking.slice(0, 8).map((girl, index) => {
                      const maxValue = chartDimension === 'orders' 
                        ? Math.max(...data.girlRanking.map(g => g.orderCount))
                        : Math.max(...data.girlRanking.map(g => g.girlIncome))
                      const currentValue = chartDimension === 'orders' ? girl.orderCount : girl.girlIncome
                      const percentage = maxValue > 0 ? (currentValue / maxValue) * 100 : 0
                      
                      return (
                        <div key={girl.id} className="flex items-center gap-3">
                          <span className="w-5 text-xs text-chiikawa-brown/50 text-right">{index + 1}</span>
                          <CharacterAvatar 
                            character={index % 3 === 0 ? 'chiikawa' : index % 3 === 1 ? 'hachiware' : 'usagi'} 
                            size="xs" 
                          />
                          <span className="w-10 text-sm font-medium text-chiikawa-brown truncate">{girl.name}</span>
                          <div className="flex-1 h-6 bg-white/50 rounded-full overflow-hidden relative">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                index === 0 ? "bg-gradient-to-r from-yellow-300 to-yellow-400" :
                                index === 1 ? "bg-gradient-to-r from-gray-300 to-gray-400" :
                                index === 2 ? "bg-gradient-to-r from-orange-300 to-orange-400" :
                                "bg-gradient-to-r from-chiikawa-pink to-chiikawa-blue"
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-medium text-chiikawa-brown">
                              {chartDimension === 'orders' ? `${currentValue}单` : formatMoney(currentValue)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CuteCard>
              </section>
            )}
          </>
        ) : (
          <EmptyDataState />
        )}
      </div>
    </div>
  )
}
