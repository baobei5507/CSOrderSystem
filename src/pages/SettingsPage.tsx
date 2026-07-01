import { useState, useEffect } from 'react'
import { ChevronRight, Percent, Package, Plus, Edit2, Trash2, Crown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useApi } from '@/hooks/useApi'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CuteCard, CharacterAvatar, ChiikawaLoading } from '@/components/ChiikawaTheme'

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
        basePrice: pkg.basePrice?.toString() || '',
      })
    } else {
      setEditingPkg(null)
      setFormData({ name: '', basePrice: '' })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !currentStore) return

    try {
      const data = {
        name: formData.name,
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
    return <div className="text-center py-12 text-chiikawa-brown/60">请先选择店家</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-chiikawa-brown">套餐管理</h2>
        <Button onClick={() => handleOpenDialog()} size="sm" className="bg-chiikawa-blue text-white rounded-full">
          <Plus className="w-4 h-4 mr-1" />
          新增
        </Button>
      </div>

      {isLoading ? (
        <ChiikawaLoading />
      ) : packages.length === 0 ? (
        <div className="text-center py-8 text-chiikawa-brown/60">
          <CharacterAvatar character="hachiwareDaily6" size="lg" className="mx-auto mb-4 opacity-50" />
          暂无套餐
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <CuteCard key={pkg.id} variant="cream" className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-chiikawa-brown">{pkg.name}</h3>
                <p className="text-sm text-chiikawa-brown/60 mt-1">基础价格: ¥{pkg.basePrice}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-chiikawa-brown/60 hover:text-chiikawa-blue" onClick={() => handleOpenDialog(pkg)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-chiikawa-brown/60 hover:text-red-500" onClick={() => handleDelete(pkg.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CuteCard>
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
            <Button onClick={handleSubmit} disabled={!formData.name.trim()} className="bg-chiikawa-blue text-white hover:bg-chiikawa-blue/90">
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
  const [secondStaffName, setSecondStaffName] = useState('')
  const [secondStaffCommissionType, setSecondStaffCommissionType] = useState<'percent' | 'fixed'>('fixed')
  const [secondStaffCommissionValue, setSecondStaffCommissionValue] = useState('0')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (currentStore) {
      setCommissionType(currentStore.serviceCommissionType as 'percent' | 'fixed' || 'fixed')
      setCommissionValue(currentStore.serviceCommissionValue?.toString() || '10')
      setSecondStaffName(currentStore.secondStaffName || '')
      setSecondStaffCommissionType(currentStore.secondStaffCommissionType as 'percent' | 'fixed' || 'fixed')
      setSecondStaffCommissionValue(currentStore.secondStaffCommissionValue?.toString() || '0')
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
        secondStaffName: secondStaffName || null,
        secondStaffCommissionType: secondStaffName ? secondStaffCommissionType : null,
        secondStaffCommissionValue: secondStaffName ? (secondStaffCommissionValue === '' ? 0 : parseFloat(secondStaffCommissionValue)) : null,
      })
      // 更新本地状态
      updateStore({
        ...currentStore,
        serviceCommissionType: commissionType,
        serviceCommissionValue: commissionValue === '' ? 0 : parseFloat(commissionValue),
        secondStaffName: secondStaffName || null,
        secondStaffCommissionType: secondStaffName ? secondStaffCommissionType : null,
        secondStaffCommissionValue: secondStaffName ? (secondStaffCommissionValue === '' ? 0 : parseFloat(secondStaffCommissionValue)) : null,
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
    return <div className="text-center py-12 text-chiikawa-brown/60">请先选择店家</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-chiikawa-brown">客服提成设置</h2>
      <CuteCard variant="cream" className="p-4">
        <h3 className="font-semibold text-chiikawa-brown mb-3">我的提成</h3>
        <div className="grid gap-4">
          <div>
            <Label className="text-chiikawa-brown/70">提成类型</Label>
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
            <Label htmlFor="commissionValue" className="text-chiikawa-brown/70">
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
        </div>
      </CuteCard>

      {/* 第二客服提成配置 */}
      <CuteCard variant="cream" className="p-4">
        <h3 className="font-semibold text-chiikawa-brown mb-3">第二客服提成</h3>
        <p className="text-sm text-chiikawa-brown/50 mb-3">配置第二客服的提成规则，创建订单时可选择其他客服预约</p>
        <div className="grid gap-4">
          <div>
            <Label className="text-chiikawa-brown/70">客服名称</Label>
            <Input
              placeholder="填写第二客服名称"
              value={secondStaffName}
              onChange={(e) => setSecondStaffName(e.target.value)}
              className="mt-2"
            />
          </div>
          {secondStaffName && (
            <>
              <div>
                <Label className="text-chiikawa-brown/70">提成类型</Label>
                <Select
                  value={secondStaffCommissionType}
                  onValueChange={(v: 'percent' | 'fixed') => setSecondStaffCommissionType(v)}
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
                <Label htmlFor="secondCommissionValue" className="text-chiikawa-brown/70">
                  {secondStaffCommissionType === 'percent' ? '提成比例 (%)' : '提成金额 (¥)'}
                </Label>
                <Input
                  id="secondCommissionValue"
                  type="number"
                  min={0}
                  step={secondStaffCommissionType === 'percent' ? 1 : 0.01}
                  value={secondStaffCommissionValue}
                  onChange={(e) => setSecondStaffCommissionValue(e.target.value)}
                  className="mt-2"
                />
              </div>
            </>
          )}
        </div>
      </CuteCard>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-chiikawa-blue text-white hover:bg-chiikawa-blue/90"
      >
        {isSaving ? '保存中...' : '保存设置'}
      </Button>
    </div>
  )
}

// 会员设置页面
function MemberSettings() {
  const { currentStore } = useAppStore()
  const { getMemberConfig, saveMemberConfig } = useApi()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const [config, setConfig] = useState({
    enabled: false,
    priceMarkup: 0, // 会员优惠前提价（元）
    levels: [
      { level: 1, name: '3K会员', minRecharge: 3000, regularDiscount: 95, memberDayDiscount: 85 },
      { level: 2, name: '5K会员', minRecharge: 5000, regularDiscount: 90, memberDayDiscount: 80 },
      { level: 3, name: '7K会员', minRecharge: 7000, regularDiscount: 88, memberDayDiscount: 75 },
      { level: 4, name: '1w会员', minRecharge: 10000, regularDiscount: 85, memberDayDiscount: 70 },
      { level: 5, name: '2w会员', minRecharge: 20000, regularDiscount: 83, memberDayDiscount: 65 },
    ],
    memberDays: [1, 2], // 周一、周二
    minBalancePercent: 50,
  })

  useEffect(() => {
    if (currentStore) loadConfig()
  }, [currentStore])

  const loadConfig = async () => {
    setIsLoading(true)
    try {
      const data = await getMemberConfig(currentStore!.id)
      if (data) {
        setConfig({
          enabled: data.enabled || false,
          priceMarkup: data.priceMarkup || 0,
          levels: data.levels || config.levels,
          memberDays: data.memberDays || [1, 2],
          minBalancePercent: data.minBalancePercent || 50,
        })
      }
    } catch (err) {
      console.error('加载会员配置失败:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentStore) return
    setIsSaving(true)
    try {
      await saveMemberConfig({
        storeId: currentStore.id,
        ...config,
      })
      alert('保存成功')
    } catch (err) {
      console.error('保存失败:', err)
      alert('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleMemberDay = (day: number) => {
    setConfig(prev => ({
      ...prev,
      memberDays: prev.memberDays.includes(day)
        ? prev.memberDays.filter(d => d !== day)
        : [...prev.memberDays, day].sort(),
    }))
  }

  const updateLevel = (index: number, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      levels: prev.levels.map((level, i) => 
        i === index ? { ...level, [field]: value } : level
      ),
    }))
  }

  if (!currentStore) {
    return <div className="text-center py-12 text-chiikawa-brown/60">请先选择店家</div>
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-chiikawa-brown/60">
        <CharacterAvatar character="hachiwareDaily7" size="md" className="mx-auto mb-2 opacity-50" />
        加载中...
      </div>
    )
  }

  const weekDays = [
    { value: 1, label: '周一' },
    { value: 2, label: '周二' },
    { value: 3, label: '周三' },
    { value: 4, label: '周四' },
    { value: 5, label: '周五' },
    { value: 6, label: '周六' },
    { value: 0, label: '周日' },
  ]

  return (
    <div className="space-y-6">
      {/* 开关 */}
      <CuteCard variant="cream" className="p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-chiikawa-brown">会员系统</h3>
          <p className="text-sm text-chiikawa-brown/60">启用会员充值和折扣功能</p>
        </div>
        <button
          onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
          className={cn(
            "w-12 h-6 rounded-full transition-colors relative",
            config.enabled ? "bg-chiikawa-pink" : "bg-chiikawa-peach/50"
          )}
        >
          <span
            className={cn(
              "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
              config.enabled ? "left-7" : "left-1"
            )}
          />
        </button>
      </CuteCard>

      {config.enabled && (
        <>
          {/* 会员日设置 */}
          <CuteCard variant="cream" className="p-4">
            <h3 className="font-semibold text-chiikawa-brown mb-3">会员日设置</h3>
            <div className="flex flex-wrap gap-2">
              {weekDays.map(day => (
                <button
                  key={day.value}
                  onClick={() => toggleMemberDay(day.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm transition-colors",
                    config.memberDays.includes(day.value)
                      ? "bg-chiikawa-pink text-white"
                      : "bg-chiikawa-pink-light text-chiikawa-brown"
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <Label className="text-sm text-chiikawa-brown/70">会员日最低余额比例 (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={config.minBalancePercent}
                onChange={(e) => setConfig(prev => ({ ...prev, minBalancePercent: parseInt(e.target.value) || 50 }))}
                className="mt-1 w-32"
              />
              <p className="text-xs text-chiikawa-brown/50 mt-1">余额需达到充值额度的此比例才可享受会员日折扣</p>
            </div>
            <div className="mt-4 pt-4 border-t border-chiikawa-peach/20">
              <Label className="text-sm text-chiikawa-brown/70">会员优惠前提价 (¥)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={config.priceMarkup}
                onChange={(e) => setConfig(prev => ({ ...prev, priceMarkup: parseFloat(e.target.value) || 0 }))}
                className="mt-1 w-32"
              />
              <p className="text-xs text-chiikawa-brown/50 mt-1">计算会员折扣前先加上此金额，例如：原价100元，前提价20元，则按120元计算折扣</p>
            </div>
          </CuteCard>

          {/* 会员等级配置 */}
          <CuteCard variant="cream" className="p-4">
            <h3 className="font-semibold text-chiikawa-brown mb-3">会员等级配置</h3>
            <div className="space-y-3">
              {config.levels.map((level, index) => (
                <div key={level.level} className="p-3 bg-chiikawa-cream rounded-xl border border-chiikawa-peach/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-chiikawa-yellow" />
                    <Input
                      value={level.name}
                      onChange={(e) => updateLevel(index, 'name', e.target.value)}
                      className="h-8 w-32 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <Label className="text-xs text-chiikawa-brown/60">最低充值 (¥)</Label>
                      <Input
                        type="number"
                        value={level.minRecharge}
                        onChange={(e) => updateLevel(index, 'minRecharge', parseInt(e.target.value) || 0)}
                        className="h-8 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-chiikawa-brown/60">常规折扣 (%)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={level.regularDiscount}
                        onChange={(e) => updateLevel(index, 'regularDiscount', parseInt(e.target.value) || 100)}
                        className="h-8 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-chiikawa-brown/60">会员日折扣 (%)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={level.memberDayDiscount}
                        onChange={(e) => updateLevel(index, 'memberDayDiscount', parseInt(e.target.value) || 100)}
                        className="h-8 mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CuteCard>
        </>
      )}

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-chiikawa-pink text-white hover:bg-chiikawa-pink/90"
      >
        {isSaving ? '保存中...' : '保存设置'}
      </Button>
    </div>
  )
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'menu' | 'packages' | 'commission' | 'member'>('menu')

  const menuItems = [
    { id: 'packages', label: '套餐管理', icon: Package, description: '管理套餐及价格' },
    { id: 'member', label: '会员设置', icon: Crown, description: '配置会员等级和折扣' },
    { id: 'commission', label: '提成设置', icon: Percent, description: '设置客服提成规则' },
  ]

  if (activeTab === 'packages') {
    return (
      <div className="pb-24 bg-chiikawa-cream min-h-screen">
        <div className="sticky top-0 bg-chiikawa-cream/95 backdrop-blur-md px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('menu')} className="text-chiikawa-brown/60">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
            <div className="flex items-center gap-3">
              <CharacterAvatar character="hachiwareAvatar1" size="xs" />
              <h1 className="text-xl font-bold text-chiikawa-brown">套餐管理</h1>
            </div>
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
      <div className="pb-24 bg-chiikawa-cream min-h-screen">
        <div className="sticky top-0 bg-chiikawa-cream/95 backdrop-blur-md px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('menu')} className="text-chiikawa-brown/60">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
            <div className="flex items-center gap-3">
              <CharacterAvatar character="hachiwareCute2" size="xs" />
              <h1 className="text-xl font-bold text-chiikawa-brown">提成设置</h1>
            </div>
          </div>
        </div>
        <div className="px-4">
          <CommissionSettings />
        </div>
      </div>
    )
  }

  if (activeTab === 'member') {
    return (
      <div className="pb-24 bg-chiikawa-cream min-h-screen">
        <div className="sticky top-0 bg-chiikawa-cream/95 backdrop-blur-md px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('menu')} className="text-chiikawa-brown/60">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
            <div className="flex items-center gap-3">
              <CharacterAvatar character="hachiwareLineStamp" size="xs" />
              <h1 className="text-xl font-bold text-chiikawa-brown">会员设置</h1>
            </div>
          </div>
        </div>
        <div className="px-4">
          <MemberSettings />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24 bg-chiikawa-cream min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-chiikawa-cream/95 backdrop-blur-md px-4 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <CharacterAvatar character="hachiwareCute1" size="sm" />
          <div>
            <h1 className="text-xl font-bold text-chiikawa-brown">设置</h1>
            <p className="text-sm text-chiikawa-brown/60">管理系统配置</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 space-y-3">
        {menuItems.map((item) => (
          <CuteCard
            key={item.id}
            variant="cream"
            className="w-full flex items-center gap-4 p-4 cursor-pointer active:scale-[0.98]"
            onClick={() => setActiveTab(item.id as any)}
          >
            <div className="w-10 h-10 rounded-xl bg-chiikawa-blue-light flex items-center justify-center">
              <item.icon className="w-5 h-5 text-chiikawa-blue" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-medium text-chiikawa-brown">{item.label}</h3>
              <p className="text-sm text-chiikawa-brown/60">{item.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-chiikawa-brown/30" />
          </CuteCard>
        ))}
      </div>

      {/* 退出登录 */}
      <div className="px-4 mt-6">
        <button
          onClick={() => {
            const store = useAppStore.getState()
            store.clearAuth()
          }}
          className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
        >
          退出登录
        </button>
        <p className="text-center text-xs text-chiikawa-brown/40 mt-2">
          当前登录: {useAppStore.getState().authUser?.username || '-'}
        </p>
      </div>
    </div>
  )
}
