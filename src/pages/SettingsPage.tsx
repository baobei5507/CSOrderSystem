import { useState, useEffect } from 'react'
import { ChevronRight, Percent, Package, Plus, Edit2, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useApi } from '@/hooks/useApi'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Package as PackageType } from '@/types'

// 套餐设置页面
function PackagesSettings() {
  const { currentStore } = useAppStore()
  const { getPackages, createPackage, updatePackage, deletePackage } = useApi()
  const [packages, setPackages] = useState<PackageType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPkg, setEditingPkg] = useState<PackageType | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    basePrice: '',
  })

  useEffect(() => {
    if (currentStore) loadPackages()
  }, [currentStore])

  const loadPackages = async () => {
    setIsLoading(true)
    try {
      const data = await getPackages(currentStore!.id)
      setPackages(data)
    } catch (err) {
      console.error('加载套餐失败:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (pkg?: PackageType) => {
    if (pkg) {
      setEditingPkg(pkg)
      setFormData({
        name: pkg.name,
        code: pkg.code,
        basePrice: pkg.basePrice?.toString() || '',
      })
    } else {
      setEditingPkg(null)
      setFormData({ name: '', code: '', basePrice: '' })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !currentStore) return

    try {
      const data = {
        name: formData.name,
        code: formData.code,
        basePrice: formData.basePrice === '' ? 0 : parseFloat(formData.basePrice),
        storeId: currentStore.id,
      }
      if (editingPkg) {
        await updatePackage(editingPkg.id, data)
      } else {
        await createPackage(data)
      }
      setDialogOpen(false)
      loadPackages()
    } catch (err) {
      console.error('保存失败:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此套餐吗？')) return
    try {
      await deletePackage(id)
      loadPackages()
    } catch (err) {
      console.error('删除失败:', err)
    }
  }

  if (!currentStore) {
    return <div className="text-center py-12 text-apple-400">请先选择店家</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">套餐管理</h2>
        <Button onClick={() => handleOpenDialog()} size="sm" className="bg-apple-blue text-white rounded-full">
          <Plus className="w-4 h-4 mr-1" />
          新增
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-apple-400">加载中...</div>
      ) : packages.length === 0 ? (
        <div className="text-center py-8 text-apple-400">暂无套餐</div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-apple-900">{pkg.name}</h3>
                  <Badge variant="secondary" className="text-xs">{pkg.code}</Badge>
                </div>
                <p className="text-sm text-apple-400 mt-1">基础价格: ¥{pkg.basePrice}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenDialog(pkg)}>
                  <Edit2 className="w-4 h-4 text-apple-400" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(pkg.id)}>
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingPkg ? '编辑套餐' : '新增套餐'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>套餐名称</Label>
              <Input
                placeholder="如：SSS套餐"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>套餐代码</Label>
              <Input
                placeholder="如：SSS"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>基础价格 (¥)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={formData.basePrice}
                onChange={(e) => {
                  setFormData({ ...formData, basePrice: e.target.value })
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim()} className="bg-apple-blue text-white">
              {editingPkg ? '保存' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 提成设置页面
function CommissionSettings() {
  const { currentStore, updateStore } = useAppStore()
  const { updateStore: updateStoreApi } = useApi()
  const [commissionType, setCommissionType] = useState<'percent' | 'fixed'>('fixed')
  const [commissionValue, setCommissionValue] = useState('10')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (currentStore) {
      setCommissionType(currentStore.serviceCommissionType as 'percent' | 'fixed' || 'fixed')
      setCommissionValue(currentStore.serviceCommissionValue?.toString() || '10')
    }
  }, [currentStore])

  const handleSave = async () => {
    if (!currentStore) return
    setIsSaving(true)
    try {
      await updateStoreApi(currentStore.id, {
        serviceCommissionType: commissionType,
        serviceCommissionValue: commissionValue === '' ? 0 : parseFloat(commissionValue),
      })
      // 更新本地状态
      updateStore({
        ...currentStore,
        serviceCommissionType: commissionType,
        serviceCommissionValue: commissionValue === '' ? 0 : parseFloat(commissionValue),
      })
      alert('保存成功')
    } catch (err) {
      console.error('保存失败:', err)
      alert('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  if (!currentStore) {
    return <div className="text-center py-12 text-apple-400">请先选择店家</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">客服提成设置</h2>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="grid gap-4">
          <div>
            <Label>提成类型</Label>
            <Select
              value={commissionType}
              onValueChange={(v: 'percent' | 'fixed') => setCommissionType(v)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">固定金额 (¥)</SelectItem>
                <SelectItem value="percent">按比例 (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="commissionValue">
              {commissionType === 'percent' ? '提成比例 (%)' : '提成金额 (¥)'}
            </Label>
            <Input
              id="commissionValue"
              type="number"
              min={0}
              step={commissionType === 'percent' ? 1 : 0.01}
              value={commissionValue}
              onChange={(e) => setCommissionValue(e.target.value)}
              className="mt-2"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-apple-blue text-white"
          >
            {isSaving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'menu' | 'packages' | 'commission'>('menu')

  const menuItems = [
    { id: 'packages', label: '套餐管理', icon: Package, description: '管理套餐及价格' },
    { id: 'commission', label: '提成设置', icon: Percent, description: '设置客服提成规则' },
  ]

  if (activeTab === 'packages') {
    return (
      <div className="pb-24">
        <div className="sticky top-0 bg-apple-50/95 backdrop-blur-md px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('menu')} className="text-apple-400">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
            <h1 className="text-xl font-semibold">套餐管理</h1>
          </div>
        </div>
        <div className="px-4">
          <PackagesSettings />
        </div>
      </div>
    )
  }

  if (activeTab === 'commission') {
    return (
      <div className="pb-24">
        <div className="sticky top-0 bg-apple-50/95 backdrop-blur-md px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('menu')} className="text-apple-400">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
            <h1 className="text-xl font-semibold">提成设置</h1>
          </div>
        </div>
        <div className="px-4">
          <CommissionSettings />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-apple-50/95 backdrop-blur-md px-4 pt-4 pb-4">
        <h1 className="text-2xl font-semibold text-apple-900">设置</h1>
        <p className="text-sm text-apple-400 mt-1">管理系统配置</p>
      </div>

      {/* Menu Items */}
      <div className="px-4 space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm",
              "transition-all duration-200 active:scale-[0.98]"
            )}
          >
            <div className="w-10 h-10 rounded-xl bg-apple-blue/10 flex items-center justify-center">
              <item.icon className="w-5 h-5 text-apple-blue" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-medium text-apple-900">{item.label}</h3>
              <p className="text-sm text-apple-400">{item.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-apple-300" />
          </button>
        ))}
      </div>
    </div>
  )
}
