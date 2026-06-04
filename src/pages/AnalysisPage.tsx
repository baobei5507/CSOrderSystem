import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/stores/appStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  BarChart3, 
  Users, 
  Heart, 
  Package, 
  Clock,
  TrendingUp,
  AlertCircle,
  Search,
  X,
  ChevronLeft,
  Crown,
  LineChart
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CuteCard, CharacterAvatar, ChiikawaLoading } from '@/components/ChiikawaTheme'

// 时间范围选项
type TimeRange = 'month' | '3months' | '6months' | 'year'
type TrendDimension = 'count' | 'income'

interface CustomerPreference {
  customerId: string
  customerName: string
  totalSpent: number
  orderCount: number
  avgOrderValue: number
  lastOrderDate: number
  favoriteGirlId?: string
  favoriteGirlName?: string
  favoritePackageId?: string
  favoritePackageName?: string
  tags: { id: string; name: string; color: string }[]
}

interface GirlPreference {
  girlId: string
  girlName: string
  orderCount: number
  totalRevenue: number
  uniqueCustomers: number
}

interface PackagePreference {
  packageId: string
  packageName: string
  packageCode: string
  orderCount: number
  totalRevenue: number
}

interface InactiveCustomer {
  customerId: string
  customerName: string
  lastOrderDate: number
  daysSinceLastOrder: number
  totalSpent: number
  orderCount: number
}

interface AnalysisData {
  customerRankings: CustomerPreference[]
  girlPreferences: GirlPreference[]
  packagePreferences: PackagePreference[]
  inactiveCustomers: InactiveCustomer[]
}

interface CustomerDetailData {
  customer: {
    id: string
    name: string
    totalOrders: number
    totalSpent: number
  }
  girlStats: {
    girlId: string
    girlName: string
    orderCount: number
    totalSpent: number
  }[]
  packageStats: {
    packageId: string
    packageName: string
    packageCode: string
    orderCount: number
    totalSpent: number
  }[]
  recentOrders: {
    id: string
    orderNo: string
    girlName: string
    packageName: string
    price: number
    createdAt: number
  }[]
}

interface TrendData {
  trendData: {
    date: string
    label: string
    [key: string]: number | string
  }[]
  girlLegend: { id: string; name: string; color: string }[]
  groupBy: 'day' | 'week' | 'month'
}

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: 'month', label: '本月' },
  { value: '3months', label: '近3月' },
  { value: '6months', label: '近半年' },
  { value: 'year', label: '近一年' },
]

export function AnalysisPage() {
  const { currentStore } = useAppStore()
  const [timeRange, setTimeRange] = useState<TimeRange>('6months')
  const [trendDimension, setTrendDimension] = useState<TrendDimension>('count')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerPreference | null>(null)

  // 获取分析数据
  const { data: analysisData, isLoading } = useQuery({
    queryKey: ['customerAnalysis', currentStore?.id, timeRange],
    queryFn: async (): Promise<AnalysisData> => {
      if (!currentStore?.id) return { customerRankings: [], girlPreferences: [], packagePreferences: [], inactiveCustomers: [] }
      const res = await fetch(`https://cs-order-api.550759734-d15.workers.dev/api/analysis/customer-preferences?storeId=${currentStore.id}&range=${timeRange}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    enabled: !!currentStore?.id,
  })

  // 获取趋势数据
  const { data: trendData, isLoading: isLoadingTrend } = useQuery({
    queryKey: ['girlTrends', currentStore?.id, timeRange],
    queryFn: async (): Promise<TrendData> => {
      if (!currentStore?.id) return { trendData: [], girlLegend: [], groupBy: 'month' }
      const res = await fetch(`https://cs-order-api.550759734-d15.workers.dev/api/trends/girl-trends?storeId=${currentStore.id}&range=${timeRange}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    enabled: !!currentStore?.id,
  })

  // 获取选中顾客的详细分析
  const { data: customerDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['customerDetail', currentStore?.id, selectedCustomer?.customerId],
    queryFn: async (): Promise<CustomerDetailData> => {
      if (!currentStore?.id || !selectedCustomer?.customerId) throw new Error('Missing params')
      const res = await fetch(`https://cs-order-api.550759734-d15.workers.dev/api/analysis/customer-detail?storeId=${currentStore.id}&customerId=${selectedCustomer.customerId}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    enabled: !!currentStore?.id && !!selectedCustomer?.customerId,
  })

  // 搜索顾客
  const filteredCustomers = useMemo(() => {
    if (!analysisData?.customerRankings || !searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    return analysisData.customerRankings.filter(c => 
      c.customerName.toLowerCase().includes(query)
    ).slice(0, 10)
  }, [analysisData?.customerRankings, searchQuery])

  // 计算汇总数据
  const summary = useMemo(() => {
    if (!analysisData) return null
    return {
      totalCustomers: analysisData.customerRankings.length,
      totalRevenue: analysisData.customerRankings.reduce((sum, c) => sum + c.totalSpent, 0),
      totalOrders: analysisData.customerRankings.reduce((sum, c) => sum + c.orderCount, 0),
      inactiveCount: analysisData.inactiveCustomers.length,
    }
  }, [analysisData])

  if (!currentStore) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-20 bg-chiikawa-cream">
        <div className="text-center">
          <CharacterAvatar character="kuri" size="lg" className="mx-auto mb-4" />
          <p className="text-chiikawa-brown/60">请先选择店铺</p>
        </div>
      </div>
    )
  }

  // 顾客详情视图
  if (selectedCustomer) {
    return (
      <div className="min-h-screen pb-24 bg-chiikawa-cream">
        {/* 头部 */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-chiikawa-peach/30">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-2 -ml-2 rounded-full hover:bg-chiikawa-pink/20 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-chiikawa-brown" />
              </button>
              <h1 className="text-lg font-semibold text-chiikawa-brown">顾客偏好分析</h1>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-4 space-y-4">
            {/* 顾客信息 */}
            <CuteCard variant="blue" className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-chiikawa-blue to-chiikawa-blue-light flex items-center justify-center text-white font-bold text-xl">
                  {selectedCustomer.customerName[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-chiikawa-brown">{selectedCustomer.customerName}</h2>
                  <div className="flex gap-4 text-sm mt-1">
                    <span className="text-chiikawa-brown/70">总消费: <span className="font-semibold text-chiikawa-brown">¥{selectedCustomer.totalSpent.toLocaleString()}</span></span>
                    <span className="text-chiikawa-brown/70">总订单: <span className="font-semibold text-chiikawa-brown">{selectedCustomer.orderCount}单</span></span>
                  </div>
                </div>
              </div>
            </CuteCard>

            {/* 妹妹偏好分析 */}
            <CuteCard variant="pink">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-4 h-4 text-chiikawa-pink" />
                  <span className="text-sm font-medium text-chiikawa-brown">妹妹偏好排行（按次数）</span>
                </div>
                {isLoadingDetail ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : customerDetail?.girlStats.length ? (
                  <div className="space-y-2">
                    {customerDetail.girlStats.map((girl, index) => (
                      <div
                        key={girl.girlId}
                        className="flex items-center gap-3 p-3 bg-white/50 rounded-xl"
                      >
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
                          <p className="font-medium text-chiikawa-brown">{girl.girlName}</p>
                          <p className="text-xs text-chiikawa-brown/60">消费 ¥{girl.totalSpent.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-chiikawa-brown">{girl.orderCount}次</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CharacterAvatar character="rakko" size="md" className="mx-auto mb-3" />
                    <p className="text-chiikawa-brown/60">暂无数据</p>
                  </div>
                )}
              </div>
            </CuteCard>

            {/* 套餐偏好分析 */}
            <CuteCard variant="blue">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-chiikawa-blue" />
                  <span className="text-sm font-medium text-chiikawa-brown">套餐偏好排行（按次数）</span>
                </div>
                {isLoadingDetail ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : customerDetail?.packageStats.length ? (
                  <div className="space-y-2">
                    {customerDetail.packageStats.map((pkg, index) => (
                      <div
                        key={pkg.packageId}
                        className="flex items-center gap-3 p-3 bg-white/50 rounded-xl"
                      >
                        <span className="text-xs font-bold text-chiikawa-brown/40 w-4">{index + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-chiikawa-brown">{pkg.packageName}</p>
                            <Badge variant="secondary" className="text-xs bg-chiikawa-cream text-chiikawa-brown">{pkg.packageCode}</Badge>
                          </div>
                          <p className="text-xs text-chiikawa-brown/60">消费 ¥{pkg.totalSpent.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-chiikawa-brown">{pkg.orderCount}次</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CharacterAvatar character="usagi" size="md" className="mx-auto mb-3" />
                    <p className="text-chiikawa-brown/60">暂无数据</p>
                  </div>
                )}
              </div>
            </CuteCard>

            {/* 最近订单 */}
            <CuteCard variant="yellow">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-chiikawa-yellow" />
                  <span className="text-sm font-medium text-chiikawa-brown">最近订单 ({customerDetail?.recentOrders.length || 0})</span>
                </div>
                {isLoadingDetail ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : customerDetail?.recentOrders.length ? (
                  <div className="space-y-2">
                    {customerDetail.recentOrders.map((order) => (
                      <div 
                        key={order.id} 
                        className="p-3 bg-white/50 rounded-xl space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-chiikawa-brown/50">{order.orderNo}</span>
                          <span className="font-semibold text-chiikawa-brown">¥{order.price}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-chiikawa-brown/60">
                          <span>妹妹: {order.girlName}</span>
                          <span>套餐: {order.packageName}</span>
                        </div>
                        <p className="text-xs text-chiikawa-brown/50">
                          {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CharacterAvatar character="hachiware" size="md" className="mx-auto mb-3" />
                    <p className="text-chiikawa-brown/60">暂无订单</p>
                  </div>
                )}
              </div>
            </CuteCard>
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 bg-chiikawa-cream">
      {/* 头部 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-chiikawa-peach/30">
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-chiikawa-brown">顾客偏好分析</h1>
            <CharacterAvatar character="kuri" size="sm" />
          </div>
          
          {/* 顾客搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-chiikawa-brown/40" />
            <Input
              placeholder="搜索顾客查看偏好分析..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 border-chiikawa-peach/30 focus:border-chiikawa-pink focus:ring-chiikawa-pink/20"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-chiikawa-brown/40" />
              </button>
            )}
          </div>

          {/* 搜索结果 */}
          {searchQuery.trim() && (
            <div className="bg-white rounded-2xl border border-chiikawa-peach/30 shadow-sm max-h-48 overflow-auto">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.customerId}
                    onClick={() => {
                      setSelectedCustomer(customer)
                      setSearchQuery('')
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-chiikawa-cream border-b border-chiikawa-peach/20 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-chiikawa-brown">{customer.customerName}</span>
                      <span className="text-xs text-chiikawa-brown/60">{customer.orderCount}单</span>
                    </div>
                    <p className="text-xs text-chiikawa-brown/50">偏爱: {customer.favoriteGirlName || '暂无'}</p>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-chiikawa-brown/60">未找到顾客</p>
              )}
            </div>
          )}

          {/* 时间范围选择 */}
          <div className="flex gap-2">
            {timeRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={timeRange === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(option.value)}
                className={cn(
                  "flex-1 text-xs rounded-xl",
                  timeRange === option.value 
                    ? "bg-chiikawa-pink text-white border-chiikawa-pink hover:bg-chiikawa-pink/90" 
                    : "border-chiikawa-peach/30 text-chiikawa-brown hover:bg-chiikawa-cream"
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-4 space-y-4">
          {/* 汇总卡片 */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : summary ? (
            <div className="grid grid-cols-2 gap-3">
              <CuteCard variant="blue" className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-chiikawa-blue" />
                      <span className="text-xs text-chiikawa-brown/70">活跃顾客</span>
                    </div>
                    <p className="text-2xl font-bold text-chiikawa-brown">{summary.totalCustomers}</p>
                  </div>
                  <CharacterAvatar character="chiikawa" size="sm" />
                </div>
              </CuteCard>
              <CuteCard variant="pink" className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-chiikawa-pink" />
                      <span className="text-xs text-chiikawa-brown/70">总收入</span>
                    </div>
                    <p className="text-2xl font-bold text-chiikawa-brown">¥{summary.totalRevenue.toLocaleString()}</p>
                  </div>
                  <CharacterAvatar character="usagi" size="sm" />
                </div>
              </CuteCard>
              <CuteCard variant="yellow" className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-chiikawa-yellow" />
                      <span className="text-xs text-chiikawa-brown/70">订单总数</span>
                    </div>
                    <p className="text-2xl font-bold text-chiikawa-brown">{summary.totalOrders}</p>
                  </div>
                  <CharacterAvatar character="hachiware" size="sm" />
                </div>
              </CuteCard>
              <CuteCard variant="cream" className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <span className="text-xs text-chiikawa-brown/70">沉睡顾客</span>
                    </div>
                    <p className="text-2xl font-bold text-chiikawa-brown">{summary.inactiveCount}</p>
                  </div>
                  <CharacterAvatar character="kuri" size="sm" />
                </div>
              </CuteCard>
            </div>
          ) : null}

          {/* 妹妹趋势图 */}
          <CuteCard variant="mint">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-chiikawa-brown" />
                  <span className="text-sm font-medium text-chiikawa-brown">妹妹趋势分析</span>
                </div>
                {/* 维度切换 */}
                <div className="flex bg-white/50 rounded-xl p-0.5">
                  <button
                    onClick={() => setTrendDimension('count')}
                    className={cn(
                      "px-3 py-1 text-xs rounded-lg transition-all",
                      trendDimension === 'count' 
                        ? "bg-white text-chiikawa-brown shadow-sm" 
                        : "text-chiikawa-brown/60 hover:text-chiikawa-brown"
                    )}
                  >
                    单量
                  </button>
                  <button
                    onClick={() => setTrendDimension('income')}
                    className={cn(
                      "px-3 py-1 text-xs rounded-lg transition-all",
                      trendDimension === 'income' 
                        ? "bg-white text-chiikawa-brown shadow-sm" 
                        : "text-chiikawa-brown/60 hover:text-chiikawa-brown"
                    )}
                  >
                    收入
                  </button>
                </div>
              </div>
              
              {isLoadingTrend ? (
                <Skeleton className="h-64" />
              ) : trendData?.trendData.length ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReLineChart data={trendData.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F5E6D3" />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 10, fill: '#8B7355' }}
                        tickMargin={8}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#8B7355' }}
                        tickFormatter={(value) => trendDimension === 'income' ? `¥${value}` : value}
                      />
                      <Tooltip 
                        formatter={(value, name) => {
                          const girlName = String(name).replace(`_${trendDimension}`, '')
                          const displayValue = trendDimension === 'income' ? `¥${value}` : value
                          return [displayValue, girlName]
                        }}
                        labelFormatter={(label) => String(label)}
                        contentStyle={{ 
                          borderRadius: 12, 
                          border: 'none', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: 12,
                          backgroundColor: 'white'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: 10, paddingTop: 10 }}
                        iconType="square"
                      />
                      {trendData.girlLegend.map((girl) => (
                        <Line
                          key={girl.id}
                          type="monotone"
                          dataKey={`${girl.name}_${trendDimension}`}
                          name={girl.name}
                          stroke={girl.color}
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </ReLineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CharacterAvatar character="usagi" size="md" className="mx-auto mb-3" />
                  <p className="text-chiikawa-brown/60">暂无趋势数据</p>
                </div>
              )}
              
              {/* 图例说明 */}
              {trendData?.girlLegend && trendData.girlLegend.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-chiikawa-peach/20">
                  {trendData.girlLegend.slice(0, 8).map((girl) => (
                    <div key={girl.id} className="flex items-center gap-1.5">
                      <div 
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: girl.color }}
                      />
                      <span className="text-xs text-chiikawa-brown/70">{girl.name}</span>
                    </div>
                  ))}
                  {trendData.girlLegend.length > 8 && (
                    <span className="text-xs text-chiikawa-brown/50">+{trendData.girlLegend.length - 8} 更多</span>
                  )}
                </div>
              )}
            </div>
          </CuteCard>

          {/* 妹妹单量排行 - 全量显示，按单量排序 */}
          <CuteCard variant="pink">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-chiikawa-brown">妹妹单量排行（按单量）</span>
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : analysisData?.girlPreferences.length ? (
                <div className="space-y-2">
                  {analysisData.girlPreferences.map((girl, index) => (
                    <div
                      key={girl.girlId}
                      className="flex items-center gap-3 p-3 bg-white/50 rounded-xl"
                    >
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
                        <p className="font-medium text-chiikawa-brown">{girl.girlName}</p>
                        <p className="text-xs text-chiikawa-brown/60">{girl.uniqueCustomers}位顾客</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-chiikawa-brown">{girl.orderCount}单</p>
                        <p className="text-xs text-chiikawa-brown/50">¥{girl.totalRevenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CharacterAvatar character="rakko" size="md" className="mx-auto mb-3" />
                  <p className="text-chiikawa-brown/60">暂无数据</p>
                </div>
              )}
            </div>
          </CuteCard>

          {/* 套餐偏好排行 */}
          <CuteCard variant="blue">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-chiikawa-blue" />
                <span className="text-sm font-medium text-chiikawa-brown">热门套餐 TOP5</span>
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : analysisData?.packagePreferences.slice(0, 5).length ? (
                <div className="space-y-2">
                  {analysisData.packagePreferences.slice(0, 5).map((pkg, index) => (
                    <div
                      key={pkg.packageId}
                      className="flex items-center gap-3 p-3 bg-white/50 rounded-xl"
                    >
                      <span className="text-xs font-bold text-chiikawa-brown/40 w-4">{index + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-chiikawa-brown">{pkg.packageName}</p>
                          <Badge variant="secondary" className="text-xs bg-chiikawa-cream text-chiikawa-brown">{pkg.packageCode}</Badge>
                        </div>
                        <p className="text-xs text-chiikawa-brown/60">{pkg.orderCount}单</p>
                      </div>
                      <p className="font-semibold text-chiikawa-brown">¥{pkg.totalRevenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CharacterAvatar character="usagi" size="md" className="mx-auto mb-3" />
                  <p className="text-chiikawa-brown/60">暂无数据</p>
                </div>
              )}
            </div>
          </CuteCard>

          {/* 沉睡顾客预警 */}
          <CuteCard variant="cream" className="border-orange-200">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-chiikawa-brown">沉睡顾客预警 (30天未消费)</span>
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : analysisData?.inactiveCustomers.slice(0, 5).length ? (
                <div className="space-y-2">
                  {analysisData.inactiveCustomers.slice(0, 5).map((customer) => (
                    <div
                      key={customer.customerId}
                      className="flex items-center gap-3 p-3 bg-orange-50/50 rounded-xl border border-orange-100"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-chiikawa-brown">{customer.customerName}</p>
                        <p className="text-xs text-orange-600">
                          {customer.daysSinceLastOrder}天未消费 · 历史{customer.orderCount}单
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-chiikawa-brown">¥{customer.totalSpent.toLocaleString()}</p>
                        <p className="text-xs text-chiikawa-brown/50">
                          {new Date(customer.lastOrderDate).toLocaleDateString()}最后消费
                        </p>
                      </div>
                    </div>
                  ))}
                  {analysisData.inactiveCustomers.length > 5 && (
                    <p className="text-center text-xs text-chiikawa-brown/60 py-2">
                      还有 {analysisData.inactiveCustomers.length - 5} 位沉睡顾客
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CharacterAvatar character="chiikawa" size="md" className="mx-auto mb-3" />
                  <p className="text-chiikawa-brown/60">暂无沉睡顾客</p>
                </div>
              )}
            </div>
          </CuteCard>
        </div>
      </ScrollArea>
    </div>
  )
}
