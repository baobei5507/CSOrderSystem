import { useState, useEffect } from 'react'
import { Search, Plus, ChevronRight, Edit2, Trash2, DollarSign } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useApi } from '@/hooks/useApi'
import { useAppStore } from '@/stores/appStore'
import { EmptyGirlsState } from '@/components/EmptyState'
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
import type { Girl, Package } from '@/types'

interface GirlPackagePrice {
  packageId: string
  packageName: string
  packageCode: string
  price: number
}

type GirlStatus = 'active' | 'rest' | 'left'
type CommissionType = 'percent' | 'fixed'

const statusMap: Record<GirlStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: '在岗', color: 'text-green-600', bgColor: 'bg-chiikawa-mint/50' },
  rest: { label: '休息', color: 'text-orange-600', bgColor: 'bg-chiikawa-peach/50' },
  left: { label: '离职', color: 'text-gray-500', bgColor: 'bg-gray-100' },
}

export function GirlsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [girls, setGirls] = useState<Girl[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [priceDialogOpen, setPriceDialogOpen] = useState(false)
  const [editingGirl, setEditingGirl] = useState<Girl | null>(null)
  const [selectedGirl, setSelectedGirl] = useState<Girl | null>(null)
  const [priceFormData, setPriceFormData] = useState<Record<string, string>>({})
  const [isSavingPrices, setIsSavingPrices] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    status: 'active' as GirlStatus,
    commissionType: 'percent' as CommissionType,
    commissionValue: 70,
  })

  const { currentStore } = useAppStore()
  const { getGirls, createGirl, updateGirl, deleteGirl, getPackages } = useApi()

  useEffect(() => {
    if (currentStore) {
      loadGirls()
      loadPackages()
    }
  }, [currentStore])

  const loadGirls = async () => {
    setIsLoading(true)
    try {
      const data = await getGirls(currentStore!.id)
      setGirls(data)
    } catch (err) {
      console.error('加载妹妹列表失败:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPackages = async () => {
    try {
      const data = await getPackages(currentStore!.id)
      setPackages(data)
    } catch (err) {
      console.error('加载套餐列表失败:', err)
    }
  }

  const handleOpenPriceDialog = async (girl: Girl) => {
    setSelectedGirl(girl)
    setPriceDialogOpen(true)
    setPriceFormData({})
    // 加载该妹妹的套餐价格
    try {
      const API_BASE = 'https://cs-order-api.550759734-d15.workers.dev/api'
      const response = await fetch(`${API_BASE}/girl-package-prices?girlId=${girl.id}`)
      const result = await response.json()
      if (result.success) {
        // 初始化表单数据
        const initialData: Record<string, string> = {}
        result.data.forEach((p: GirlPackagePrice) => {
          initialData[p.packageId] = p.price?.toString() || ''
        })
        setPriceFormData(initialData)
      }
    } catch (err) {
      console.error('加载套餐价格失败:', err)
    }
  }

  const handleSaveGirlPrices = async () => {
    if (!selectedGirl || !currentStore) return
    setIsSavingPrices(true)
    try {
      const API_BASE = 'https://cs-order-api.550759734-d15.workers.dev/api'
      // 批量保存所有价格
      const savePromises = Object.entries(priceFormData).map(([packageId, price]) => {
        const priceValue = price === '' ? 0 : parseFloat(price)
        return fetch(`${API_BASE}/girl-package-prices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            girlId: selectedGirl.id,
            packageId,
            price: priceValue,
            storeId: currentStore.id,
          }),
        })
      })
      
      await Promise.all(savePromises)
      setPriceDialogOpen(false)
    } catch (err) {
      console.error('保存套餐价格失败:', err)
      alert('保存失败，请重试')
    } finally {
      setIsSavingPrices(false)
    }
  }

  const handlePriceChange = (packageId: string, value: string) => {
    setPriceFormData(prev => ({
      ...prev,
      [packageId]: value
    }))
  }

  const handleOpenDialog = (girl?: Girl) => {
    if (girl) {
      setEditingGirl(girl)
      setFormData({
        name: girl.name,
        status: girl.status as GirlStatus,
        commissionType: girl.commissionType as CommissionType,
        commissionValue: girl.commissionValue,
      })
    } else {
      setEditingGirl(null)
      setFormData({
        name: '',
        status: 'active',
        commissionType: 'percent',
        commissionValue: 70,
      })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !currentStore) return

    try {
      if (editingGirl) {
        await updateGirl(editingGirl.id, {
          ...formData,
          storeId: currentStore.id,
        })
      } else {
        await createGirl({
          ...formData,
          storeId: currentStore.id,
        })
      }
      setDialogOpen(false)
      loadGirls()
    } catch (err) {
      console.error('保存失败:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这位妹妹吗？')) return
    try {
      await deleteGirl(id)
      loadGirls()
    } catch (err) {
      console.error('删除失败:', err)
    }
  }

  const filteredGirls = girls.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCount = girls.filter(g => g.status === 'active').length
  const restCount = girls.filter(g => g.status === 'rest').length

  if (!currentStore) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <p className="text-chiikawa-brown/60">请先选择店家</p>
      </div>
    )
  }

  return (
    <div className="pb-24 bg-chiikawa-cream min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-chiikawa-cream/95 backdrop-blur-md px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CharacterAvatar character="hachiwareCute3" size="sm" />
            <h1 className="text-xl font-bold text-chiikawa-brown">妹妹管理</h1>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-chiikawa-blue text-white rounded-full px-4 h-10 hover:bg-chiikawa-blue/90"
          >
            <Plus className="w-4 h-4 mr-1" />
            新增妹妹
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-4">
          <CuteCard variant="mint" className="flex-1 p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-chiikawa-brown/60">在岗</p>
          </CuteCard>
          <CuteCard variant="cream" className="flex-1 p-3 text-center">
            <p className="text-2xl font-bold text-orange-500">{restCount}</p>
            <p className="text-xs text-chiikawa-brown/60">休息</p>
          </CuteCard>
          <CuteCard variant="pink" className="flex-1 p-3 text-center">
            <p className="text-2xl font-bold text-chiikawa-pink">{girls.length}</p>
            <p className="text-xs text-chiikawa-brown/60">总计</p>
          </CuteCard>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-chiikawa-brown/40" />
          <Input
            placeholder="搜索妹妹..."
            className="pl-10 h-12 bg-white border-0 rounded-2xl shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Girls List */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          <ChiikawaLoading />
        ) : filteredGirls.length === 0 ? (
          searchQuery ? (
            <div className="text-center py-12 text-chiikawa-brown/60">
              <CharacterAvatar character="hachiwareDaily7" size="lg" className="mx-auto mb-4 opacity-50" />
              未找到匹配的结果
            </div>
          ) : (
            <EmptyGirlsState />
          )
        ) : (
          filteredGirls.map((girl) => {
            const status = statusMap[girl.status as GirlStatus]
            return (
              <CuteCard
                key={girl.id}
                variant="cream"
                className="p-4 flex items-center gap-4"
              >
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-chiikawa-pink to-chiikawa-peach flex items-center justify-center text-white font-bold text-lg">
                  {girl.name[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-chiikawa-brown">{girl.name}</h3>
                    <Badge className={cn("text-xs px-2 py-0.5 rounded-full", status.bgColor, status.color)}>
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-chiikawa-brown/60 mt-1">
                    提成: {girl.commissionType === 'percent' ? `${girl.commissionValue}%` : `¥${girl.commissionValue}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-chiikawa-brown/60 hover:text-green-500"
                    onClick={() => handleOpenPriceDialog(girl)}
                    title="设置套餐价格"
                  >
                    <DollarSign className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-chiikawa-brown/60 hover:text-chiikawa-blue"
                    onClick={() => handleOpenDialog(girl)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-chiikawa-brown/60 hover:text-red-500"
                    onClick={() => handleDelete(girl.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ChevronRight className="w-5 h-5 text-chiikawa-brown/30" />
                </div>
              </CuteCard>
            )
          })
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingGirl ? '编辑妹妹' : '新增妹妹'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                placeholder="输入妹妹姓名"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>状态</Label>
              <Select
                value={formData.status}
                onValueChange={(v: GirlStatus) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">在岗</SelectItem>
                  <SelectItem value="rest">休息</SelectItem>
                  <SelectItem value="left">离职</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>提成类型</Label>
              <Select
                value={formData.commissionType}
                onValueChange={(v: CommissionType) => setFormData({ ...formData, commissionType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">按比例 (%)</SelectItem>
                  <SelectItem value="fixed">固定金额 (¥)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="commissionValue">
                提成{formData.commissionType === 'percent' ? '比例' : '金额'}
              </Label>
              <Input
                id="commissionValue"
                type="number"
                value={formData.commissionValue}
                onChange={(e) => setFormData({ ...formData, commissionValue: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim()}
              className="bg-chiikawa-blue text-white hover:bg-chiikawa-blue/90"
            >
              {editingGirl ? '保存' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 套餐价格设置对话框 */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedGirl?.name} - 套餐价格设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {packages.length === 0 ? (
              <div className="text-center text-chiikawa-brown/60 py-4">
                <CharacterAvatar character="hachiware" size="md" className="mx-auto mb-2 opacity-50" />
                暂无套餐，请先创建套餐
              </div>
            ) : (
              packages.map((pkg) => (
                <CuteCard key={pkg.id} variant="cream" className="flex items-center gap-3 p-3">
                  <div className="flex-1">
                    <div className="font-medium text-chiikawa-brown">{pkg.name}</div>
                    <div className="text-xs text-chiikawa-brown/60">基础价: ¥{pkg.basePrice}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap text-chiikawa-brown/70">定价:</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder={pkg.basePrice.toString()}
                      className="w-24 h-9"
                      value={priceFormData[pkg.id] || ''}
                      onChange={(e) => handlePriceChange(pkg.id, e.target.value)}
                    />
                  </div>
                </CuteCard>
              ))
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setPriceDialogOpen(false)}
              disabled={isSavingPrices}
            >
              取消
            </Button>
            <Button 
              onClick={handleSaveGirlPrices}
              disabled={isSavingPrices || packages.length === 0}
              className="bg-chiikawa-blue text-white hover:bg-chiikawa-blue/90"
            >
              {isSavingPrices ? '保存中...' : '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
