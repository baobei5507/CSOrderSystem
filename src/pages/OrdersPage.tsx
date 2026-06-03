import { useState, useEffect } from 'react'
import { Search, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react'
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
import type { Order, Customer, Girl, Package } from '@/types'

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
    appointmentTime: '',
  })

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedGirl, setSelectedGirl] = useState<Girl | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [calculatedPrice, setCalculatedPrice] = useState(0)

  // 提成预览
  const [serviceCommissionPreview, setServiceCommissionPreview] = useState(0)
  const [girlIncomePreview, setGirlIncomePreview] = useState(0)

  const { currentStore } = useAppStore()
  const { getOrders, getCustomers, getGirls, getPackages, createOrder, updateOrder, getGirlPackagePrices } = useApi()

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
        const finalPrice = girlPrice?.price || selectedPackage.basePrice
        setCalculatedPrice(finalPrice)
        setFormData(prev => ({ ...prev, price: finalPrice }))

        // 计算提成预览
        calculateCommissions(finalPrice)
      }).catch(() => {
        // 查询失败时使用基础价格
        setCalculatedPrice(selectedPackage.basePrice)
        setFormData(prev => ({ ...prev, price: selectedPackage.basePrice }))
        calculateCommissions(selectedPackage.basePrice)
      })
    }
  }, [selectedGirl, selectedPackage])

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
      appointmentTime: '',
    })
    setSelectedCustomer(null)
    setSelectedGirl(null)
    setSelectedPackage(null)
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
    if (!formData.customerId || !formData.girlId || !formData.packageId || !currentStore) return

    try {
      await createOrder({
        ...formData,
        storeId: currentStore.id,
        price: calculatedPrice,
      })
      setDialogOpen(false)
      loadData()
    } catch (err) {
      console.error('创建订单失败:', err)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrder(orderId, { status: newStatus })
      loadData()
    } catch (err) {
      console.error('更新状态失败:', err)
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
                  <span className="text-lg font-bold text-apple-blue">
                    ¥{order.price}
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

      {/* Create Order Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建订单</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Customer Selection */}
            <div className="grid gap-2">
              <Label>选择顾客</Label>
              <Select value={formData.customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="选择顾客" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account Selection */}
            {selectedCustomer && selectedCustomer.accounts && selectedCustomer.accounts.length > 0 && (
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
              disabled={!formData.customerId || !formData.girlId || !formData.packageId}
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
