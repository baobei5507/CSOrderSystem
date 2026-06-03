import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/stores/appStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  Users, 
  Heart, 
  Package, 
  Tag, 
  Clock,
  TrendingUp,
  Crown,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 时间范围选项
type TimeRange = 'month' | '3months' | '6months' | 'all'

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

interface TagAnalysis {
  tagId: string
  tagName: string
  tagColor: string
  customerCount: number
  totalSpent: number
  avgOrderValue: number
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
  tagAnalysis: TagAnalysis[]
  inactiveCustomers: InactiveCustomer[]
}

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: 'month', label: '本月' },
  { value: '3months', label: '近3月' },
  { value: '6months', label: '近半年' },
  { value: 'all', label: '全部' },
]

export function AnalysisPage() {
  const { currentStore } = useAppStore()
  const [timeRange, setTimeRange] = useState<TimeRange>('month')

  // 获取分析数据
  const { data: analysisData, isLoading } = useQuery({
    queryKey: ['customerAnalysis', currentStore?.id, timeRange],
    queryFn: async (): Promise<AnalysisData> => {
      if (!currentStore?.id) return { customerRankings: [], girlPreferences: [], packagePreferences: [], tagAnalysis: [], inactiveCustomers: [] }
      const res = await fetch(`https://cs-order-api.550759734-d15.workers.dev/api/analysis/customer-preferences?storeId=${currentStore.id}&range=${timeRange}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    enabled: !!currentStore?.id,
  })

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
      <div className="flex items-center justify-center min-h-screen pb-20">
        <p className="text-apple-400">请先选择店铺</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 bg-apple-50">
      {/* 头部 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-apple-200/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-apple-900">顾客偏好分析</h1>
          </div>
          {/* 时间范围选择 */}
          <div className="flex gap-2">
            {timeRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={timeRange === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(option.value)}
                className={cn(
                  "flex-1 text-xs",
                  timeRange === option.value && "bg-apple-blue text-white"
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-140px)]">
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
              <Card className="bg-gradient-to-br from-apple-blue/10 to-apple-blue/5 border-apple-blue/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-apple-blue" />
                    <span className="text-xs text-apple-500">活跃顾客</span>
                  </div>
                  <p className="text-2xl font-bold text-apple-900">{summary.totalCustomers}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-apple-500">总收入</span>
                  </div>
                  <p className="text-2xl font-bold text-apple-900">¥{summary.totalRevenue.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-apple-500">订单总数</span>
                  </div>
                  <p className="text-2xl font-bold text-apple-900">{summary.totalOrders}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-xs text-apple-500">沉睡顾客</span>
                  </div>
                  <p className="text-2xl font-bold text-apple-900">{summary.inactiveCount}</p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* 消费排行榜 TOP10 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-500" />
                消费排行榜 TOP10
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : analysisData?.customerRankings.slice(0, 10).length ? (
                <div className="space-y-2">
                  {analysisData.customerRankings.slice(0, 10).map((customer, index) => (
                    <div
                      key={customer.customerId}
                      className="flex items-center gap-3 p-3 bg-apple-50 rounded-lg"
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        index === 0 && "bg-yellow-100 text-yellow-700",
                        index === 1 && "bg-gray-200 text-gray-700",
                        index === 2 && "bg-orange-100 text-orange-700",
                        index > 2 && "bg-apple-100 text-apple-600"
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-apple-900 truncate">{customer.customerName}</p>
                          {customer.tags.slice(0, 2).map((tag) => (
                            <div
                              key={tag.id}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: tag.color }}
                              title={tag.name}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-apple-500">
                          {customer.orderCount}单 · 客均¥{Math.round(customer.avgOrderValue)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-apple-900">¥{customer.totalSpent.toLocaleString()}</p>
                        {customer.favoriteGirlName && (
                          <p className="text-xs text-apple-400 truncate max-w-20">
                            偏爱: {customer.favoriteGirlName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-apple-400 py-8">暂无数据</p>
              )}
            </CardContent>
          </Card>

          {/* 妹妹偏好排行 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                妹妹人气排行 TOP5
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : analysisData?.girlPreferences.slice(0, 5).length ? (
                <div className="space-y-2">
                  {analysisData.girlPreferences.slice(0, 5).map((girl, index) => (
                    <div
                      key={girl.girlId}
                      className="flex items-center gap-3 p-3 bg-apple-50 rounded-lg"
                    >
                      <span className="text-xs font-bold text-apple-400 w-4">{index + 1}</span>
                      <div className="flex-1">
                        <p className="font-medium text-apple-900">{girl.girlName}</p>
                        <p className="text-xs text-apple-500">{girl.uniqueCustomers}位顾客 · {girl.orderCount}单</p>
                      </div>
                      <p className="font-semibold text-apple-900">¥{girl.totalRevenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-apple-400 py-8">暂无数据</p>
              )}
            </CardContent>
          </Card>

          {/* 套餐偏好排行 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                热门套餐 TOP5
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
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
                      className="flex items-center gap-3 p-3 bg-apple-50 rounded-lg"
                    >
                      <span className="text-xs font-bold text-apple-400 w-4">{index + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-apple-900">{pkg.packageName}</p>
                          <Badge variant="secondary" className="text-xs">{pkg.packageCode}</Badge>
                        </div>
                        <p className="text-xs text-apple-500">{pkg.orderCount}单</p>
                      </div>
                      <p className="font-semibold text-apple-900">¥{pkg.totalRevenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-apple-400 py-8">暂无数据</p>
              )}
            </CardContent>
          </Card>

          {/* 标签群体分析 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-500" />
                标签群体消费分析
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : analysisData?.tagAnalysis.length ? (
                <div className="space-y-2">
                  {analysisData.tagAnalysis.map((tag) => (
                    <div
                      key={tag.tagId}
                      className="flex items-center gap-3 p-3 bg-apple-50 rounded-lg"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.tagColor }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-apple-900">{tag.tagName}</p>
                        <p className="text-xs text-apple-500">{tag.customerCount}人 · 客均¥{Math.round(tag.avgOrderValue)}</p>
                      </div>
                      <p className="font-semibold text-apple-900">¥{tag.totalSpent.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-apple-400 py-8">暂无数据</p>
              )}
            </CardContent>
          </Card>

          {/* 沉睡顾客预警 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                沉睡顾客预警 (30天未消费)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
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
                      className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-apple-900">{customer.customerName}</p>
                        <p className="text-xs text-orange-600">
                          {customer.daysSinceLastOrder}天未消费 · 历史{customer.orderCount}单
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-apple-900">¥{customer.totalSpent.toLocaleString()}</p>
                        <p className="text-xs text-apple-400">
                          {new Date(customer.lastOrderDate).toLocaleDateString()}最后消费
                        </p>
                      </div>
                    </div>
                  ))}
                  {analysisData.inactiveCustomers.length > 5 && (
                    <p className="text-center text-xs text-apple-400 py-2">
                      还有 {analysisData.inactiveCustomers.length - 5} 位沉睡顾客
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-apple-400 py-8">暂无沉睡顾客</p>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
