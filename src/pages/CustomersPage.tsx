import { useState, useEffect } from 'react'
import { Search, Plus, Edit2, Trash2, UserPlus, X, BarChart3, Wallet, Crown, History } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
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
import type { Customer, Tag, Order, Girl } from '@/types'

// 会员等级名称映射
const MEMBER_LEVEL_NAMES: Record<number, string> = {
  0: '普通用户',
  1: '3K会员',
  2: '5K会员',
  3: '7K会员',
  4: '1w会员',
  5: '2w会员',
}

interface GirlStat {
  girlId: string
  girlName: string
  orderCount: number
  totalAmount: number
  completedCount: number
  cancelledCount: number
}

// 预设标签颜色
const TAG_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1', '#14B8A6', '#EAB308'
]

const PLATFORM_OPTIONS = [
  { value: 'wechat', label: '微信' },
  { value: 'telegram', label: 'Telegram' },
]

interface AccountFormProps {
  accounts: { platform: string; accountId: string; note?: string }[]
  onChange: (accounts: { platform: string; accountId: string; note?: string }[]) => void
}

// 账号编辑组件
function AccountForm({ accounts, onChange }: AccountFormProps) {
  const addAccount = () => {
    onChange([...accounts, { platform: 'wechat', accountId: '', note: '' }])
  }

  const updateAccount = (index: number, field: string, value: string) => {
    const newAccounts = [...accounts]
    newAccounts[index] = { ...newAccounts[index], [field]: value }
    onChange(newAccounts)
  }

  const removeAccount = (index: number) => {
    onChange(accounts.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {accounts.map((account, index) => (
        <div key={index} className="p-3 bg-apple-50 rounded-xl space-y-2">
          <div className="flex gap-2">
            <Select
              value={account.platform}
              onValueChange={(value) => updateAccount(index, 'platform', value)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="选择平台" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-red-400" onClick={() => removeAccount(index)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <Input
            placeholder="账号ID"
            value={account.accountId}
            onChange={(e) => updateAccount(index, 'accountId', e.target.value)}
          />
          <Input
            placeholder="备注 (可选)"
            value={account.note}
            onChange={(e) => updateAccount(index, 'note', e.target.value)}
          />
        </div>
      ))}
      <Button variant="outline" onClick={addAccount} className="w-full">
        <UserPlus className="w-4 h-4 mr-1" />
        添加账号
      </Button>
    </div>
  )
}

export function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    accounts: [] as { platform: string; accountId: string; note?: string }[],
    selectedTags: [] as string[],
    balance: 0, // 余额（分）
    totalRecharge: 0, // 累计充值（分）
    memberLevel: 0, // 会员等级
  })

  // 自定义标签输入
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0])
  const [isAddingTag, setIsAddingTag] = useState(false)

  // 妹妹统计弹窗状态
  const [statsDialogOpen, setStatsDialogOpen] = useState(false)
  const [selectedCustomerForStats, setSelectedCustomerForStats] = useState<Customer | null>(null)
  const [girlStats, setGirlStats] = useState<GirlStat[]>([])
  const [statsSortBy, setStatsSortBy] = useState<'orders' | 'amount'>('orders')
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // 充值弹窗状态
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false)
  const [rechargingCustomer, setRechargingCustomer] = useState<Customer | null>(null)
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [giftAmount, setGiftAmount] = useState('')
  const [rechargeRemark, setRechargeRemark] = useState('')
  const [isRecharging, setIsRecharging] = useState(false)

  // 余额历史弹窗状态
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)
  const [balanceHistory, setBalanceHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const { currentStore } = useAppStore()
  const { getCustomers, getTags, createCustomer, updateCustomer, deleteCustomer, createTag, getOrders, getGirls, recharge, getBalanceTransactions } = useApi()

  useEffect(() => {
    if (currentStore) {
      loadData()
    }
  }, [currentStore])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [customersData, tagsData] = await Promise.all([
        getCustomers(currentStore!.id),
        getTags(currentStore!.id),
      ])
      setCustomers(customersData)
      setTags(tagsData)
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer)
      setFormData({
        name: customer.name,
        accounts: customer.accounts || [],
        selectedTags: customer.tagIds || [],
        balance: customer.balance || 0,
        totalRecharge: customer.totalRecharge || 0,
        memberLevel: customer.memberLevel || 0,
      })
    } else {
      setEditingCustomer(null)
      setFormData({
        name: '',
        accounts: [],
        selectedTags: [],
        balance: 0,
        totalRecharge: 0,
        memberLevel: 0,
      })
    }
    // 重置自定义标签输入
    setNewTagName('')
    setSelectedColor(TAG_COLORS[0])
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !currentStore) return

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, {
          name: formData.name,
          storeId: currentStore.id,
          accounts: formData.accounts,
          tagIds: formData.selectedTags,
          balance: formData.balance,
          totalRecharge: formData.totalRecharge,
          memberLevel: formData.memberLevel,
        })
      } else {
        await createCustomer({
          name: formData.name,
          storeId: currentStore.id,
          accounts: formData.accounts,
          tagIds: formData.selectedTags,
        })
      }
      setDialogOpen(false)
      loadData()
    } catch (err) {
      console.error('保存失败:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此顾客吗？')) return
    try {
      await deleteCustomer(id)
      loadData()
    } catch (err) {
      console.error('删除失败:', err)
    }
  }

  // 打开充值弹窗
  const handleOpenRecharge = (customer: Customer) => {
    // 从最新的customers数组中获取该顾客的最新数据
    const latestCustomer = customers.find(c => c.id === customer.id)
    setRechargingCustomer(latestCustomer || customer)
    setRechargeAmount('')
    setGiftAmount('')
    setRechargeRemark('')
    setRechargeDialogOpen(true)
  }

  // 处理充值
  const handleRecharge = async () => {
    if (!rechargingCustomer || !currentStore) return
    
    const amount = parseFloat(rechargeAmount)
    if (!amount || amount <= 0) {
      alert('请输入有效的充值金额')
      return
    }

    setIsRecharging(true)
    try {
      const result = await recharge({
        customerId: rechargingCustomer.id,
        storeId: currentStore.id,
        amount: Math.round(amount * 100), // 转换为分
        giftAmount: giftAmount ? Math.round(parseFloat(giftAmount) * 100) : 0,
        remark: rechargeRemark || undefined,
      })

      // 显示充值结果
      const beforeLevelName = MEMBER_LEVEL_NAMES[result.beforeLevel] || '普通用户'
      const afterLevelName = MEMBER_LEVEL_NAMES[result.afterLevel] || '普通用户'
      
      let message = `充值成功！\n\n`
      message += `充值金额: ¥${amount.toFixed(2)}\n`
      if (result.addedAmount > amount * 100) {
        message += `赠送金额: ¥${((result.addedAmount - amount * 100) / 100).toFixed(2)}\n`
      }
      message += `当前余额: ¥${(result.afterBalance / 100).toFixed(2)}\n`
      
      if (result.afterLevel > result.beforeLevel) {
        message += `\n🎉 会员升级: ${beforeLevelName} → ${afterLevelName}`
      }

      alert(message)
      
      // 更新当前弹窗中的顾客数据，让余额显示最新值
      if (rechargingCustomer) {
        setRechargingCustomer({
          ...rechargingCustomer,
          balance: result.afterBalance,
          memberLevel: result.afterLevel,
          totalRecharge: (rechargingCustomer.totalRecharge || 0) + Math.round(amount * 100) + (giftAmount ? Math.round(parseFloat(giftAmount) * 100) : 0),
        })
      }
      
      setRechargeDialogOpen(false)
      setRechargingCustomer(null)
      setRechargeAmount('')
      setGiftAmount('')
      setRechargeRemark('')
      loadData() // 刷新顾客列表
    } catch (err: any) {
      console.error('充值失败:', err)
      alert('充值失败: ' + (err.message || '未知错误'))
    } finally {
      setIsRecharging(false)
    }
  }

  // 查看余额历史
  const handleViewHistory = async (customer: Customer) => {
    // 从最新的customers数组中获取该顾客的最新数据
    const latestCustomer = customers.find(c => c.id === customer.id)
    setHistoryCustomer(latestCustomer || customer)
    setHistoryDialogOpen(true)
    setIsLoadingHistory(true)
    try {
      const history = await getBalanceTransactions(customer.id)
      setBalanceHistory(history)
    } catch (err) {
      console.error('加载余额历史失败:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // 加载顾客妹妹统计数据
  const loadGirlStats = async (customer: Customer) => {
    setIsLoadingStats(true)
    setSelectedCustomerForStats(customer)
    try {
      const [ordersData, girlsData] = await Promise.all([
        getOrders(currentStore!.id),
        getGirls(currentStore!.id),
      ])

      // 统计该顾客预约各个妹妹的数据
      const customerOrders = ordersData.filter((o: Order) => o.customerId === customer.id)
      
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

      setGirlStats(Array.from(statsMap.values()))
      setStatsDialogOpen(true)
    } catch (err) {
      console.error('加载统计数据失败:', err)
    } finally {
      setIsLoadingStats(false)
    }
  }

  // 获取排序后的统计数据
  const getSortedStats = () => {
    const stats = [...girlStats]
    if (statsSortBy === 'orders') {
      return stats.sort((a, b) => b.orderCount - a.orderCount)
    }
    return stats.sort((a, b) => b.totalAmount - a.totalAmount)
  }

  const toggleTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter(id => id !== tagId)
        : [...prev.selectedTags, tagId]
    }))
  }

  // 添加自定义标签
  const handleAddCustomTag = async () => {
    if (!newTagName.trim() || !currentStore) return

    setIsAddingTag(true)
    try {
      const newTag = await createTag({
        storeId: currentStore.id,
        name: newTagName.trim(),
        color: selectedColor,
      })
      // 添加到标签列表
      setTags(prev => [...prev, newTag])
      // 自动选中该标签
      setFormData(prev => ({
        ...prev,
        selectedTags: [...prev.selectedTags, newTag.id]
      }))
      // 清空输入
      setNewTagName('')
    } catch (err) {
      console.error('创建标签失败:', err)
      alert('创建标签失败')
    } finally {
      setIsAddingTag(false)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.accounts?.some(a => a.accountId.toLowerCase().includes(searchQuery.toLowerCase()))
  )

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
          <h1 className="text-2xl font-semibold text-apple-900">顾客管理</h1>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-apple-blue text-white rounded-full px-4 h-10 hover:bg-apple-blue/90"
          >
            <Plus className="w-4 h-4 mr-1" />
            新增顾客
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-400" />
          <Input
            placeholder="搜索顾客姓名或账号..."
            className="pl-10 h-12 bg-white border-0 rounded-2xl shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Customers List */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-apple-400">加载中...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-apple-400">
            {searchQuery ? '未找到匹配的结果' : '暂无顾客，点击右上角添加'}
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-apple-blue to-apple-indigo flex items-center justify-center text-white font-bold">
                    {customer.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-apple-900">{customer.name}</h3>
                      {/* 会员等级徽章 */}
                      {(customer.memberLevel || 0) > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">
                          <Crown className="w-3 h-3 mr-0.5" />
                          {MEMBER_LEVEL_NAMES[customer.memberLevel || 0]}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-apple-400">
                      <span>{customer.accounts?.length || 0} 个账号</span>
                      {(customer.balance || 0) > 0 && (
                        <span className="text-green-600 flex items-center gap-1">
                          <Wallet className="w-3 h-3" />
                          ¥{((customer.balance || 0) / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* 充值按钮 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-apple-400 hover:text-green-500"
                    onClick={() => handleOpenRecharge(customer)}
                    title="充值"
                  >
                    <Wallet className="w-4 h-4" />
                  </Button>
                  {/* 余额历史按钮 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-apple-400 hover:text-blue-500"
                    onClick={() => handleViewHistory(customer)}
                    title="余额变动历史"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-apple-400 hover:text-purple-500"
                    onClick={() => loadGirlStats(customer)}
                    title="查看预约统计"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-apple-400 hover:text-apple-blue"
                    onClick={() => handleOpenDialog(customer)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-apple-400 hover:text-red-500"
                    onClick={() => handleDelete(customer.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Accounts */}
              {customer.accounts && customer.accounts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-apple-100 space-y-1">
                  {customer.accounts.map((account, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary" className="text-xs">{account.platform}</Badge>
                      <span className="text-apple-600">{account.accountId}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags - 只显示颜色 */}
              {Array.isArray(customer.tagIds) && customer.tagIds.length > 0 && Array.isArray(tags) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {customer.tagIds.map((tagId) => {
                    if (!tagId) return null
                    const tag = tags.find(t => t && t.id === tagId)
                    if (!tag) return null
                    return (
                      <span
                        key={tagId}
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: tag.color || '#3B82F6' }}
                        title={tag.name || ''}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? '编辑顾客' : '新增顾客'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">顾客姓名</Label>
              <Input
                id="name"
                placeholder="输入顾客姓名"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>账号列表</Label>
              <AccountForm
                accounts={formData.accounts}
                onChange={(accounts) => setFormData({ ...formData, accounts })}
              />
            </div>

            {/* 存量会员设置 - 仅在编辑模式下显示 */}
            {editingCustomer && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-800">存量会员设置</span>
                </div>
                
                {/* 余额设置 */}
                <div className="grid gap-2">
                  <Label htmlFor="balance">余额 (元)</Label>
                  <Input
                    id="balance"
                    type="number"
                    min={0}
                    step={0.01}
                    value={(formData.balance / 100).toFixed(2)}
                    onChange={(e) => {
                      const yuan = parseFloat(e.target.value) || 0
                      setFormData({ ...formData, balance: Math.round(yuan * 100) })
                    }}
                  />
                </div>

                {/* 累计充值设置 */}
                <div className="grid gap-2">
                  <Label htmlFor="totalRecharge">累计充值 (元)</Label>
                  <Input
                    id="totalRecharge"
                    type="number"
                    min={0}
                    step={0.01}
                    value={(formData.totalRecharge / 100).toFixed(2)}
                    onChange={(e) => {
                      const yuan = parseFloat(e.target.value) || 0
                      setFormData({ ...formData, totalRecharge: Math.round(yuan * 100) })
                    }}
                  />
                  <p className="text-xs text-apple-400">用于计算会员等级，系统自动根据累计充值判断</p>
                </div>

                {/* 会员等级设置 */}
                <div className="grid gap-2">
                  <Label htmlFor="memberLevel">会员等级</Label>
                  <Select 
                    value={formData.memberLevel.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, memberLevel: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">普通用户</SelectItem>
                      <SelectItem value="1">3K会员</SelectItem>
                      <SelectItem value="2">5K会员</SelectItem>
                      <SelectItem value="3">7K会员</SelectItem>
                      <SelectItem value="4">1w会员</SelectItem>
                      <SelectItem value="5">2w会员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>标签</Label>

              {/* 自定义标签输入 */}
              <div className="p-3 bg-apple-50 rounded-xl space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="输入新标签名称"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCustomTag()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddCustomTag}
                    disabled={!newTagName.trim() || isAddingTag}
                    size="sm"
                    className="bg-apple-blue text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* 颜色选择 */}
                <div className="flex flex-wrap gap-1.5">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "w-6 h-6 rounded-full transition-all",
                        selectedColor === color && "ring-2 ring-offset-1 ring-apple-blue scale-110"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* 已有标签列表 */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm transition-all flex items-center gap-1",
                        formData.selectedTags.includes(tag.id)
                          ? "ring-2 ring-offset-1"
                          : "opacity-60"
                      )}
                      style={{
                        backgroundColor: tag.color || '#3B82F6',
                        color: 'white',
                      }}
                    >
                      {tag.name}
                      {formData.selectedTags.includes(tag.id) && (
                        <X className="w-3 h-3" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim()}
              className="bg-apple-blue text-white hover:bg-apple-blue/90"
            >
              {editingCustomer ? '保存' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 妹妹统计弹窗 */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>顾客偏好分析</DialogTitle>
          </DialogHeader>
          
          {selectedCustomerForStats && (
            <div className="py-4 space-y-4">
              {/* 顾客信息 */}
              <div className="flex items-center gap-3 p-3 bg-apple-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-apple-blue to-apple-indigo flex items-center justify-center text-white font-bold">
                  {selectedCustomerForStats.name[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-apple-900">{selectedCustomerForStats.name}</h3>
                  <p className="text-sm text-apple-400">
                    共预约 {girlStats.reduce((sum, g) => sum + g.orderCount, 0)} 次
                  </p>
                </div>
              </div>

              {/* 排序切换 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setStatsSortBy('orders')}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all",
                    statsSortBy === 'orders'
                      ? "bg-apple-blue text-white"
                      : "bg-apple-100 text-apple-600"
                  )}
                >
                  按次数排序
                </button>
                <button
                  onClick={() => setStatsSortBy('amount')}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all",
                    statsSortBy === 'amount'
                      ? "bg-apple-blue text-white"
                      : "bg-apple-100 text-apple-600"
                  )}
                >
                  按金额排序
                </button>
              </div>

              {/* 统计列表 */}
              {isLoadingStats ? (
                <div className="text-center py-8 text-apple-400">加载中...</div>
              ) : girlStats.length === 0 ? (
                <div className="text-center py-8 text-apple-400">暂无预约记录</div>
              ) : (
                <div className="space-y-3">
                  {getSortedStats().map((stat, index) => (
                    <div key={stat.girlId} className="p-3 bg-apple-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center",
                          index === 0 ? "bg-yellow-100 text-yellow-700" :
                          index === 1 ? "bg-gray-200 text-gray-700" :
                          index === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-apple-100 text-apple-600"
                        )}>
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-apple-900">{stat.girlName}</p>
                          <div className="flex gap-2 text-xs">
                            <span className="text-green-600">完成 {stat.completedCount} 次</span>
                            {stat.cancelledCount > 0 && (
                              <span className="text-red-500">取消 {stat.cancelledCount} 次</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-apple-900">
                            {statsSortBy === 'orders' ? `${stat.orderCount}次` : `¥${stat.totalAmount}`}
                          </p>
                          <p className="text-xs text-apple-400">
                            {statsSortBy === 'orders' ? `¥${stat.totalAmount}` : `${stat.orderCount}次`}
                          </p>
                        </div>
                      </div>
                      {/* 进度条 */}
                      <div className="mt-2 h-1.5 bg-apple-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            index === 0 ? "bg-gradient-to-r from-yellow-400 to-yellow-500" :
                            index === 1 ? "bg-gradient-to-r from-gray-300 to-gray-400" :
                            index === 2 ? "bg-gradient-to-r from-orange-300 to-orange-400" :
                            "bg-gradient-to-r from-apple-blue to-apple-purple"
                          )}
                          style={{
                            width: `${statsSortBy === 'orders'
                              ? (stat.orderCount / (getSortedStats()[0]?.orderCount || 1)) * 100
                              : (stat.totalAmount / (getSortedStats()[0]?.totalAmount || 1)) * 100
                            }%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 充值弹窗 */}
      <Dialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>会员充值</DialogTitle>
          </DialogHeader>
          
          {rechargingCustomer && (
            <div className="py-4 space-y-4">
              {/* 顾客信息 */}
              <div className="flex items-center gap-3 p-3 bg-apple-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">
                  {rechargingCustomer.name[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-apple-900">{rechargingCustomer.name}</h3>
                  <div className="flex items-center gap-2 text-sm">
                    {(rechargingCustomer.memberLevel || 0) > 0 ? (
                      <Badge className="bg-amber-100 text-amber-700 text-xs">
                        <Crown className="w-3 h-3 mr-0.5" />
                        {MEMBER_LEVEL_NAMES[rechargingCustomer.memberLevel || 0]}
                      </Badge>
                    ) : (
                      <span className="text-apple-400">普通用户</span>
                    )}
                    <span className="text-green-600">
                      余额: ¥{((rechargingCustomer.balance || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 充值金额 */}
              <div className="grid gap-2">
                <Label htmlFor="rechargeAmount">充值金额 (元)</Label>
                <Input
                  id="rechargeAmount"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="输入充值金额"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                />
              </div>

              {/* 赠送金额 */}
              <div className="grid gap-2">
                <Label htmlFor="giftAmount">赠送金额 (元，可选)</Label>
                <Input
                  id="giftAmount"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="输入赠送金额"
                  value={giftAmount}
                  onChange={(e) => setGiftAmount(e.target.value)}
                />
              </div>

              {/* 备注 */}
              <div className="grid gap-2">
                <Label htmlFor="rechargeRemark">备注 (可选)</Label>
                <Input
                  id="rechargeRemark"
                  placeholder="输入备注信息"
                  value={rechargeRemark}
                  onChange={(e) => setRechargeRemark(e.target.value)}
                />
              </div>

              {/* 充值后预估 */}
              {rechargeAmount && parseFloat(rechargeAmount) > 0 && (
                <div className="p-3 bg-green-50 rounded-xl text-sm">
                  <p className="text-green-800 font-medium mb-1">充值预览</p>
                  <p className="text-green-600">
                    充值后余额: ¥{(((rechargingCustomer.balance || 0) / 100) + parseFloat(rechargeAmount) + (giftAmount ? parseFloat(giftAmount) : 0)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRechargeDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleRecharge}
              disabled={!rechargeAmount || parseFloat(rechargeAmount) <= 0 || isRecharging}
              className="bg-green-500 text-white hover:bg-green-600"
            >
              {isRecharging ? '充值中...' : '确认充值'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 余额历史弹窗 */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>余额变动历史</DialogTitle>
          </DialogHeader>
          
          {historyCustomer && (
            <div className="py-4 space-y-4">
              {/* 顾客信息 - 从最新历史记录中获取实际余额 */}
              {(() => {
                // 从历史记录计算最新余额（如果有记录）
                const latestBalance = balanceHistory.length > 0 
                  ? balanceHistory[0].balanceAfter 
                  : historyCustomer.balance
                // 从历史记录计算最新会员等级（如果有充值记录）
                const latestRechargeRecord = balanceHistory.find(r => r.type === 'recharge')
                const latestLevel = latestRechargeRecord?.afterLevel ?? historyCustomer.memberLevel
                
                return (
                  <div className="flex items-center gap-3 p-3 bg-apple-50 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                      {historyCustomer.name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-apple-900">{historyCustomer.name}</h3>
                      <div className="flex items-center gap-2 text-sm">
                        {(latestLevel || 0) > 0 ? (
                          <Badge className="bg-amber-100 text-amber-700 text-xs">
                            <Crown className="w-3 h-3 mr-0.5" />
                            {MEMBER_LEVEL_NAMES[latestLevel || 0]}
                          </Badge>
                        ) : (
                          <span className="text-apple-400">普通用户</span>
                        )}
                        <span className="text-green-600">
                          当前余额: ¥{((latestBalance || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* 历史记录列表 */}
              {isLoadingHistory ? (
                <div className="text-center py-8 text-apple-400">加载中...</div>
              ) : balanceHistory.length === 0 ? (
                <div className="text-center py-8 text-apple-400">暂无余额变动记录</div>
              ) : (
                <div className="space-y-2">
                  {[...balanceHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((record) => (
                    <div key={record.id} className="p-3 bg-apple-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={cn(
                            "text-xs",
                            record.type === 'recharge' ? "bg-green-100 text-green-700" :
                            record.type === 'consume' ? "bg-red-100 text-red-700" :
                            "bg-blue-100 text-blue-700"
                          )}>
                            {record.type === 'recharge' ? '充值' :
                             record.type === 'consume' ? '消费' : '退款'}
                          </Badge>
                          <span className={cn(
                            "font-medium",
                            record.amount > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {record.amount > 0 ? '+' : ''}¥{(record.amount / 100).toFixed(2)}
                          </span>
                        </div>
                        <span className="text-xs text-apple-400">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-apple-500">
                        <span>余额: ¥{(record.balanceBefore / 100).toFixed(2)} → ¥{(record.balanceAfter / 100).toFixed(2)}</span>
                      </div>
                      {record.remark && (
                        <p className="text-xs text-apple-400 mt-1">{record.remark}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
