import { useState, useEffect } from 'react'
import { Search, Plus, Edit2, Trash2, UserPlus } from 'lucide-react'
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
import type { Customer, Tag } from '@/types'

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
  })

  const { currentStore } = useAppStore()
  const { getCustomers, getTags, createCustomer, updateCustomer, deleteCustomer } = useApi()

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
      })
    } else {
      setEditingCustomer(null)
      setFormData({
        name: '',
        accounts: [],
        selectedTags: [],
      })
    }
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

  const toggleTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter(id => id !== tagId)
        : [...prev.selectedTags, tagId]
    }))
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
                    <h3 className="font-semibold text-apple-900">{customer.name}</h3>
                    <p className="text-sm text-apple-400">
                      {customer.accounts?.length || 0} 个账号
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
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

              {/* Tags */}
              {customer.tagIds && customer.tagIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {customer.tagIds.map(tagId => {
                    const tag = tags.find(t => t.id === tagId)
                    if (!tag) return null
                    return (
                      <span
                        key={tagId}
                        className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: tag.color || '#3B82F6' }}
                      >
                        {tag.name}
                      </span>
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

            <div className="grid gap-2">
              <Label>标签</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-sm transition-all",
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
                  </button>
                ))}
              </div>
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
    </div>
  )
}
