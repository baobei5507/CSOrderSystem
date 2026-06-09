import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Crown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CuteCard, CharacterAvatar } from '@/components/ChiikawaTheme'

interface DailySummary {
  totalRevenue: number
  totalOrders: number
  totalGirlIncome: number
  totalServiceCommission: number
}

interface GirlDailyStats {
  girlId: string
  girlName: string
  orderCount: number
  income: number
  percentage: number
}

interface DailyOrder {
  id: string
  orderNo: string
  customerName: string
  girlName: string
  packageName: string
  price: number
  girlIncome: number
  serviceCommission: number
  status: 'pending' | 'completed' | 'cancelled'
  createdAt: number
}

interface DailyReportData {
  summary: DailySummary
  girlStats: GirlDailyStats[]
  orders: DailyOrder[]
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getDateString(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (formatDate(date) === formatDate(today)) return '今天'
  if (formatDate(date) === formatDate(yesterday)) return '昨天'
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function DailyReportPage() {
  const { currentStore } = useAppStore()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // 获取日报数据
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['dailyReport', currentStore?.id, formatDate(selectedDate)],
    queryFn: async (): Promise<DailyReportData> => {
      if (!currentStore?.id) return { summary: { totalRevenue: 0, totalOrders: 0, totalGirlIncome: 0, totalServiceCommission: 0 }, girlStats: [], orders: [] }
      const res = await fetch(`https://cs-order-api.550759734-d15.workers.dev/api/daily-report?storeId=${currentStore.id}&date=${formatDate(selectedDate)}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    enabled: !!currentStore?.id,
  })

  // 日期导航
  const goToPrevDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    // 不能选择未来日期
    if (newDate > new Date()) return
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  if (!currentStore) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-20 bg-chiikawa-cream">
        <div className="text-center">
          <CharacterAvatar character="hachiwareCute3" size="lg" className="mx-auto mb-4" />
          <p className="text-chiikawa-brown/60">请先选择店铺</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 bg-chiikawa-cream">
      {/* 头部 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-chiikawa-peach/30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-chiikawa-brown">当日业绩</h1>
              <CharacterAvatar character="hachiwareFace6" size="sm" />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToToday}
              className="text-xs rounded-xl border-chiikawa-peach/30 text-chiikawa-brown hover:bg-chiikawa-cream"
            >
              今天
            </Button>
          </div>
          {/* 日期选择 */}
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={goToPrevDay}
              className="p-2 rounded-full hover:bg-chiikawa-pink/20 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-chiikawa-brown" />
            </button>
            <label className="relative flex items-center gap-2 hover:bg-chiikawa-cream px-3 py-1.5 rounded-xl transition-colors cursor-pointer">
              <Calendar className="w-4 h-4 text-chiikawa-brown/50 pointer-events-none" />
              <span className="font-medium text-chiikawa-brown pointer-events-none">
                {getDateString(selectedDate)}
              </span>
              <span className="text-sm text-chiikawa-brown/50 pointer-events-none">
                {selectedDate.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </span>
              <input
                type="date"
                value={formatDate(selectedDate)}
                max={formatDate(new Date())}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(new Date(e.target.value))
                  }
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </label>
            <button 
              onClick={goToNextDay}
              className="p-2 rounded-full hover:bg-chiikawa-pink/20 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-chiikawa-brown" />
            </button>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-4 space-y-4">
          {/* 汇总卡片 */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : reportData?.summary ? (
            <div className="grid grid-cols-2 gap-3">
              <CuteCard variant="blue" className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-chiikawa-blue" />
                      <span className="text-xs text-chiikawa-brown/70">今日收入</span>
                    </div>
                    <p className="text-2xl font-bold text-chiikawa-brown">¥{reportData.summary.totalRevenue.toLocaleString()}</p>
                  </div>
                  <CharacterAvatar character="hachiwareFace7" size="sm" />
                </div>
              </CuteCard>
              <CuteCard variant="pink" className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-chiikawa-pink" />
                      <span className="text-xs text-chiikawa-brown/70">订单数</span>
                    </div>
                    <p className="text-2xl font-bold text-chiikawa-brown">{reportData.summary.totalOrders}</p>
                  </div>
                  <CharacterAvatar character="hachiwareFace8" size="sm" />
                </div>
              </CuteCard>
              <CuteCard variant="yellow" className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-chiikawa-yellow" />
                      <span className="text-xs text-chiikawa-brown/70">妹妹总收入</span>
                    </div>
                    <p className="text-2xl font-bold text-chiikawa-brown">¥{reportData.summary.totalGirlIncome.toLocaleString()}</p>
                  </div>
                  <CharacterAvatar character="hachiwareFace9" size="sm" />
                </div>
              </CuteCard>
              <CuteCard variant="mint" className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-chiikawa-brown/70">客服总提成</span>
                    </div>
                    <p className="text-2xl font-bold text-chiikawa-brown">¥{reportData.summary.totalServiceCommission.toLocaleString()}</p>
                  </div>
                  <CharacterAvatar character="hachiwareFace10" size="sm" />
                </div>
              </CuteCard>
            </div>
          ) : null}

          {/* 妹妹当日排行 */}
          <CuteCard variant="pink">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-chiikawa-brown">妹妹当日单量排行</span>
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : reportData?.girlStats.length ? (
                <div className="space-y-3">
                  {reportData.girlStats.map((girl, index) => (
                    <div key={girl.girlId} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          index === 0 && "bg-yellow-100 text-yellow-700",
                          index === 1 && "bg-gray-200 text-gray-700",
                          index === 2 && "bg-orange-100 text-orange-700",
                          index > 2 && "bg-chiikawa-cream text-chiikawa-brown"
                        )}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-chiikawa-brown">{girl.girlName}</span>
                            <span className="text-sm font-semibold text-chiikawa-brown">{girl.orderCount}单</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-chiikawa-brown/60">
                            <span>收入 ¥{girl.income.toLocaleString()}</span>
                            <span>占比 {girl.percentage}%</span>
                          </div>
                        </div>
                      </div>
                      {/* 进度条 */}
                      <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            index === 0 ? "bg-gradient-to-r from-yellow-400 to-yellow-500" :
                            index === 1 ? "bg-gradient-to-r from-gray-300 to-gray-400" :
                            index === 2 ? "bg-gradient-to-r from-orange-300 to-orange-400" :
                            "bg-gradient-to-r from-chiikawa-pink to-chiikawa-blue"
                          )}
                          style={{ width: `${girl.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CharacterAvatar character="hachiwareCute1" size="md" className="mx-auto mb-3" />
                  <p className="text-chiikawa-brown/60">当日暂无数据</p>
                </div>
              )}
            </div>
          </CuteCard>

          {/* 当日订单明细 */}
          <CuteCard variant="yellow">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-chiikawa-yellow" />
                <span className="text-sm font-medium text-chiikawa-brown">当日订单明细 ({reportData?.orders.length || 0})</span>
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : reportData?.orders.length ? (
                <div className="space-y-2">
                  {reportData.orders.map((order) => (
                    <div 
                      key={order.id} 
                      className="p-3 bg-white/50 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-chiikawa-brown/50">{order.orderNo}</span>
                          <Badge 
                            variant={order.status === 'completed' ? 'default' : order.status === 'cancelled' ? 'secondary' : 'outline'}
                            className={cn(
                              "text-xs",
                              order.status === 'completed' ? "bg-green-100 text-green-700 hover:bg-green-100" :
                              order.status === 'cancelled' ? "bg-gray-100 text-gray-700 hover:bg-gray-100" :
                              "bg-chiikawa-cream text-chiikawa-brown"
                            )}
                          >
                            {order.status === 'completed' ? '已完成' : order.status === 'cancelled' ? '已取消' : '待完成'}
                          </Badge>
                        </div>
                        <span className="font-semibold text-chiikawa-brown">¥{order.price}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-chiikawa-brown/60">
                        <span>顾客: {order.customerName}</span>
                        <span>妹妹: {order.girlName}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-chiikawa-pink">妹妹收入: ¥{order.girlIncome}</span>
                        <span className="text-green-600">客服提成: ¥{order.serviceCommission}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CharacterAvatar character="hachiwareCute2" size="md" className="mx-auto mb-3" />
                  <p className="text-chiikawa-brown/60">当日暂无订单</p>
                </div>
              )}
            </div>
          </CuteCard>
        </div>
      </ScrollArea>
    </div>
  )
}
