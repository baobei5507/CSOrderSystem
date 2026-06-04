import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Crown, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatMoney } from '@/lib/utils'
import { useApi } from '@/hooks/useApi'
import { useAppStore } from '@/stores/appStore'
import type { Customer, Order, Girl } from '@/types'
import { CuteCard, CharacterAvatar } from '@/components/ChiikawaTheme'

interface GirlStat {
  girlId: string
  girlName: string
  orderCount: number
  totalAmount: number
  completedCount: number
  cancelledCount: number
}

export function CustomerGirlStatsPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const navigate = useNavigate()
  const { currentStore } = useAppStore()
  const { getCustomers, getOrders, getGirls } = useApi()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [girlStats, setGirlStats] = useState<GirlStat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'orders' | 'amount'>('orders')

  useEffect(() => {
    if (currentStore && customerId) {
      loadData()
    }
  }, [currentStore, customerId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [customersData, ordersData, girlsData] = await Promise.all([
        getCustomers(currentStore!.id),
        getOrders(currentStore!.id),
        getGirls(currentStore!.id),
      ])

      const currentCustomer = customersData.find((c: Customer) => c.id === customerId)
      setCustomer(currentCustomer || null)

      // 统计该顾客预约各个妹妹的数据
      const customerOrders = ordersData.filter((o: Order) => o.customerId === customerId)
      
      const statsMap = new Map<string, GirlStat>()
      
      customerOrders.forEach((order: Order) => {
        const girl = girlsData.find((g: Girl) => g.id === order.girlId)
        if (!girl) return

        const existing = statsMap.get(order.girlId)
        if (existing) {
          existing.orderCount++
          existing.totalAmount += order.price || 0
          if (order.status === 'completed') existing.completedCount++
          if (order.status === 'cancelled') existing.cancelledCount++
        } else {
          statsMap.set(order.girlId, {
            girlId: order.girlId,
            girlName: girl.name,
            orderCount: 1,
            totalAmount: order.price || 0,
            completedCount: order.status === 'completed' ? 1 : 0,
            cancelledCount: order.status === 'cancelled' ? 1 : 0,
          })
        }
      })

      let stats = Array.from(statsMap.values())
      
      // 排序
      if (sortBy === 'orders') {
        stats = stats.sort((a, b) => b.orderCount - a.orderCount)
      } else {
        stats = stats.sort((a, b) => b.totalAmount - a.totalAmount)
      }

      setGirlStats(stats)
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentStore) {
    return (
      <div className="flex items-center justify-center h-screen bg-chiikawa-cream">
        <div className="text-center">
          <CharacterAvatar character="kuri" size="lg" className="mx-auto mb-4" />
          <p className="text-chiikawa-brown/60">请先选择店家</p>
        </div>
      </div>
    )
  }

  if (!customer && !isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-chiikawa-cream">
        <div className="text-center">
          <CharacterAvatar character="usagi" size="lg" className="mx-auto mb-4" />
          <p className="text-chiikawa-brown/60">顾客不存在</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 bg-chiikawa-cream">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-chiikawa-peach/30">
        <div className="flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-chiikawa-pink/20" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5 text-chiikawa-brown" />
          </Button>
          <h1 className="text-lg font-semibold text-chiikawa-brown">顾客偏好分析</h1>
          <CharacterAvatar character="chiikawa" size="sm" />
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <div className="p-4 space-y-4">
          {/* 顾客信息 */}
          {customer && (
            <CuteCard variant="blue" className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-chiikawa-blue to-chiikawa-blue-light flex items-center justify-center text-white font-bold text-xl">
                  {customer.name[0]}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-chiikawa-brown">{customer.name}</h2>
                  <p className="text-sm text-chiikawa-brown/60">
                    共预约 {girlStats.reduce((sum, g) => sum + g.orderCount, 0)} 次
                  </p>
                </div>
              </div>
            </CuteCard>
          )}

          {/* 排序切换 */}
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('orders')}
              className={cn(
                "flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all",
                sortBy === 'orders'
                  ? "bg-chiikawa-pink text-white"
                  : "bg-white text-chiikawa-brown shadow-sm"
              )}
            >
              <BarChart3 className="w-4 h-4 inline mr-1" />
              按次数排序
            </button>
            <button
              onClick={() => setSortBy('amount')}
              className={cn(
                "flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all",
                sortBy === 'amount'
                  ? "bg-chiikawa-blue text-white"
                  : "bg-white text-chiikawa-brown shadow-sm"
              )}
            >
              <Crown className="w-4 h-4 inline mr-1" />
              按金额排序
            </button>
          </div>

          {/* 统计列表 */}
          {isLoading ? (
            <div className="text-center py-12">
              <CharacterAvatar character="usagi" size="lg" className="mx-auto mb-4" />
              <p className="text-chiikawa-brown/60">加载中...</p>
            </div>
          ) : girlStats.length === 0 ? (
            <div className="text-center py-12">
              <CharacterAvatar character="rakko" size="xl" className="mx-auto mb-4" />
              <p className="text-chiikawa-brown/60">暂无预约记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {girlStats.map((stat, index) => (
                <CuteCard key={stat.girlId} variant={index === 0 ? 'pink' : index === 1 ? 'blue' : index === 2 ? 'yellow' : 'cream'}>
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {/* 排名 */}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        index === 0 ? "bg-yellow-100 text-yellow-700" :
                        index === 1 ? "bg-gray-200 text-gray-700" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-white/70 text-chiikawa-brown"
                      )}>
                        {index + 1}
                      </div>

                      {/* 妹妹信息 */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-chiikawa-brown">{stat.girlName}</h3>
                        <div className="flex gap-3 mt-1 text-xs">
                          <span className="text-green-600">
                            完成 {stat.completedCount} 次
                          </span>
                          {stat.cancelledCount > 0 && (
                            <span className="text-red-500">
                              取消 {stat.cancelledCount} 次
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 统计数据 */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-chiikawa-brown">
                          {sortBy === 'orders' ? `${stat.orderCount}次` : formatMoney(stat.totalAmount)}
                        </p>
                        <p className="text-xs text-chiikawa-brown/60">
                          {sortBy === 'orders' ? formatMoney(stat.totalAmount) : `${stat.orderCount}次`}
                        </p>
                      </div>
                    </div>

                    {/* 进度条 */}
                    <div className="mt-3 h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          index === 0 ? "bg-gradient-to-r from-yellow-400 to-yellow-500" :
                          index === 1 ? "bg-gradient-to-r from-gray-300 to-gray-400" :
                          index === 2 ? "bg-gradient-to-r from-orange-300 to-orange-400" :
                          "bg-gradient-to-r from-chiikawa-pink to-chiikawa-blue"
                        )}
                        style={{
                          width: `${sortBy === 'orders'
                            ? (stat.orderCount / (girlStats[0]?.orderCount || 1)) * 100
                            : (stat.totalAmount / (girlStats[0]?.totalAmount || 1)) * 100
                          }%`
                        }}
                      />
                    </div>
                  </div>
                </CuteCard>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
