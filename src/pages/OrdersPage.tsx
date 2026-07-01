import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Clock, CheckCircle2, XCircle, UserPlus, Trash2, Crown, Wallet, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, formatDateTime } from '@/lib/utils'
import { useApi } from '@/hooks/useApi'
import { useAppStore } from '@/stores/appStore'
import { EmptyOrdersState } from '@/components/EmptyState'
import { CuteCard, CharacterAvatar, ChiikawaLoading } from '@/components/ChiikawaTheme'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Order, Customer, Girl, Package, Tag } from '@/types'

// 会员等级配置类型
interface MemberLevel {
  level: number
  name: string
  minRecharge: number
  regularDiscount: number
  memberDayDiscount: number
}

interface MemberConfig {
  enabled: boolean
  levels: MemberLevel[]
  memberDays: number[]
  minBalancePercent: number
}

const PLATFORM_OPTIONS = [
  { value: 'wechat', label: '微信' },
  { value: 'telegram', label: 'Telegram' },
]

type OrderStatus = 'pending' | 'completed' | 'cancelled'

interface OrderWithDetails extends Order {
  customerName?: string
  girlName?: string
  packageName?: string
}

const statusMap: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待完成', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  completed: { label: '已完成', color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { label: '已取消', color: 'text-gray-600', bgColor: 'bg-gray-100' },
}

// 按日期分组展示订单组件
interface OrderListByDateProps {
  orders: OrderWithDetails[]
  expandedDates: Set<string>
  setExpandedDates: (dates: Set<string>) => void
  onStatusChange: (orderId: string, status: OrderStatus) => void
  onOrderClick: (order: OrderWithDetails) => void
  onEdit: (order: OrderWithDetails) => void
  onDelete: (order: OrderWithDetails) => void
  secondStaffName?: string
}

function OrderListByDate({ orders, expandedDates, setExpandedDates, onStatusChange, onOrderClick, onEdit, onDelete, secondStaffName }: OrderListByDateProps) {
  // 按日期分组
  const groupedOrders = useMemo(() => {
    const groups: Record<string, OrderWithDetails[]> = {}
    orders.forEach(order => {
      const date = new Date(order.createdAt).toDateString()
      if (!groups[date]) groups[date] = []
      groups[date].push(order)
    })
    // 按日期降序排列
    return Object.entries(groups).sort((a, b) => 
      new Date(b[0]).getTime() - new Date(a[0]).getTime()
    )
  }, [orders])

  // 获取日期标签
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return '今日'
    if (date.toDateString() === yesterday.toDateString()) return '昨日'
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })
  }

  // 切换展开状态
  const toggleDate = (date: string) => {
    const newSet = new Set(expandedDates)
    if (newSet.has(date)) {
      newSet.delete(date)
    } else {
      newSet.add(date)
    }
    setExpandedDates(newSet)
  }

  // 展开/折叠所有
  const expandAll = () => {
    setExpandedDates(new Set(groupedOrders.map(([date]) => date)))
  }
  const collapseAll = () => {
    setExpandedDates(new Set())
  }

  return (
    <div className="space-y-2">
      {/* 批量操作按钮 */}
      <div className="flex gap-2 mb-3">
        <Button
          variant="outline"
          size="sm"
          className="text-xs rounded-lg border-chiikawa-peach/30"
          onClick={expandAll}
        >
          展开全部
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs rounded-lg border-chiikawa-peach/30"
          onClick={collapseAll}
        >
          折叠全部
        </Button>
      </div>

      {groupedOrders.map(([date, dateOrders]) => {
        const isExpanded = expandedDates.has(date)
        const pendingCount = dateOrders.filter(o => o.status === 'pending').length

        return (
          <div key={date} className="space-y-2">
            {/* 日期标题栏 */}
            <button
              onClick={() => toggleDate(date)}
              className="w-full flex items-center justify-between p-3 bg-white/80 rounded-xl border border-chiikawa-peach/20 hover:bg-white transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-chiikawa-brown/60" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-chiikawa-brown/60" />
                )}
                <span className="font-medium text-chiikawa-brown">{getDateLabel(date)}</span>
                <Badge variant="secondary" className="text-xs bg-chiikawa-cream text-chiikawa-brown">
                  {dateOrders.length}单
                </Badge>
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-600">
                    {pendingCount}待完成
                  </Badge>
                )}
              </div>
              <span className="text-sm text-chiikawa-brown/50">
                ¥{dateOrders.reduce((sum, o) => {
                  const price = Number(o.finalPrice) || Number(o.price) || 0
                  return sum + price
                }, 0).toFixed(0)}
              </span>
            </button>

            {/* 订单列表 */}
            {isExpanded && (
              <div className="space-y-3 pl-2">
                {dateOrders.map((order) => {
                  const status = statusMap[order.status as OrderStatus]
                  return (
                    <CuteCard
                      key={order.id}
                      variant="cream"
                      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => onOrderClick(order)}
                    >
                      {/* Order Header */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-mono text-chiikawa-brown/40">{order.orderNo}</span>
                        <div className="flex items-center gap-1.5">
                          {order.orderSource === 'otherStaff' && (
                            <Badge className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              {order.otherStaffName || secondStaffName || '其他客服'}
                            </Badge>
                          )}
                          {order.orderSource === 'other' && (
                            <Badge className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                              {order.otherStaffName ? `${order.otherStaffName}` : '其他人'}
                            </Badge>
                          )}
                          <Badge className={cn("text-xs px-2 py-0.5 rounded-full", status.bgColor, status.color)}>
                            {status.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-chiikawa-blue to-chiikawa-blue-light flex items-center justify-center text-white font-bold text-xs">
                            {order.customerName?.[0] || '?'}
                          </div>
                          <span className="text-sm text-chiikawa-brown/50 w-10">顾客</span>
                          <span className="font-medium text-chiikawa-brown">{order.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-chiikawa-pink to-chiikawa-peach flex items-center justify-center text-white font-bold text-xs">
                            {order.girlName?.[0] || '?'}
                          </div>
                          <span className="text-sm text-chiikawa-brown/50 w-10">妹妹</span>
                          <span className="font-medium text-chiikawa-brown">{order.girlName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-chiikawa-brown/50 w-12 pl-1">套餐</span>
                          <span className="font-medium text-chiikawa-brown">
                            {order.packageName}
                            {order.hours && order.hours > 1 && (
                              <span className="text-sm text-chiikawa-brown/40 ml-1">({order.hours}小时)</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Price & Time */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-chiikawa-peach/20">
                        <div className="flex items-center gap-1 text-chiikawa-brown/50">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">
                            {order.appointmentTime ? formatDateTime(order.appointmentTime) : '立即'}
                          </span>
                        </div>
                        <div className="text-right">
                          {order.finalPrice !== undefined && order.finalPrice !== null && order.finalPrice === 0 ? (
                            // 免单订单
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <span className="text-sm text-chiikawa-brown/40 line-through">
                                ¥{order.totalOriginalAmount ? (order.totalOriginalAmount / 100).toFixed(0) : order.price}
                              </span>
                              <span className="text-lg font-bold text-chiikawa-pink">
                                免单
                              </span>
                              {order.discountType && order.discountType !== 'none' && order.discountType !== 'freeOrder' && (
                                <Badge variant="secondary" className={cn(
                                  "text-xs",
                                  order.discountType === 'memberDay'
                                    ? "bg-chiikawa-pink-light text-chiikawa-pink"
                                    : order.discountType === 'memberRegular'
                                    ? "bg-chiikawa-blue-light text-chiikawa-blue"
                                    : "bg-chiikawa-yellow-light text-yellow-600"
                                )}>
                                  {order.discountType === 'memberDay' ? '会员日' : order.discountType === 'memberRegular' ? '会员' : '优惠'}{order.discountPercent}折
                                </Badge>
                              )}
                              {order.couponSource && (
                                <Badge variant="secondary" className="text-xs bg-chiikawa-lavender text-purple-600">
                                  来源:{order.couponSource}
                                </Badge>
                              )}
                            </div>
                          ) : (order.discountAmount && order.discountAmount > 0) || (order.discountType && order.discountType !== 'none') ? (
                            // 有折扣的订单（含试钟）
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <span className="text-sm text-chiikawa-brown/40 line-through">
                                ¥{order.totalOriginalAmount ? (order.totalOriginalAmount / 100).toFixed(0) : order.price}
                              </span>
                              <span className="text-lg font-bold text-chiikawa-pink">
                                ¥{(order.finalPrice ?? order.price)?.toFixed(2)}
                              </span>
                              {order.discountType && order.discountType !== 'none' && (
                                <Badge variant="secondary" className={cn(
                                  "text-xs",
                                  order.discountType === 'memberDay'
                                    ? "bg-chiikawa-pink-light text-chiikawa-pink"
                                    : order.discountType === 'memberRegular'
                                    ? "bg-chiikawa-blue-light text-chiikawa-blue"
                                    : order.discountType === 'trial'
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-chiikawa-yellow-light text-yellow-600"
                                )}>
                                  {order.discountType === 'memberDay' ? '会员日' : order.discountType === 'memberRegular' ? '会员' : order.discountType === 'trial' ? '试钟' : '优惠'}{order.discountType !== 'trial' && order.discountPercent ? `${order.discountPercent}折` : ''}
                                </Badge>
                              )}
                              {order.discountAmount && order.discountAmount > 0 && (
                                <Badge variant="secondary" className="text-xs bg-chiikawa-yellow-light text-yellow-600">
                                  优惠¥{(order.discountAmount / 100).toFixed(0)}
                                </Badge>
                              )}
                              {order.couponSource && (
                                <Badge variant="secondary" className="text-xs bg-chiikawa-lavender text-purple-600">
                                  来源:{order.couponSource}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-chiikawa-pink">
                              ¥{(Number(order.finalPrice ?? order.price) || 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Commission Info */}
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-purple-500">
                          妹妹收入: ¥{(order.girlIncome || 0).toFixed(2)}
                        </span>
                        <span className={order.orderSource === 'other' ? 'text-orange-400' : order.orderSource === 'otherStaff' ? 'text-blue-500' : 'text-green-500'}>
                          {order.orderSource === 'other' ? '无提成' : `${order.orderSource === 'otherStaff' ? (secondStaffName || '其他客服') : '客服'}提成: ¥${(order.serviceCommission || 0).toFixed(2)}`}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                        {order.status === 'pending' && (
                          <Button
                            size="sm"
                            className="flex-1 bg-green-400 text-white hover:bg-green-500 rounded-xl"
                            onClick={() => onStatusChange(order.id, 'completed')}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            完成
                          </Button>
                        )}
                        {order.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-xl border-chiikawa-peach/50 text-chiikawa-brown"
                            onClick={() => onStatusChange(order.id, 'cancelled')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            取消
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-chiikawa-blue/30 text-chiikawa-blue hover:bg-chiikawa-blue/10"
                          onClick={() => onEdit(order)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-red-200 text-red-500 hover:bg-red-50"
                          onClick={() => onDelete(order)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          删除
                        </Button>
                      </div>
                    </CuteCard>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [girls, setGirls] = useState<Girl[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  
  // 日期分组展开状态（默认只展开今日）
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState({
    customerId: '',
    customerAccountId: '',
    girlId: '',
    packageId: '',
    price: 0,
    discount: 0,
    appointmentDate: '',
    appointmentTime: '',
    hours: 1,
    couponSource: '',
  })

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedGirl, setSelectedGirl] = useState<Girl | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [calculatedPrice, setCalculatedPrice] = useState(0)

  // 会员系统相关
  const [memberConfig, setMemberConfig] = useState<MemberConfig | null>(null)
  const [priceCalculation, setPriceCalculation] = useState<{
    basePrice: number
    hours: number
    totalOriginalAmount: number
    priceMarkup?: number
    discountType: 'memberDay' | 'memberRegular' | 'freeOrder' | 'trial' | 'none'
    discountPercent: number
    discountAmount: number
    finalPrice: number
    deductedBalance: number
    breakdown?: { hour: number; originalPrice: number; discountPercent: number; finalPrice: number; type: string }[]
    girlIncome: number
    serviceCommission: number
    usedMemberDayBenefit: boolean
    reason: string
  } | null>(null)

  // 提成预览（基于原价）
  const [serviceCommissionPreview, setServiceCommissionPreview] = useState(0)
  const [girlIncomePreview, setGirlIncomePreview] = useState(0)
  const [finalPricePreview, setFinalPricePreview] = useState(0)

  // 免单开关
  const [isFreeOrder, setIsFreeOrder] = useState(false)

  // 试钟开关
  const [isTrialOrder, setIsTrialOrder] = useState(false)

  // 订单来源选择: 'my'=我的预约, 'otherStaff'=其他客服(有提成), 'other'=其他人(无提成)
  const [orderSourceType, setOrderSourceType] = useState<'my' | 'otherStaff' | 'other'>('my')
  const [otherStaffName, setOtherStaffName] = useState('')

  // 顾客搜索和创建
  const [customerSearch, setCustomerSearch] = useState('')
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [newCustomerAccounts, setNewCustomerAccounts] = useState<{ platform: string; accountId: string; note?: string }[]>([])

  const { currentStore } = useAppStore()
  const { getOrders, getCustomers, getGirls, getPackages, getTags, createOrder, updateOrder, deleteOrder, createTag, updateCustomer, getGirlPackagePrices, createCustomer, getMemberConfig, calculateOrderPrice } = useApi()

  useEffect(() => {
    if (currentStore) {
      loadData()
    }
  }, [currentStore])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [ordersData, customersData, girlsData, packagesData] = await Promise.all([
        getOrders(currentStore!.id),
        getCustomers(currentStore!.id),
        getGirls(currentStore!.id),
        getPackages(currentStore!.id),
      ])

      // 关联数据
      const ordersWithDetails = ordersData.map((order: Order) => ({
        ...order,
        customerName: customersData.find((c: Customer) => c.id === order.customerId)?.name,
        girlName: girlsData.find((g: Girl) => g.id === order.girlId)?.name,
        packageName: packagesData.find((p: Package) => p.id === order.packageId)?.name,
      }))

      setOrders(ordersWithDetails)
      setCustomers(customersData)
      setGirls(girlsData.filter((g: Girl) => g.status === 'active'))
      setPackages(packagesData)
      
      // 默认展开今日订单
      const today = new Date().toDateString()
      const hasTodayOrders = ordersWithDetails.some((o: OrderWithDetails) => 
        new Date(o.createdAt).toDateString() === today
      )
      if (hasTodayOrders) {
        setExpandedDates(new Set([today]))
      }
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 加载会员配置
  useEffect(() => {
    if (currentStore) {
      getMemberConfig(currentStore.id).then(config => {
        setMemberConfig(config)
      }).catch(() => {
        // 会员系统未配置或出错
        setMemberConfig(null)
      })
    }
  }, [currentStore])

  // 计算订单价格和会员折扣
  useEffect(() => {
    const calculatePrice = async () => {
      if (!selectedGirl || !selectedPackage || !currentStore) {
        setPriceCalculation(null)
        return
      }

      // 试钟模式：使用一口价，不参与任何优惠
      if (isTrialOrder && selectedGirl.trialPrice) {
        const trialPrice = selectedGirl.trialPrice
        setCalculatedPrice(trialPrice)
        setFinalPricePreview(trialPrice)
        // 试钟提成基于 trialPrice
        calculateCommissions(trialPrice)
        setPriceCalculation({
          basePrice: trialPrice,
          hours: 1,
          totalOriginalAmount: trialPrice,
          discountType: 'trial',
          discountPercent: 100,
          discountAmount: 0,
          finalPrice: trialPrice,
          deductedBalance: trialPrice,
          girlIncome: calculateCommissionValue(trialPrice, selectedGirl.commissionType, selectedGirl.commissionValue, 1),
          serviceCommission: calculateCommissionValue(trialPrice, currentStore.serviceCommissionType, currentStore.serviceCommissionValue, 1),
          usedMemberDayBenefit: false,
          reason: '试钟一口价，不参与任何优惠',
        })
        return
      }

      try {
        // 获取妹妹套餐价格
        const prices = await getGirlPackagePrices(selectedGirl.id)
        const girlPrice = prices.find(p => p.packageId === selectedPackage.id)
        // 优先使用当日价格，其次常规价格，最后套餐基础价
        const basePrice = girlPrice?.dailyPrice || girlPrice?.price || selectedPackage.basePrice
        setCalculatedPrice(basePrice)

        // 如果有顾客且会员系统启用，调用计算接口
        if (formData.customerId && memberConfig?.enabled) {
          const result = await calculateOrderPrice({
            storeId: currentStore.id,
            customerId: formData.customerId,
            girlId: formData.girlId,
            packageId: formData.packageId,
            hours: formData.hours,
            date: (formData.appointmentDate && formData.appointmentTime) 
              ? `${formData.appointmentDate}T${formData.appointmentTime}` 
              : new Date().toISOString(),
          })
          setPriceCalculation(result)
          setFinalPricePreview(result.finalPrice)
          setServiceCommissionPreview(result.serviceCommission)
          setGirlIncomePreview(result.girlIncome)
        } else {
          // 无会员折扣时的计算
          const totalOriginal = basePrice * formData.hours
          const finalPrice = Math.max(0, totalOriginal - formData.discount)
          setFinalPricePreview(finalPrice)
          calculateCommissions(totalOriginal)
          setPriceCalculation(null)
        }
      } catch (err) {
        console.error('计算价格失败:', err)
        // 使用基础价格计算
        const basePrice = selectedPackage.basePrice
        setCalculatedPrice(basePrice)
        const totalOriginal = basePrice * formData.hours
        const finalPrice = Math.max(0, totalOriginal - formData.discount)
        setFinalPricePreview(finalPrice)
        calculateCommissions(totalOriginal)
      }
    }

    calculatePrice()
  }, [selectedGirl, selectedPackage, formData.customerId, formData.hours, formData.appointmentDate, formData.appointmentTime, memberConfig, isTrialOrder])

  // 提成计算辅助函数
  const calculateCommissionValue = (price: number, type: 'percent' | 'fixed', value: number, hours: number) => {
    if (type === 'percent') {
      return Math.round(price * value / 100 * 100) / 100
    }
    return value * hours
  }

  // 计算提成预览
  const calculateCommissions = (price: number) => {
    if (!currentStore || !selectedGirl) {
      setServiceCommissionPreview(0)
      setGirlIncomePreview(0)
      return
    }

    const hours = formData.hours || 1

    // 客服提成计算
    let serviceCommission = 0
    if (currentStore.serviceCommissionType === 'percent') {
      serviceCommission = price * (currentStore.serviceCommissionValue / 100)
    } else {
      // 固定提成：每小时固定金额 × 小时数
      serviceCommission = currentStore.serviceCommissionValue * hours
    }
    setServiceCommissionPreview(Math.round(serviceCommission * 100) / 100)

    // 妹妹提成计算
    let girlIncome = 0
    if (selectedGirl.commissionType === 'percent') {
      girlIncome = price * (selectedGirl.commissionValue / 100)
    } else {
      // 固定提成：每小时固定金额 × 小时数
      girlIncome = selectedGirl.commissionValue * hours
    }
    setGirlIncomePreview(Math.round(girlIncome * 100) / 100)
  }

  const handleOpenDialog = () => {
    // 获取当前时间并设置为整点
    const now = new Date()
    const currentHour = String(now.getHours()).padStart(2, '0')
    const currentDate = now.toISOString().split('T')[0]
    
    setFormData({
      customerId: '',
      customerAccountId: '',
      girlId: '',
      packageId: '',
      price: 0,
      discount: 0,
      appointmentDate: currentDate,
      appointmentTime: `${currentHour}:00`,
      hours: 1,
      couponSource: '',
    })
    setSelectedCustomer(null)
    setSelectedGirl(null)
    setSelectedPackage(null)
    setPriceCalculation(null)
    setCustomerSearch('')
    setIsCreatingCustomer(false)
    setNewCustomerAccounts([])
    setIsFreeOrder(false)
    setIsTrialOrder(false)
    setOrderSourceType('my')
    setOtherStaffName('')
    setDialogOpen(true)
  }

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId)
    setSelectedCustomer(customer || null)
    setFormData(prev => ({ ...prev, customerId, customerAccountId: '' }))
  }

  const handleGirlChange = (girlId: string) => {
    const girl = girls.find(g => g.id === girlId)
    setSelectedGirl(girl || null)
    setFormData(prev => ({ ...prev, girlId }))
  }

  const handlePackageChange = (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId)
    setSelectedPackage(pkg || null)
    setFormData(prev => ({ ...prev, packageId, price: calculatedPrice }))
  }

  const handleSubmit = async () => {
    if (!formData.girlId || !formData.packageId || !currentStore || isSubmitting) return

    setIsSubmitting(true)

    try {
      let finalCustomerId = formData.customerId
      let newCustomerAccountId: string | undefined

      // 如果是创建新顾客
      if (isCreatingCustomer && customerSearch.trim()) {
        // 验证联系方式：检查是否有未填写完整的账号
        const hasInvalidAccount = newCustomerAccounts.some(a => 
          (a.platform && !a.accountId.trim()) || (!a.platform && a.accountId.trim())
        )
        if (hasInvalidAccount) {
          alert('请填写完整的联系方式（平台和账号ID）')
          return
        }

        // 过滤掉完全空的账号
        const validAccounts = newCustomerAccounts.filter(a => a.platform && a.accountId.trim())
        
        const newCustomer = await createCustomer({
          name: customerSearch.trim(),
          storeId: currentStore.id,
          accounts: validAccounts,
          tagIds: [],
        })
        finalCustomerId = newCustomer.id
        // 如果有创建账号，使用第一个账号ID
        if (newCustomer.accounts && newCustomer.accounts.length > 0) {
          newCustomerAccountId = newCustomer.accounts[0].id
        }
      }

      if (!finalCustomerId) {
        alert('请选择或输入顾客')
        return
      }

      // 构建订单数据，过滤空值
      const orderData: any = {
        customerId: finalCustomerId,
        girlId: formData.girlId,
        packageId: formData.packageId,
        price: calculatedPrice,
        discount: formData.discount || 0,
        storeId: currentStore.id,
        hours: formData.hours,
      }
      
      // 添加会员折扣相关信息
      if (isTrialOrder && selectedGirl?.trialPrice) {
        // 试钟订单：一口价，不参与任何优惠
        const trialPrice = selectedGirl.trialPrice
        orderData.originalPrice = trialPrice
        orderData.totalOriginalAmount = trialPrice
        orderData.discountType = 'trial'
        orderData.discountPercent = 100
        orderData.discountAmount = 0
        orderData.finalPrice = trialPrice
        orderData.deductedBalance = trialPrice
        orderData.usedMemberDayBenefit = 0
        orderData.hours = 1 // 试钟固定1小时
      } else if (priceCalculation) {
        orderData.originalPrice = priceCalculation.basePrice
        orderData.totalOriginalAmount = priceCalculation.totalOriginalAmount
        orderData.discountType = priceCalculation.discountType
        orderData.discountPercent = priceCalculation.discountPercent
        orderData.discountAmount = priceCalculation.discountAmount
        // 免单：finalPrice=0，不扣余额，不消耗会员日权益
        if (isFreeOrder) {
          orderData.finalPrice = 0
          orderData.deductedBalance = 0
          orderData.usedMemberDayBenefit = 0
        } else {
          // 优惠券减去后实际应扣余额和最终价格
          orderData.finalPrice = finalPricePreview
          orderData.deductedBalance = Math.max(0, priceCalculation.deductedBalance - (formData.discount || 0))
          orderData.usedMemberDayBenefit = priceCalculation.usedMemberDayBenefit ? 1 : 0
        }
      } else {
        // 无会员折扣的常规订单
        const totalOriginal = calculatedPrice * formData.hours
        orderData.totalOriginalAmount = totalOriginal
        orderData.discountType = 'none'
        orderData.discountPercent = 100
        orderData.discountAmount = formData.discount || 0
        if (isFreeOrder) {
          orderData.finalPrice = 0
          orderData.deductedBalance = 0
          orderData.usedMemberDayBenefit = 0
        } else {
          orderData.finalPrice = finalPricePreview
          orderData.deductedBalance = 0
          orderData.usedMemberDayBenefit = 0
        }
      }
      
      // 使用新建顾客的账号ID或已选择的账号ID
      if (newCustomerAccountId) {
        orderData.customerAccountId = newCustomerAccountId
      } else if (formData.customerAccountId) {
        orderData.customerAccountId = formData.customerAccountId
      }
      // 只有填写了预约时间时才传
      if (formData.appointmentDate && formData.appointmentTime) {
        orderData.appointmentTime = `${formData.appointmentDate}T${formData.appointmentTime}`
      }
      // 优惠券来源
      if (formData.couponSource) {
        orderData.couponSource = formData.couponSource
      }
      // 免单标记（非会员场景也需处理）
      if (isFreeOrder) {
        orderData.finalPrice = 0
        orderData.deductedBalance = 0
        orderData.usedMemberDayBenefit = 0
        // 非会员场景的 discountAmount
        if (!priceCalculation) {
          orderData.totalOriginalAmount = calculatedPrice * formData.hours
          orderData.discountAmount = calculatedPrice * formData.hours
          orderData.discountType = 'freeOrder'
        }
      }

      // 自动为免单和试钟订单添加备注标记，方便导出时识别来源
      const autoRemark: string[] = []
      if (isFreeOrder) autoRemark.push('免单')
      if (isTrialOrder) autoRemark.push('试钟')
      if (autoRemark.length > 0) {
        const existingRemark = orderData.remark || ''
        orderData.remark = existingRemark
          ? `${existingRemark} ${autoRemark.join(' ')}`
          : autoRemark.join(' ')
      }

      // 订单来源标记
      if (orderSourceType !== 'my') {
        orderData.orderSource = orderSourceType
        orderData.otherStaffName = otherStaffName || null
        if (!orderData.remark) {
          if (orderSourceType === 'otherStaff') {
            orderData.remark = `其他客服预约${otherStaffName ? `(${otherStaffName})` : ''}`
          } else {
            orderData.remark = `其他人预约${otherStaffName ? `(${otherStaffName})` : ''}`
          }
        }
      }

      await createOrder(orderData)
      setDialogOpen(false)
      loadData()
    } catch (err: any) {
      console.error('创建订单失败:', err)
      alert('创建订单失败: ' + (err.message || '未知错误'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // 取消订单相关状态
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancellingOrder, setCancellingOrder] = useState<OrderWithDetails | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [addAsTag, setAddAsTag] = useState(false)
  const [cancelTags, setCancelTags] = useState<Tag[]>([])

  // 完成订单相关状态
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completingOrder, setCompletingOrder] = useState<OrderWithDetails | null>(null)
  const [actualMinutes, setActualMinutes] = useState<number | null>(null) // null = 全部完成
  const [customCompleteData, setCustomCompleteData] = useState({
    finalPrice: 0,
    girlIncome: 0,
    serviceCommission: 0,
  })

  // 编辑订单相关状态
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(null)
  const [editFormData, setEditFormData] = useState({
    status: 'pending' as OrderStatus,
    remark: '',
    appointmentDate: '',
    appointmentTime: '',
    couponSource: '',
    finalPrice: 0,
    discountAmount: 0,
    girlIncome: 0,
    serviceCommission: 0,
  })

  // 删除订单相关状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingOrder, setDeletingOrder] = useState<OrderWithDetails | null>(null)

  // 确认删除订单
  const handleConfirmDelete = async () => {
    if (!deletingOrder) return
    try {
      await deleteOrder(deletingOrder.id)
      setDeleteDialogOpen(false)
      setDeletingOrder(null)
      setEditDialogOpen(false)
      setEditingOrder(null)
      loadData()
    } catch (err: any) {
      console.error('删除订单失败:', err)
      alert('删除订单失败: ' + (err.message || '未知错误'))
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'cancelled') {
      // 显示取消原因弹窗
      const order = orders.find(o => o.id === orderId)
      if (order) {
        setCancellingOrder(order)
        setCancelReason('')
        setAddAsTag(false)
        // 加载已有标签
        const tagsData = await getTags(currentStore!.id)
        setCancelTags(tagsData)
        setCancelDialogOpen(true)
      }
    } else if (newStatus === 'completed') {
      // 显示完成弹窗，可选实际服务时长
      const order = orders.find(o => o.id === orderId)
      if (order) {
        setCompletingOrder(order)
        setActualMinutes(null) // 默认全部完成
        const adjusted = getAdjustedAmounts(order, null)
        setCustomCompleteData({
          finalPrice: adjusted.finalPrice,
          girlIncome: adjusted.girlIncome,
          serviceCommission: adjusted.serviceCommission,
        })
        setCompleteDialogOpen(true)
      }
    } else {
      try {
        await updateOrder(orderId, { status: newStatus })
        loadData()
      } catch (err) {
        console.error('更新状态失败:', err)
      }
    }
  }

  // 实际时长变化时，更新自定义完成数据（自动填入比例计算值，但仍允许手动修改）
  useEffect(() => {
    if (completingOrder) {
      const adjusted = getAdjustedAmounts(completingOrder, actualMinutes)
      setCustomCompleteData({
        finalPrice: adjusted.finalPrice,
        girlIncome: adjusted.girlIncome,
        serviceCommission: adjusted.serviceCommission,
      })
    }
  }, [actualMinutes, completingOrder])

  // 计算按实际时长调整后的金额
  const getAdjustedAmounts = (order: OrderWithDetails, minutes: number | null) => {
    if (minutes === null) {
      // 全部完成，不调整
      return {
        finalPrice: Number(order.finalPrice ?? order.price) || 0,
        girlIncome: order.girlIncome || 0,
        serviceCommission: order.serviceCommission || 0,
        discountAmount: (order.discountAmount || 0) / 100,
      }
    }
    const totalMinutes = (order.hours || 1) * 60
    const ratio = Math.min(minutes / totalMinutes, 1)
    return {
      finalPrice: Math.round(((Number(order.finalPrice ?? order.price) || 0) * ratio) * 100) / 100,
      girlIncome: Math.round(((order.girlIncome || 0) * ratio) * 100) / 100,
      serviceCommission: Math.round(((order.serviceCommission || 0) * ratio) * 100) / 100,
      discountAmount: Math.round((((order.discountAmount || 0) / 100) * ratio) * 100) / 100,
    }
  }

  // 确认完成订单
  const handleConfirmComplete = async () => {
    if (!completingOrder) return
    try {
      const adjusted = getAdjustedAmounts(completingOrder, actualMinutes)
      const useCustom = actualMinutes !== null // 不全钟时使用手动编辑值
      const finalPrice = useCustom ? customCompleteData.finalPrice : adjusted.finalPrice
      const girlIncome = useCustom ? customCompleteData.girlIncome : adjusted.girlIncome
      const serviceCommission = useCustom ? customCompleteData.serviceCommission : adjusted.serviceCommission
      
      const updateData: any = {
        status: 'completed',
        finalPrice,
        girlIncome,
        serviceCommission,
        discountAmount: Math.round(adjusted.discountAmount * 100),
        actualMinutes: actualMinutes, // null=按预约时长, 否则记录实际分钟数
      }
      // 如果不是全部完成，在备注中记录实际时长
      if (actualMinutes !== null) {
        const existingRemark = completingOrder.remark || ''
        updateData.remark = existingRemark
          ? `${existingRemark} 实际${actualMinutes}分钟`
          : `实际${actualMinutes}分钟`
      }
      await updateOrder(completingOrder.id, updateData)
      setCompleteDialogOpen(false)
      setCompletingOrder(null)
      setActualMinutes(null)
      loadData()
    } catch (err) {
      console.error('完成订单失败:', err)
    }
  }

  // 点击订单打开编辑弹窗
  const handleOrderClick = (order: OrderWithDetails) => {
    setEditingOrder(order)
    // 解析预约时间（使用本地时间，避免时区偏移）
    let appointmentDate = ''
    let appointmentTime = ''
    if (order.appointmentTime) {
      const d = new Date(order.appointmentTime)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      appointmentDate = `${year}-${month}-${day}`
      appointmentTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    setEditFormData({
      status: order.status as OrderStatus,
      remark: order.remark || '',
      appointmentDate,
      appointmentTime,
      couponSource: order.couponSource || '',
      finalPrice: Number(order.finalPrice ?? order.price) || 0,
      discountAmount: (order.discountAmount || 0) / 100, // 分转元
      girlIncome: order.girlIncome || 0,
      serviceCommission: order.serviceCommission || 0,
    })
    setEditDialogOpen(true)
  }

  // 保存订单编辑
  const handleSaveEdit = async () => {
    if (!editingOrder || !currentStore || isSubmitting) return
    setIsSubmitting(true)
    try {
      const updateData: any = {
        status: editFormData.status,
        remark: editFormData.remark || null,
        couponSource: editFormData.couponSource || null,
        finalPrice: editFormData.finalPrice,
        discountAmount: Math.round(editFormData.discountAmount * 100), // 元转分
        girlIncome: editFormData.girlIncome,
        serviceCommission: editFormData.serviceCommission,
      }
      // 预约时间
      if (editFormData.appointmentDate && editFormData.appointmentTime) {
        updateData.appointmentTime = new Date(`${editFormData.appointmentDate}T${editFormData.appointmentTime}`).getTime()
      } else {
        updateData.appointmentTime = null
      }
      await updateOrder(editingOrder.id, updateData)
      setEditDialogOpen(false)
      setEditingOrder(null)
      loadData()
    } catch (err: any) {
      console.error('更新订单失败:', err)
      alert('更新订单失败: ' + (err.message || '未知错误'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // 确认取消订单
  const handleConfirmCancel = async () => {
    if (!cancellingOrder || !currentStore) return

    try {
      // 1. 更新订单状态，添加备注
      await updateOrder(cancellingOrder.id, {
        status: 'cancelled',
        remark: cancelReason || undefined,
      })

      // 2. 如果选择作为标签，给顾客添加标签
      if (addAsTag && cancelReason.trim()) {
        // 先创建标签（如果不存在）
        const existingTag = cancelTags.find(t => t.name === cancelReason.trim())
        let tagId: string

        if (existingTag) {
          tagId = existingTag.id
        } else {
          // 创建新标签，使用红色表示取消相关
          const newTag = await createTag({
            storeId: currentStore.id,
            name: cancelReason.trim(),
            color: '#EF4444', // 红色
          })
          tagId = newTag.id
        }

        // 获取顾客当前标签
        const customerData = await getCustomers(currentStore.id)
        const customer = customerData.find(c => c.id === cancellingOrder.customerId)
        if (customer) {
          const currentTagIds = customer.tagIds || []
          // 避免重复添加
          if (!currentTagIds.includes(tagId)) {
            await updateCustomer(customer.id, {
              tagIds: [...currentTagIds, tagId],
            })
          }
        }
      }

      setCancelDialogOpen(false)
      setCancellingOrder(null)
      setCancelReason('')
      setAddAsTag(false)
      loadData()
    } catch (err) {
      console.error('取消订单失败:', err)
    }
  }



  const filteredOrders = orders.filter(o =>
    o.orderNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.girlName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingCount = orders.filter(o => o.status === 'pending').length
  const todayCompleted = orders.filter(o => {
    if (o.status !== 'completed') return false
    const orderDate = new Date(o.createdAt)
    const today = new Date()
    return orderDate.toDateString() === today.toDateString()
  }).length

  if (!currentStore) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <p className="text-apple-400">请先选择店家</p>
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-chiikawa-cream to-chiikawa-cream/95 backdrop-blur-md px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CharacterAvatar character="hachiwareCamera2" size="sm" />
            <h1 className="text-2xl font-bold text-chiikawa-brown">订单管理</h1>
          </div>
          <Button
            onClick={handleOpenDialog}
            className="bg-chiikawa-pink text-white rounded-full px-4 h-10 hover:bg-chiikawa-pink/90 shadow-md"
          >
            <Plus className="w-4 h-4 mr-1" />
            新建订单
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-4">
          <CuteCard variant="yellow" className="flex-1 p-3 text-center">
            <p className="text-2xl font-bold text-chiikawa-brown">{pendingCount}</p>
            <p className="text-xs text-chiikawa-brown/60">待完成</p>
          </CuteCard>
          <CuteCard variant="blue" className="flex-1 p-3 text-center">
            <p className="text-2xl font-bold text-chiikawa-brown">{todayCompleted}</p>
            <p className="text-xs text-chiikawa-brown/60">今日完成</p>
          </CuteCard>
          <CuteCard variant="pink" className="flex-1 p-3 text-center">
            <p className="text-2xl font-bold text-chiikawa-brown">{orders.length}</p>
            <p className="text-xs text-chiikawa-brown/60">总订单</p>
          </CuteCard>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-chiikawa-brown/40" />
          <Input
            placeholder="搜索订单号、顾客或妹妹..."
            className="pl-10 h-12 bg-white border-2 border-chiikawa-peach/30 rounded-2xl shadow-sm focus:border-chiikawa-pink"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          <ChiikawaLoading />
        ) : filteredOrders.length === 0 ? (
          searchQuery ? (
            <div className="text-center py-12 text-chiikawa-brown/60">
              <CharacterAvatar character="hachiwareLineStamp" size="lg" className="mx-auto mb-4 opacity-50" />
              未找到匹配的结果
            </div>
          ) : (
            <EmptyOrdersState />
          )
        ) : (
          <OrderListByDate 
            orders={filteredOrders}
            expandedDates={expandedDates}
            setExpandedDates={setExpandedDates}
            onStatusChange={handleStatusChange}
            onOrderClick={handleOrderClick}
            onEdit={handleOrderClick}
            onDelete={(order) => { setDeletingOrder(order); setDeleteDialogOpen(true) }}
            secondStaffName={currentStore?.secondStaffName ?? undefined}
          />
        )}
      </div>

      {/* Edit Order Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
          </DialogHeader>
          {editingOrder && (
            <div className="py-4 space-y-4">
              {/* 只读信息 */}
              <div className="p-3 bg-chiikawa-cream/50 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-chiikawa-brown/50">订单号</span>
                  <span className="font-mono text-chiikawa-brown">{editingOrder.orderNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-chiikawa-brown/50">顾客</span>
                  <span className="font-medium text-chiikawa-brown">{editingOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-chiikawa-brown/50">妹妹</span>
                  <span className="font-medium text-chiikawa-brown">{editingOrder.girlName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-chiikawa-brown/50">套餐</span>
                  <span className="font-medium text-chiikawa-brown">
                    {editingOrder.packageName}
                    {editingOrder.hours && editingOrder.hours > 1 && ` (${editingOrder.hours}小时)`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-chiikawa-brown/50">原价</span>
                  <span className="text-chiikawa-brown">
                    ¥{editingOrder.totalOriginalAmount ? (editingOrder.totalOriginalAmount / 100).toFixed(0) : editingOrder.price}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-chiikawa-brown/50">创建时间</span>
                  <span className="text-chiikawa-brown">{formatDateTime(editingOrder.createdAt)}</span>
                </div>
                {editingOrder.discountType && editingOrder.discountType !== 'none' && (
                  <div className="flex justify-between">
                    <span className="text-chiikawa-brown/50">折扣类型</span>
                    <Badge variant="secondary" className={cn(
                      "text-xs",
                      editingOrder.discountType === 'memberDay'
                        ? "bg-chiikawa-pink-light text-chiikawa-pink"
                        : editingOrder.discountType === 'memberRegular'
                        ? "bg-chiikawa-blue-light text-chiikawa-blue"
                        : editingOrder.discountType === 'trial'
                        ? "bg-blue-100 text-blue-700"
                        : editingOrder.discountType === 'freeOrder'
                        ? "bg-pink-100 text-pink-700"
                        : "bg-chiikawa-yellow-light text-yellow-600"
                    )}>
                      {editingOrder.discountType === 'memberDay' ? '会员日' 
                        : editingOrder.discountType === 'memberRegular' ? '会员折扣' 
                        : editingOrder.discountType === 'trial' ? '试钟' 
                        : editingOrder.discountType === 'freeOrder' ? '免单' 
                        : '优惠'}
                      {editingOrder.discountPercent && editingOrder.discountType !== 'trial' && editingOrder.discountType !== 'freeOrder' && ` ${editingOrder.discountPercent}折`}
                    </Badge>
                  </div>
                )}
              </div>

              {/* 可编辑字段 */}
              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label>订单状态</Label>
                  <Select value={editFormData.status} onValueChange={(v) => setEditFormData(prev => ({ ...prev, status: v as OrderStatus }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待完成</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="cancelled">已取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>预约时间</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={editFormData.appointmentDate}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, appointmentDate: e.target.value }))}
                    />
                    <Select
                      value={editFormData.appointmentTime}
                      onValueChange={(value) => setEditFormData(prev => ({ ...prev, appointmentTime: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择时间" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[240px] overflow-y-auto">
                        {Array.from({ length: 24 }, (_, i) => i).flatMap(hour => [
                          <SelectItem key={`${hour}:00`} value={`${String(hour).padStart(2, '0')}:00`}>
                            {String(hour).padStart(2, '0')}:00
                          </SelectItem>,
                          <SelectItem key={`${hour}:30`} value={`${String(hour).padStart(2, '0')}:30`}>
                            {String(hour).padStart(2, '0')}:30
                          </SelectItem>,
                        ])}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>实付金额 (元)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editFormData.finalPrice}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, finalPrice: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>优惠金额 (元)</Label>
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    value={editFormData.discountAmount}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>妹妹收入 (元)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editFormData.girlIncome}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, girlIncome: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>客服提成 (元)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editFormData.serviceCommission}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, serviceCommission: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>优惠券/免单来源</Label>
                  <Input
                    placeholder="如：Telegram群组名称"
                    value={editFormData.couponSource}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, couponSource: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>备注</Label>
                  <Input
                    placeholder="订单备注..."
                    value={editFormData.remark}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, remark: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (editingOrder) {
                  setDeletingOrder(editingOrder)
                  setDeleteDialogOpen(true)
                }
              }}
              className="text-red-500 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              删除订单
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="bg-chiikawa-pink text-white hover:bg-chiikawa-pink/90"
              >
                {isSubmitting ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Order Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>完成订单</DialogTitle>
          </DialogHeader>
          {completingOrder && (
            <div className="py-4 space-y-4">
              {/* 订单摘要 */}
              <div className="p-3 bg-chiikawa-cream/50 rounded-xl text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-chiikawa-brown/50">订单号</span>
                  <span className="font-mono text-chiikawa-brown">{completingOrder.orderNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-chiikawa-brown/50">预约时长</span>
                  <span className="text-chiikawa-brown">{completingOrder.hours || 1}小时</span>
                </div>
              </div>

              {/* 实际服务时长选择 */}
              <div className="space-y-2">
                <Label>实际服务时长</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    className={cn(
                      "p-3 rounded-xl border-2 text-center transition-colors",
                      actualMinutes === null
                        ? "border-chiikawa-pink bg-chiikawa-pink/10 text-chiikawa-pink font-medium"
                        : "border-chiikawa-peach/30 text-chiikawa-brown/70 hover:border-chiikawa-pink/50"
                    )}
                    onClick={() => setActualMinutes(null)}
                  >
                    <p className="text-sm">全部完成</p>
                    <p className="text-xs mt-0.5">{completingOrder.hours || 1}小时</p>
                  </button>
                  <button
                    className={cn(
                      "p-3 rounded-xl border-2 text-center transition-colors",
                      actualMinutes === 30
                        ? "border-chiikawa-pink bg-chiikawa-pink/10 text-chiikawa-pink font-medium"
                        : "border-chiikawa-peach/30 text-chiikawa-brown/70 hover:border-chiikawa-pink/50"
                    )}
                    onClick={() => setActualMinutes(30)}
                  >
                    <p className="text-sm">半小时</p>
                    <p className="text-xs mt-0.5">30分钟</p>
                  </button>
                  <button
                    className={cn(
                      "p-3 rounded-xl border-2 text-center transition-colors",
                      actualMinutes !== null && actualMinutes !== 30
                        ? "border-chiikawa-pink bg-chiikawa-pink/10 text-chiikawa-pink font-medium"
                        : "border-chiikawa-peach/30 text-chiikawa-brown/70 hover:border-chiikawa-pink/50"
                    )}
                    onClick={() => setActualMinutes(prev => prev === null || prev === 30 ? 20 : prev)}
                  >
                    <p className="text-sm">自定义</p>
                    <p className="text-xs mt-0.5">分钟</p>
                  </button>
                </div>

                {/* 自定义分钟输入 */}
                {actualMinutes !== null && actualMinutes !== 30 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      min={1}
                      max={(completingOrder.hours || 1) * 60}
                      value={actualMinutes}
                      onChange={(e) => setActualMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24"
                    />
                    <span className="text-sm text-chiikawa-brown/50">分钟</span>
                  </div>
                )}
              </div>

              {/* 调整后金额预览 */}
              <div className="p-3 bg-white rounded-xl border border-chiikawa-peach/20 space-y-2">
                <p className="text-xs text-chiikawa-brown/50 mb-1">
                  {actualMinutes === null 
                    ? '全部完成，金额不变' 
                    : `按 ${actualMinutes} 分钟折算（${(actualMinutes / ((completingOrder.hours || 1) * 60) * 100).toFixed(0)}%）`}
                </p>

                {actualMinutes === null ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-chiikawa-brown/50">实付金额</span>
                      <span className="font-medium text-chiikawa-brown">
                        ¥{getAdjustedAmounts(completingOrder, null).finalPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-chiikawa-brown/50">妹妹收入</span>
                      <span className="font-medium text-purple-500">
                        ¥{getAdjustedAmounts(completingOrder, null).girlIncome.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-chiikawa-brown/50">客服提成</span>
                      <span className="font-medium text-green-500">
                        ¥{getAdjustedAmounts(completingOrder, null).serviceCommission.toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label className="text-xs text-chiikawa-brown/50">实付金额 (元)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={customCompleteData.finalPrice}
                        onChange={(e) => setCustomCompleteData(prev => ({ ...prev, finalPrice: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs text-chiikawa-brown/50">妹妹收入 (元)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={customCompleteData.girlIncome}
                        onChange={(e) => setCustomCompleteData(prev => ({ ...prev, girlIncome: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs text-chiikawa-brown/50">客服提成 (元)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={customCompleteData.serviceCommission}
                        onChange={(e) => setCustomCompleteData(prev => ({ ...prev, serviceCommission: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <p className="text-xs text-orange-500 mt-1">
                      比例折算参考：实付 ¥{getAdjustedAmounts(completingOrder, actualMinutes).finalPrice.toFixed(2)}，妹妹 ¥{getAdjustedAmounts(completingOrder, actualMinutes).girlIncome.toFixed(2)}，客服 ¥{getAdjustedAmounts(completingOrder, actualMinutes).serviceCommission.toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleConfirmComplete}
              className="bg-green-500 text-white hover:bg-green-600"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              确认完成
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>取消订单</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {cancellingOrder && (
              <div className="p-3 bg-apple-50 rounded-xl text-sm">
                <p className="text-apple-600">
                  订单: <span className="font-medium text-apple-900">{cancellingOrder.orderNo}</span>
                </p>
                <p className="text-apple-600">
                  顾客: <span className="font-medium text-apple-900">{cancellingOrder.customerName}</span>
                </p>
                <p className="text-apple-600">
                  妹妹: <span className="font-medium text-apple-900">{cancellingOrder.girlName}</span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cancelReason">取消原因</Label>
              <Input
                id="cancelReason"
                placeholder="请输入取消原因..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-apple-50 rounded-xl cursor-pointer" onClick={() => setAddAsTag(!addAsTag)}>
              <div className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                addAsTag ? "bg-apple-blue border-apple-blue" : "border-apple-300"
              )}>
                {addAsTag && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-apple-900">给顾客添加标签</p>
                <p className="text-xs text-apple-400">将取消原因作为标签标记给顾客</p>
              </div>
            </div>

            {addAsTag && cancelReason.trim() && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                <span className="text-xs text-apple-500">将创建标签:</span>
                <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#EF4444' }}>
                  {cancelReason.trim()}
                </span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              返回
            </Button>
            <Button
              onClick={handleConfirmCancel}
              disabled={!cancelReason.trim()}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              确认取消
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Order Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>删除订单</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {deletingOrder && (
              <div className="p-3 bg-red-50 rounded-xl text-sm space-y-1">
                <p className="text-red-600 font-medium">⚠️ 此操作不可恢复</p>
                <p className="text-red-600">
                  订单号: <span className="font-mono font-medium">{deletingOrder.orderNo}</span>
                </p>
                <p className="text-red-600">
                  顾客: <span className="font-medium">{deletingOrder.customerName}</span>
                </p>
                <p className="text-red-600">
                  妹妹: <span className="font-medium">{deletingOrder.girlName}</span>
                </p>
                <p className="text-red-600">
                  实付金额: <span className="font-medium">¥{(Number(deletingOrder.finalPrice ?? deletingOrder.price) || 0).toFixed(2)}</span>
                </p>

              </div>
            )}
            <p className="text-sm text-chiikawa-brown/50">确认要永久删除此订单吗？删除后数据将无法恢复。</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setDeleteDialogOpen(false)
              setDeletingOrder(null)
            }}>
              返回
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建订单</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Customer Search & Selection */}
            <div className="grid gap-2">
              <Label>顾客</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-400" />
                <Input
                  placeholder="搜索顾客姓名..."
                  className="pl-9"
                  value={customerSearch}
                  onChange={(e) => {
                    const value = e.target.value
                    setCustomerSearch(value)
                    // 只有在已有选择顾客时才重置状态
                    if (formData.customerId) {
                      setIsCreatingCustomer(false)
                      setSelectedCustomer(null)
                      setFormData(prev => ({ ...prev, customerId: '', customerAccountId: '' }))
                    }
                  }}
                />
              </div>

              {/* 搜索结果 */}
              {customerSearch && !isCreatingCustomer && (
                <div className="max-h-40 overflow-y-auto bg-white rounded-xl border border-apple-200 shadow-sm">
                  {/* 创建新顾客选项 - 始终显示 */}
                  <div 
                    className="p-3 text-sm text-apple-600 hover:bg-apple-50 cursor-pointer flex items-center gap-2 border-b border-apple-100"
                    onClick={() => setIsCreatingCustomer(true)}
                  >
                    <UserPlus className="w-4 h-4" />
                    创建新顾客 "{customerSearch}"
                  </div>
                  
                  {/* 现有顾客列表 */}
                  {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length > 0 && (
                    <div className="py-1">
                      <p className="px-3 py-1 text-xs text-apple-400">现有顾客</p>
                      {customers
                        .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                        .map(c => (
                          <div
                            key={c.id}
                            className="px-3 py-2 text-sm hover:bg-apple-50 cursor-pointer flex items-center justify-between"
                            onClick={() => {
                              handleCustomerChange(c.id)
                              setCustomerSearch(c.name)
                            }}
                          >
                            <span>{c.name}</span>
                            {c.accounts && c.accounts.length > 0 && (
                              <span className="text-xs text-apple-400">{c.accounts.length} 个账号</span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* 新顾客创建表单 */}
              {isCreatingCustomer && (
                <div className="p-3 bg-apple-50 rounded-xl space-y-3">
                  <p className="text-sm font-medium text-apple-900">创建新顾客: {customerSearch}</p>
                  <div className="space-y-2">
                    <p className="text-xs text-apple-500">账号列表 (可选)</p>
                    {newCustomerAccounts.map((account, index) => (
                      <div key={index} className="p-2 bg-white rounded-lg space-y-2">
                        <div className="flex gap-2">
                          <Select
                            value={account.platform}
                            onValueChange={(value) => {
                              const updated = [...newCustomerAccounts]
                              updated[index] = { ...account, platform: value }
                              setNewCustomerAccounts(updated)
                            }}
                          >
                            <SelectTrigger className="flex-1 h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLATFORM_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-400"
                            onClick={() => setNewCustomerAccounts(prev => prev.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <Input
                          placeholder="账号ID"
                          className="h-8 text-sm"
                          value={account.accountId}
                          onChange={(e) => {
                            const updated = [...newCustomerAccounts]
                            updated[index] = { ...account, accountId: e.target.value }
                            setNewCustomerAccounts(updated)
                          }}
                        />
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setNewCustomerAccounts(prev => [...prev, { platform: 'wechat', accountId: '' }])}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      添加账号
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Account Selection - 仅现有顾客 */}
            {!isCreatingCustomer && selectedCustomer && selectedCustomer.accounts && selectedCustomer.accounts.length > 0 && (
              <div className="grid gap-2">
                <Label>选择账号</Label>
                <Select value={formData.customerAccountId} onValueChange={(v) => setFormData({ ...formData, customerAccountId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择账号" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCustomer.accounts.map((a, idx) => (
                      <SelectItem key={idx} value={a.id || `${a.platform}-${a.accountId}`}>
                        {a.platform}: {a.accountId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Girl Selection */}
            <div className="grid gap-2">
              <Label>选择妹妹</Label>
              <Select value={formData.girlId} onValueChange={handleGirlChange}>
                <SelectTrigger>
                  <SelectValue placeholder="选择妹妹" />
                </SelectTrigger>
                <SelectContent>
                  {girls.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Trial Order Toggle - 只有选了有 trialPrice 的妹妹才显示 */}
            {selectedGirl && selectedGirl.trialPrice && (
              <div 
                className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl cursor-pointer border border-blue-200"
                onClick={() => {
                  const newIsTrial = !isTrialOrder
                  setIsTrialOrder(newIsTrial)
                  if (newIsTrial) {
                    // 试钟开启：关闭免单
                    setIsFreeOrder(false)
                    setFormData(prev => ({ ...prev, discount: 0, hours: 1 }))
                  } else {
                    // 试钟关闭：恢复
                    setFormData(prev => ({ ...prev, hours: 1 }))
                  }
                }}
              >
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                  isTrialOrder ? "bg-chiikawa-blue border-chiikawa-blue" : "border-apple-300"
                )}>
                  {isTrialOrder && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-700">试钟</p>
                  <p className="text-xs text-blue-400">一口价 ¥{selectedGirl.trialPrice}，不参与任何优惠</p>
                </div>
                {isTrialOrder && (
                  <Badge className="text-xs bg-chiikawa-blue text-white">试钟</Badge>
                )}
              </div>
            )}

            {/* Order Source Selection */}
            <div className="p-3 bg-gradient-to-r from-chiikawa-cream to-white rounded-xl border border-chiikawa-peach/20">
              <Label className="text-sm text-chiikawa-brown/70 mb-2">订单来源</Label>
              <div className="flex gap-2 mt-1">
                {/* 我的预约 */}
                <button
                  onClick={() => { setOrderSourceType('my'); setOtherStaffName('') }}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-medium transition-all border",
                    orderSourceType === 'my'
                      ? "bg-chiikawa-pink text-white border-chiikawa-pink"
                      : "bg-white text-chiikawa-brown/60 border-chiikawa-peach/30 hover:bg-chiikawa-cream"
                  )}
                >
                  我的预约
                </button>
                {/* 其他客服（有提成） */}
                {currentStore?.secondStaffName && (
                  <button
                    onClick={() => { setOrderSourceType('otherStaff'); setOtherStaffName(currentStore?.secondStaffName || '') }}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-medium transition-all border",
                      orderSourceType === 'otherStaff'
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-blue-600/60 border-blue-200 hover:bg-blue-50"
                    )}
                  >
                    {currentStore.secondStaffName}
                  </button>
                )}
                {/* 其他人（无提成） */}
                <button
                  onClick={() => { setOrderSourceType('other'); setOtherStaffName('') }}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-medium transition-all border",
                    orderSourceType === 'other'
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-orange-600/60 border-orange-200 hover:bg-orange-50"
                  )}
                >
                  其他人
                </button>
              </div>
              {orderSourceType !== 'my' && (
                <div className="mt-2 flex items-center gap-1">
                  <Badge className={cn(
                    "text-xs",
                    orderSourceType === 'otherStaff' ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {orderSourceType === 'otherStaff' ? '有提成' : '无提成'}
                  </Badge>
                  {orderSourceType === 'otherStaff' && (
                    <span className="text-xs text-blue-500">
                      ({currentStore?.secondStaffCommissionType === 'percent'
                        ? `${currentStore?.secondStaffCommissionValue}%`
                        : `固定¥${currentStore?.secondStaffCommissionValue}`
                      })
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Other Staff/Person Name Input */}
            {orderSourceType !== 'my' && (
              <div className="grid gap-2">
                <Label className={cn(
                  "text-sm",
                  orderSourceType === 'otherStaff' ? "text-blue-600" : "text-orange-600"
                )}>
                  名称备注（可选）
                </Label>
                <Input
                  placeholder={orderSourceType === 'otherStaff' ? "默认为第二客服名称" : "填写名称方便识别"}
                  value={otherStaffName}
                  onChange={(e) => setOtherStaffName(e.target.value)}
                  className={cn(
                    orderSourceType === 'otherStaff' ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"
                  )}
                />
              </div>
            )}

            {/* Package Selection */}
            <div className="grid gap-2">
              <Label>选择套餐</Label>
              <Select value={formData.packageId} onValueChange={handlePackageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="选择套餐" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (¥{p.basePrice})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hours Selection - 试钟时隐藏 */}
            {selectedPackage && !isTrialOrder && (
              <div className="grid gap-2">
                <Label>预约小时数</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={formData.hours}
                    onChange={(e) => {
                      const hours = parseInt(e.target.value) || 1
                      setFormData(prev => ({ ...prev, hours: Math.max(1, Math.min(24, hours)) }))
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-apple-400">小时</span>
                </div>
              </div>
            )}

            {/* Member Info Display */}
            {selectedCustomer && memberConfig?.enabled && (
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-800">会员信息</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-apple-600">
                    等级: <span className="font-medium text-amber-700">
                      {memberConfig.levels.find(l => l.level === selectedCustomer.memberLevel)?.name || '普通用户'}
                    </span>
                  </span>
                  <span className="text-apple-600">
                    余额: <span className="font-medium text-green-600">¥{((selectedCustomer.balance || 0) / 100).toFixed(2)}</span>
                  </span>
                </div>
                {selectedCustomer.totalRecharge && selectedCustomer.totalRecharge > 0 && (
                  <div className="text-xs text-apple-400 mt-1">
                    累计充值: ¥{(selectedCustomer.totalRecharge / 100).toFixed(2)}
                  </div>
                )}
              </div>
            )}

            {/* Price & Commission Preview */}
            {calculatedPrice > 0 && (
              <div className="p-4 bg-apple-50 rounded-xl space-y-3">
                {/* 原价总计 */}
                <div className="flex justify-between items-center border-b border-apple-100 pb-2">
                  <span className="text-sm text-apple-600">
                    {isTrialOrder 
                      ? '试钟一口价' 
                      : `订单金额 (${formData.hours}小时 × ¥${calculatedPrice})`
                    }
                  </span>
                  <span className="text-xl font-bold text-apple-blue">
                    ¥{isTrialOrder ? selectedGirl?.trialPrice : (priceCalculation?.totalOriginalAmount || calculatedPrice * formData.hours)}
                  </span>
                </div>

                {/* 会员折扣明细 */}
                {priceCalculation && priceCalculation.discountType !== 'none' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        "text-xs",
                        priceCalculation.discountType === 'memberDay' 
                          ? "bg-pink-100 text-pink-700" 
                          : priceCalculation.discountType === 'trial'
                          ? "bg-blue-100 text-blue-700"
                          : "bg-blue-100 text-blue-700"
                      )}>
                        {priceCalculation.discountType === 'memberDay' ? '会员日特惠' 
                          : priceCalculation.discountType === 'trial' ? '试钟' 
                          : '会员折扣'}
                      </Badge>
                      <span className="text-xs text-apple-400">{priceCalculation.reason}</span>
                    </div>

                    {/* 前提价提示 */}
                    {priceCalculation.priceMarkup && priceCalculation.priceMarkup > 0 && (
                      <div className="flex justify-between items-center py-1 px-2 bg-amber-50 rounded text-xs">
                        <span className="text-amber-600">优惠前提价</span>
                        <span className="text-amber-700">+¥{priceCalculation.priceMarkup}</span>
                      </div>
                    )}
                    
                    {/* 每小时明细 */}
                    {priceCalculation.breakdown && priceCalculation.breakdown.length > 0 && (
                      <div className="space-y-1 text-xs">
                        {priceCalculation.breakdown.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center py-1 px-2 bg-white rounded">
                            <span className="text-apple-500">
                              第{item.hour}小时
                              {item.type === 'memberDay' && <span className="text-pink-500 ml-1">(会员日)</span>}
                              {item.type === 'regular' && <span className="text-blue-500 ml-1">(常规)</span>}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-apple-400 line-through">¥{item.originalPrice}</span>
                              {item.discountPercent < 100 && (
                                <span className="text-apple-400">{item.discountPercent}折</span>
                              )}
                              <span className="font-medium text-apple-700">¥{item.finalPrice}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 折扣总计 */}
                    <div className="flex justify-between items-center pt-2 border-t border-apple-100">
                      <span className="text-sm text-apple-600">会员优惠</span>
                      <span className="text-sm font-semibold text-orange-600">
                        -¥{priceCalculation.discountAmount}
                        {priceCalculation.discountPercent < 100 && (
                          <span className="text-xs text-apple-400 ml-1">
                            ({priceCalculation.discountPercent}折)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* 余额抵扣提示 */}
                {priceCalculation && priceCalculation.deductedBalance > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                    <Wallet className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      将从余额扣除: ¥{priceCalculation.deductedBalance}
                    </span>
                  </div>
                )}

                {/* 余额不足警告 */}
                {priceCalculation && selectedCustomer && 
                 priceCalculation.finalPrice > (selectedCustomer.balance || 0) / 100 && 
                 priceCalculation.deductedBalance === 0 && (
                  <div className="p-2 bg-red-50 rounded-lg text-sm text-red-600">
                    余额不足，还需支付 ¥{priceCalculation.finalPrice - (selectedCustomer.balance || 0) / 100}
                  </div>
                )}

                {/* 优惠券 - 试钟时不显示 */}
                {!isTrialOrder && (<>
                <div className="grid gap-2">
                  <Label className="text-sm text-apple-500">额外优惠券抵扣</Label>
                  {/* 免单勾选 */}
                  <div 
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-red-50 rounded-xl cursor-pointer border border-pink-200"
                    onClick={() => {
                      const newIsFree = !isFreeOrder
                      setIsFreeOrder(newIsFree)
                      if (newIsFree) {
                        // 免单：自动填入最高值
                        const maxDiscount = priceCalculation?.finalPrice ?? calculatedPrice * formData.hours
                        setFormData(prev => ({ ...prev, discount: maxDiscount }))
                        setFinalPricePreview(0)
                      } else {
                        // 取消免单：恢复
                        setFormData(prev => ({ ...prev, discount: 0 }))
                        const baseFinal = priceCalculation?.finalPrice ?? calculatedPrice * formData.hours
                        setFinalPricePreview(baseFinal)
                      }
                    }}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      isFreeOrder ? "bg-chiikawa-pink border-chiikawa-pink" : "border-apple-300"
                    )}>
                      {isFreeOrder && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-pink-700">免单</p>
                      <p className="text-xs text-pink-400">勾选后自动抵扣全部金额，此单免费</p>
                    </div>
                    {isFreeOrder && (
                      <Badge className="text-xs bg-chiikawa-pink text-white">免单</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-apple-400">-¥</span>
                    <Input
                      type="number"
                      min={0}
                      max={priceCalculation?.finalPrice || calculatedPrice * formData.hours}
                      step="any"
                      placeholder="0"
                      className="h-8 text-sm"
                      value={isFreeOrder ? (priceCalculation?.finalPrice ?? calculatedPrice * formData.hours) : (formData.discount || '')}
                      disabled={isFreeOrder}
                      onChange={(e) => {
                        const inputValue = e.target.value
                        const discount = inputValue === '' ? 0 : parseFloat(inputValue)
                        setFormData(prev => ({ ...prev, discount }))
                        // 重新计算最终价格
                        const baseFinal = priceCalculation?.finalPrice ?? calculatedPrice * formData.hours
                        const newFinalPrice = Math.max(0, baseFinal - discount)
                        setFinalPricePreview(newFinalPrice)
                      }}
                    />
                  </div>
                </div>

                {/* 优惠券来源 */}
                {(formData.discount > 0 || isFreeOrder) && (
                  <div className="grid gap-2">
                    <Label className="text-sm text-apple-500">优惠券/免单来源</Label>
                    <Input
                      placeholder="如：Telegram群组名称"
                      className="h-8 text-sm"
                      value={formData.couponSource}
                      onChange={(e) => setFormData(prev => ({ ...prev, couponSource: e.target.value }))}
                    />
                    <p className="text-xs text-apple-400">记录是哪个群组/渠道发放的优惠券或免单原因</p>
                  </div>
                )}

                </>)}

                {/* 优惠后金额 */}
                <div className="flex justify-between items-center pt-2 border-t border-apple-100">
                  <span className="text-sm text-apple-600">实付金额</span>
                  {isFreeOrder || finalPricePreview === 0 ? (
                    <span className="text-lg font-bold text-chiikawa-pink">免单</span>
                  ) : isTrialOrder ? (
                    <span className="text-lg font-bold text-chiikawa-blue">
                      ¥{Number(finalPricePreview).toFixed(2)}
                      <span className="text-xs ml-1 text-chiikawa-blue/60">试钟</span>
                    </span>
                  ) : (
                    <span className="text-lg font-bold text-orange-600">
                      ¥{Number(finalPricePreview).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* 客服提成预览 */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-apple-500">
                      {orderSourceType === 'other' ? '客服提成（无）' : 
                       orderSourceType === 'otherStaff' ? `${currentStore?.secondStaffName || '其他客服'}提成` : '客服提成'}
                    </span>
                    {orderSourceType === 'my' && (
                      <span className="text-xs text-apple-400">
                        ({currentStore?.serviceCommissionType === 'percent'
                          ? `${currentStore?.serviceCommissionValue}%`
                          : `固定¥${currentStore?.serviceCommissionValue}`
                        })
                      </span>
                    )}
                    {orderSourceType === 'otherStaff' && (
                      <span className="text-xs text-blue-400">
                        ({currentStore?.secondStaffCommissionType === 'percent'
                          ? `${currentStore?.secondStaffCommissionValue}%`
                          : `固定¥${currentStore?.secondStaffCommissionValue}`
                        })
                      </span>
                    )}
                    {orderSourceType === 'other' && (
                      <span className="text-xs text-orange-400">其他人预约，无提成</span>
                    )}
                  </div>
                  <span className={cn(
                    "text-lg font-semibold",
                    orderSourceType === 'other' ? "text-orange-600" : 
                    orderSourceType === 'otherStaff' ? "text-blue-600" : "text-green-600"
                  )}>
                    {orderSourceType === 'other' ? '¥0.00' : 
                     `¥${orderSourceType === 'otherStaff'
                       ? (currentStore?.secondStaffCommissionType === 'percent'
                           ? ((priceCalculation?.totalOriginalAmount || (priceCalculation?.finalPrice || finalPricePreview)) * (currentStore?.secondStaffCommissionValue || 0) / 100)
                           : (currentStore?.secondStaffCommissionValue || 0) * (formData.hours || 1)
                         ).toFixed(2)
                       : (priceCalculation?.serviceCommission || serviceCommissionPreview).toFixed(2)
                     }`}
                  </span>
                </div>

                {/* 妹妹提成预览 */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-apple-500">{selectedGirl?.name}提成</span>
                    <span className="text-xs text-apple-400">
                      ({selectedGirl?.commissionType === 'percent'
                        ? `${selectedGirl?.commissionValue}%`
                        : `固定¥${selectedGirl?.commissionValue}`
                      })
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-purple-600">¥{(priceCalculation?.girlIncome || girlIncomePreview).toFixed(2)}</span>
                </div>

              </div>
            )}

            {/* Appointment Time */}
            <div className="grid gap-2">
              <Label>预约时间 (可选)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={formData.appointmentDate}
                  onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                  placeholder="选择日期"
                />
                <Select
                  value={formData.appointmentTime}
                  onValueChange={(value) => setFormData({ ...formData, appointmentTime: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择时间" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px] overflow-y-auto">
                    {Array.from({ length: 24 }, (_, i) => i).flatMap(hour => [
                      <SelectItem key={`${hour}:00`} value={`${String(hour).padStart(2, '0')}:00`}>
                        {String(hour).padStart(2, '0')}:00
                      </SelectItem>,
                      <SelectItem key={`${hour}:30`} value={`${String(hour).padStart(2, '0')}:30`}>
                        {String(hour).padStart(2, '0')}:30
                      </SelectItem>
                    ])}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-chiikawa-brown/50">请选择整点或整点半</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={(!formData.customerId && !isCreatingCustomer) || !formData.girlId || !formData.packageId || (isCreatingCustomer && !customerSearch.trim()) || isSubmitting}
              className="bg-apple-blue text-white hover:bg-apple-blue/90"
            >
              {isSubmitting ? '提交中...' : '创建订单'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
