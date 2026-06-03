import { useState, useEffect } from 'react'
import { ChevronRight, Percent, Package, Tag, Edit2, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApi } from '@/hooks/useApi'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Package as PackageType, Tag as TagType } from '@/types'

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
    basePrice: 0,
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
        basePrice: pkg.basePrice,
      })
    } else {
      setEditingPkg(null)
      setFormData({ name: '', code: '', basePrice: 0 })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !currentStore) return

    try {
      if (editingPkg) {
        await updatePackage(editingPkg.id, { ...formData, storeId: currentStore.id })
      } else {
        await createPackage({ ...formData, storeId: currentStore.id })
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
              <Label>基础价格</Label>
              <Input
                type="number"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
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

// 标签设置页面
function TagsSettings() {
  const { currentStore } = useAppStore()
  const { getTags, createTag, updateTag, deleteTag } = useApi()
  const [tags, setTags] = useState<TagType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagType | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
  })

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ]

  useEffect(() => {
    if (currentStore) loadTags()
  }, [currentStore])

  const loadTags = async () => {
    setIsLoading(true)
    try {
      const data = await getTags(currentStore!.id)
      setTags(data)
    } catch (err) {
      console.error('加载标签失败:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (tag?: TagType) => {
    if (tag) {
      setEditingTag(tag)
      setFormData({ name: tag.name, color: tag.color || '#3B82F6' })
    } else {
      setEditingTag(null)
      setFormData({ name: '', color: '#3B82F6' })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !currentStore) return

    try {
      if (editingTag) {
        await updateTag(editingTag.id, { ...formData, storeId: currentStore.id })
      } else {
        await createTag({ ...formData, storeId: currentStore.id })
      }
      setDialogOpen(false)
      loadTags()
    } catch (err) {
      console.error('保存失败:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此标签吗？')) return
    try {
      await deleteTag(id)
      loadTags()
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
        <h2 className="text-lg font-semibold">标签管理</h2>
        <Button onClick={() => handleOpenDialog()} size="sm" className="bg-apple-blue text-white rounded-full">
          <Plus className="w-4 h-4 mr-1" />
          新增
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-apple-400">加载中...</div>
      ) : tags.length === 0 ? (
        <div className="text-center py-8 text-apple-400">暂无标签</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-white text-sm"
              style={{ backgroundColor: tag.color || '#3B82F6' }}
            >
              <span>{tag.name}</span>
              <button onClick={() => handleOpenDialog(tag)} className="hover:opacity-80">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={() => handleDelete(tag.id)} className="hover:opacity-80">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingTag ? '编辑标签' : '新增标签'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>标签名称</Label>
              <Input
                placeholder="如：VIP"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>标签颜色</Label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform",
                      formData.color === color && "ring-2 ring-offset-2 ring-apple-blue scale-110"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim()} className="bg-apple-blue text-white">
              {editingTag ? '保存' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 提成设置页面
function CommissionSettings() {
  const { currentStore } = useAppStore()
  const [commission, setCommission] = useState(10)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // TODO: 实现保存逻辑
    await new Promise(r => setTimeout(r, 500))
    setIsSaving(false)
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
            <Label htmlFor="commission">每单提成金额 (¥)</Label>
            <Input
              id="commission"
              type="number"
              value={commission}
              onChange={(e) => setCommission(Number(e.target.value))}
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
  const [activeTab, setActiveTab] = useState<'menu' | 'packages' | 'tags' | 'commission'>('menu')

  const menuItems = [
    { id: 'packages', label: '套餐管理', icon: Package, description: '管理按摩套餐及价格' },
    { id: 'tags', label: '标签管理', icon: Tag, description: '管理顾客标签' },
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

  if (activeTab === 'tags') {
    return (
      <div className="pb-24">
        <div className="sticky top-0 bg-apple-50/95 backdrop-blur-md px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('menu')} className="text-apple-400">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
            <h1 className="text-xl font-semibold">标签管理</h1>
          </div>
        </div>
        <div className="px-4">
          <TagsSettings />
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
