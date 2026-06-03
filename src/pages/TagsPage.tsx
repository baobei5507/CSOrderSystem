import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/stores/appStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tag, Users, TrendingUp, Clock, Palette, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagStat {
  id: string
  name: string
  color: string
  customerCount: number
  createdAt: number
}

interface TagDetail {
  tag: TagStat
  customers: {
    id: string
    nickname: string
    phone: string
    orderCount: number
    totalSpent: number
  }[]
}

export function TagsPage() {
  const { currentStore } = useAppStore()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // 获取标签统计列表
  const { data: tagStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['tagStats', currentStore?.id],
    queryFn: async (): Promise<TagStat[]> => {
      if (!currentStore?.id) return []
      const res = await fetch(`/api/tags/stats?storeId=${currentStore.id}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    enabled: !!currentStore?.id,
  })

  // 获取单个标签详情
  const { data: tagDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['tagDetail', selectedTag],
    queryFn: async (): Promise<TagDetail | null> => {
      if (!selectedTag) return null
      const res = await fetch(`/api/tags/detail?id=${selectedTag}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    enabled: !!selectedTag,
  })

  // 计算统计数据
  const totalTags = tagStats?.length || 0
  const usedTags = tagStats?.filter(t => t.customerCount > 0).length || 0
  const unusedTags = totalTags - usedTags
  const totalCustomersTagged = tagStats?.reduce((sum, t) => sum + t.customerCount, 0) || 0

  // 按使用频率排序（只显示有顾客使用的标签）
  const sortedByUsage = [...(tagStats || [])]
    .filter(t => t.customerCount > 0)
    .sort((a, b) => b.customerCount - a.customerCount)
  const topTags = sortedByUsage.slice(0, 5)

  // 最近新增的标签
  const recentTags = [...(tagStats || [])]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)

  // 按颜色分组统计
  const colorGroups = tagStats?.reduce((acc, tag) => {
    acc[tag.color] = (acc[tag.color] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const colorList = Object.entries(colorGroups).sort((a, b) => b[1] - a[1])

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
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-semibold text-apple-900">标签统计</h1>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-7rem)]">
        <div className="p-4 space-y-4">
          {/* 总览卡片 */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="glass border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-apple-blue/10 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-apple-blue" />
                  </div>
                  <div>
                    {isLoadingStats ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <p className="text-2xl font-bold text-apple-900">{totalTags}</p>
                    )}
                    <p className="text-xs text-apple-400">标签总数</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    {isLoadingStats ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <p className="text-2xl font-bold text-apple-900">{totalCustomersTagged}</p>
                    )}
                    <p className="text-xs text-apple-400">已标记顾客</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    {isLoadingStats ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <p className="text-2xl font-bold text-apple-900">{usedTags}</p>
                    )}
                    <p className="text-xs text-apple-400">在用标签</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-apple-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-apple-500" />
                  </div>
                  <div>
                    {isLoadingStats ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <p className="text-2xl font-bold text-apple-900">{unusedTags}</p>
                    )}
                    <p className="text-xs text-apple-400">未使用标签</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 热门标签排行 */}
          <Card className="glass border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-apple-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-apple-blue" />
                热门标签 TOP5
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingStats ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : topTags.length === 0 ? (
                <p className="text-sm text-apple-400 text-center py-4">暂无标签数据</p>
              ) : (
                <div className="space-y-2">
                  {topTags.map((tag, index) => (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedTag(tag.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                        selectedTag === tag.id 
                          ? "bg-apple-blue/10 ring-1 ring-apple-blue/30" 
                          : "hover:bg-apple-100/50"
                      )}
                    >
                      <span className={cn(
                        "w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center",
                        index === 0 ? "bg-amber-100 text-amber-700" :
                        index === 1 ? "bg-gray-200 text-gray-700" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-apple-100 text-apple-600"
                      )}>
                        {index + 1}
                      </span>
                      <Badge 
                        style={{ backgroundColor: tag.color, color: '#fff' }}
                        className="px-2 py-0.5 text-xs"
                      >
                        {tag.name}
                      </Badge>
                      <div className="flex-1">
                        <div className="h-2 bg-apple-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-apple-blue rounded-full transition-all"
                            style={{ 
                              width: `${topTags[0]?.customerCount ? (tag.customerCount / topTags[0].customerCount) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-apple-600">
                        {tag.customerCount}人
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 颜色分布 */}
          <Card className="glass border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-apple-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-apple-purple" />
                颜色分布
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingStats ? (
                <Skeleton className="h-20 w-full" />
              ) : colorList.length === 0 ? (
                <p className="text-sm text-apple-400 text-center py-4">暂无数据</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {colorList.map(([color, count]) => (
                    <div 
                      key={color}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-apple-50"
                    >
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-apple-600">{count}个</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 最近新增 */}
          <Card className="glass border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-apple-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-500" />
                最近新增标签
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingStats ? (
                <div className="flex gap-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-20" />
                  ))}
                </div>
              ) : recentTags.length === 0 ? (
                <p className="text-sm text-apple-400 text-center py-4">暂无标签</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {recentTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      style={{ backgroundColor: tag.color, color: '#fff' }}
                      className="px-3 py-1.5 text-xs cursor-pointer hover:opacity-80"
                      onClick={() => setSelectedTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 标签详情 - 选中后显示 */}
          {selectedTag && (
            <Card className="glass border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-apple-900">
                    标签顾客详情
                  </CardTitle>
                  <button 
                    onClick={() => setSelectedTag(null)}
                    className="text-xs text-apple-400 hover:text-apple-600"
                  >
                    关闭
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingDetail ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : !tagDetail || tagDetail.customers.length === 0 ? (
                  <p className="text-sm text-apple-400 text-center py-4">暂无关联顾客</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge
                        style={{ backgroundColor: tagDetail.tag.color, color: '#fff' }}
                      >
                        {tagDetail.tag.name}
                      </Badge>
                      <span className="text-xs text-apple-400">
                        共 {tagDetail.customers.length} 位顾客
                      </span>
                    </div>
                    {tagDetail.customers.map((customer) => (
                      <div 
                        key={customer.id}
                        className="flex items-center justify-between p-3 bg-apple-50/50 rounded-xl"
                      >
                        <div>
                          <p className="text-sm font-medium text-apple-900">
                            {customer.nickname || '未命名'}
                          </p>
                          <p className="text-xs text-apple-400">{customer.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-apple-900">
                            {customer.orderCount}单
                          </p>
                          <p className="text-xs text-apple-500">
                            ¥{customer.totalSpent.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
