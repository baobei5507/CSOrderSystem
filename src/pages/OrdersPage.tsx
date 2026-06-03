import { useState, useEffect } from 'react'
import { Search, Plus, Clock, CheckCircle2, XCircle, UserPlus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, formatDateTime } from '@/lib/utils'
import { useApi } from '@/hooks/useApi'
import { useAppStore } from '@/stores/appStore'
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

export function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [girls, setGirls] = useState<Girl[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    customerId: '',
    customerAccountId: '',
    girlId: '',
    packageId: '',
    price: 0,
    discount: 0,
    appointmentTime: '',
  })

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedGirl, setSelectedGirl] = useState<Girl | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [calculatedPrice, setCalculatedPrice] = useState(0)

  // 提成预览
  const [serviceCommissionPreview, setServiceCommissionPreview] = useState(0)
  const [girlIncomePreview, setGirlIncomePreview] = useState(0)
  const [finalPricePreview, setFinalPricePreview] = useState(0)

  // 顾客搜索和创建
  const [customerSearch, setCustomerSearch] = useState('')
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [newCustomerAccounts, setNewCustomerAccounts] = useState<{ platform: string; accountId: string; note?: string }[]>([])

  const { currentStore } = useAppStore()
  const { getOrders, getCustomers, getGirls, getPackages, getTags, createOrder, updateOrder, createTag, updateCustomer, getGirlPackagePrices, createCustomer } = useApi()

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
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 计算最终价格和提成
  useEffect(() => {
    if (selectedGirl && selectedPackage) {
      // 查询该妹妹对应套餐的价格
      getGirlPackagePrices(selectedGirl.id).then(prices => {
        const girlPrice = prices.find(p => p.packageId === selectedPackage.id)
        const basePrice = girlPrice?.price || selectedPackage.basePrice
        setCalculatedPrice(basePrice)
        setFormData(prev => ({ ...prev, price: basePrice }))

        // 计算提成预览（基于原价）
        calculateCommissions(basePrice)
        // 计算优惠后价格
        updateFinalPrice(basePrice, formData.discount)
      }).catch(() => {
        // 查询失败时使用基础价格
        setCalculatedPrice(selectedPackage.basePrice)
        setFormData(prev => ({ ...prev, price: selectedPackage.basePrice }))
        calculateCommissions(selectedPackage.basePrice)
        updateFinalPrice(selectedPackage.basePrice, formData.discount)
      })
    }
  }, [selectedGirl, selectedPackage])

  // 优惠后价格计算
  const updateFinalPrice = (price: number, discount: number) => {
    const finalPrice = Math.max(0, price - discount)
    setFinalPricePreview(finalPrice)
  }

  // 计算提成预览
  const calculateCommissions = (price: number) => {
    if (!currentStore || !selectedGirl) {
      setServiceCommissionPreview(0)
      setGirlIncomePreview(0)
      return
    }

    // 客服提成计算
    let serviceCommission = 0
    if (currentStore.serviceCommissionType === 'percent') {
      serviceCommission = price * (currentStore.serviceCommissionValue / 100)
    } else {
      serviceCommission = currentStore.serviceCommissionValue
    }
    setServiceCommissionPreview(Math.round(serviceCommission * 100) / 100)

    // 妹妹提成计算
    let girlIncome = 0
    if (selectedGirl.commissionType === 'percent') {
      girlIncome = price * (selectedGirl.commissionValue / 100)
    } else {
      girlIncome = selectedGirl.commissionValue
    }
    setGirlIncomePreview(Math.round(girlIncome * 100) / 100)
  }

  const handleOpenDialog = () => {
    setFormData({
      customerId: '',
      customerAccountId: '',
      girlId: '',
      packageId: '',
      price: 0,
      discount: 0,
      appointmentTime: '',
    })
    setSelectedCustomer(null)
    setSelectedGirl(null)
    setSelectedPackage(null)
    setCustomerSearch('')
    setIsCreatingCustomer(false)
    setNewCustomerAccounts([])
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
    if (!formData.girlId || !formData.packageId || !currentStore) return

    try {
      let finalCustomerId = formData.customerId
      let newCustomerAccountId: string | undefined

      // 如果是创建新顾客
      if (isCreatingCustomer && customerSearch.trim()) {
        const newCustomer = await createCustomer({
          name: customerSearch.trim(),
          storeId: currentStore.id,
          accounts: newCustomerAccounts.filter(a => a.accountId.trim()),
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
      }
      // 使用新建顾客的账号ID或已选择的账号ID
      if (newCustomerAccountId) {
        orderData.customerAccountId = newCustomerAccountId
      } else if (formData.customerAccountId) {
        orderData.customerAccountId = formData.customerAccountId
      }
      // 只有填写了预约时间时才传
      if (formData.appointmentTime) {
        orderData.appointmentTime = formData.appointmentTime
      }

      await createOrder(orderData)
      setDialogOpen(false)
      loadData()
    } catch (err: any) {
      console.error('创建订单失败:', err)
      alert('创建订单失败: ' + (err.message || '未知错误'))
    }
  }

  // 取消订单相关状态
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancellingOrder, setCancellingOrder] = useState<OrderWithDetails | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [addAsTag, setAddAsTag] = useState(false)
  const [cancelTags, setCancelTags] = useState<Tag[]>([])

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
    } else {
      try {
        await updateOrder(orderId, { status: newStatus })
        loadData()
      } catch (err) {
        console.error('更新状态失败:', err)
      }
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
      <div className="sticky top-0 z-10 bg-apple-50/95 backdrop-blur-md px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-apple-900">订单管理</h1>
          <Button
            onClick={handleOpenDialog}
            className="bg-apple-blue text-white rounded-full px-4 h-10 hover:bg-apple-blue/90"
          >
            <Plus className="w-4 h-4 mr-1" />
            新建订单
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-apple-orange">{pendingCount}</p>
            <p className="text-xs text-apple-400">待完成</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-apple-green">{todayCompleted}</p>
            <p className="text-xs text-apple-400">今日完成</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-apple-600">{orders.length}</p>
            <p className="text-xs text-apple-400">总订单</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-400" />
          <Input
            placeholder="搜索订单号、顾客或妹妹..."
            className="pl-10 h-12 bg-white border-0 rounded-2xl shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-apple-400">加载中...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-apple-400">
            {searchQuery ? '未找到匹配的结果' : '暂无订单，点击右上角创建'}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const status = statusMap[order.status as OrderStatus]
            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
                {/* Order Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-mono text-apple-400">{order.orderNo}</span>
                  <Badge className={cn("text-xs px-2 py-0.5 rounded-full", status.bgColor, status.color)}>
                    {status.label}
                  </Badge>
                </div>

                {/* Order Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-apple-400 w-12">顾客</span>
                    <span className="font-medium text-apple-900">{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-apple-400 w-12">妹妹</span>
                    <span className="font-medium text-apple-900">{order.girlName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-apple-400 w-12">套餐</span>
                    <span className="font-medium text-apple-900">{order.packageName}</span>
                  </div>
                </div>

                {/* Price & Time */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-apple-100">
                  <div className="flex items-center gap-1 text-apple-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {order.appointmentTime ? formatDateTime(order.appointmentTime) : '立即'}
                    </span>
                  </div>
                  <div className="text-right">
                    {(order.discount || 0) > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-apple-400 line-through">¥{order.price}</span>
                        <span className="text-lg font-bold text-orange-600">
                          ¥{order.finalPrice || Math.max(0, order.price - (order.discount || 0))}
                        </span>
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                          优惠¥{order.discount}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-apple-blue">
                        ¥{order.price}
                      </span>
                    )}
                  </div>
                </div>

                {/* Commission Info */}
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-purple-600">
                    妹妹收入: ¥{order.girlIncome || 0}
                  </span>
                  <span className="text-green-600">
                    客服提成: ¥{order.serviceCommission || 0}
                  </span>
                </div>

                {/* Actions */}
                {order.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-500 text-white hover:bg-green-600"
                      onClick={() => handleStatusChange(order.id, 'completed')}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      完成
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleStatusChange(order.id, 'cancelled')}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      取消
                    </Button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

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

            {/* Price & Commission Preview */}
            {calculatedPrice > 0 && (
              <div className="p-4 bg-apple-50 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-apple-100 pb-2">
                  <span className="text-sm text-apple-600">订单金额</span>
                  <span className="text-xl font-bold text-apple-blue">¥{calculatedPrice}</span>
                </div>

                {/* 优惠券 */}
                <div className="grid gap-2">
                  <Label className="text-sm text-apple-500">优惠券抵扣</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-apple-400">-¥</span>
                    <Input
                      type="number"
                      min={0}
                      max={calculatedPrice}
                      placeholder="0"
                      className="h-8 text-sm"
                      value={formData.discount || ''}
                      onChange={(e) => {
                        const discount = parseFloat(e.target.value) || 0
                        setFormData(prev => ({ ...prev, discount }))
                        updateFinalPrice(calculatedPrice, discount)
                      }}
                    />
                  </div>
                </div>

                {/* 优惠后金额 */}
                {formData.discount > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-apple-100">
                    <span className="text-sm text-apple-600">优惠后金额</span>
                    <span className="text-lg font-bold text-orange-600">¥{finalPricePreview}</span>
                  </div>
                )}

                {/* 客服提成预览 */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-apple-500">客服提成</span>
                    <span className="text-xs text-apple-400">
                      ({currentStore?.serviceCommissionType === 'percent'
                        ? `${currentStore?.serviceCommissionValue}%`
                        : `固定¥${currentStore?.serviceCommissionValue}`
                      })
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-green-600">¥{serviceCommissionPreview.toFixed(2)}</span>
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
                  <span className="text-lg font-semibold text-purple-600">¥{girlIncomePreview.toFixed(2)}</span>
                </div>

              </div>
            )}

            {/* Appointment Time */}
            <div className="grid gap-2">
              <Label>预约时间 (可选)</Label>
              <Input
                type="datetime-local"
                value={formData.appointmentTime}
                onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={(!formData.customerId && !isCreatingCustomer) || !formData.girlId || !formData.packageId || (isCreatingCustomer && !customerSearch.trim())}
              className="bg-apple-blue text-white hover:bg-apple-blue/90"
            >
              创建订单
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
