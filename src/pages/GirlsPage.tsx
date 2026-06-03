import { useState, useEffect } from 'react'
import { Search, Plus, ChevronRight, Edit2, Trash2 } from 'lucide-react'
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
import type { Girl } from '@/types'

type GirlStatus = 'active' | 'rest' | 'left'
type CommissionType = 'percent' | 'fixed'

const statusMap: Record<GirlStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: '在岗', color: 'text-apple-green', bgColor: 'bg-green-100' },
  rest: { label: '休息', color: 'text-apple-orange', bgColor: 'bg-orange-100' },
  left: { label: '离职', color: 'text-apple-400', bgColor: 'bg-gray-100' },
}

export function GirlsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [girls, setGirls] = useState<Girl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGirl, setEditingGirl] = useState<Girl | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    status: 'active' as GirlStatus,
    commissionType: 'percent' as CommissionType,
    commissionValue: 70,
  })

  const { currentStore } = useAppStore()
  const { getGirls, createGirl, updateGirl, deleteGirl } = useApi()

  useEffect(() => {
    if (currentStore) {
      loadGirls()
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
        <p className="text-apple-400">请先选择店家</p>
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-apple-50/95 backdrop-blur-md px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-apple-900">妹妹管理</h1>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-apple-blue text-white rounded-full px-4 h-10 hover:bg-apple-blue/90"
          >
            <Plus className="w-4 h-4 mr-1" />
            新增妹妹
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-apple-green">{activeCount}</p>
            <p className="text-xs text-apple-400">在岗</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-apple-orange">{restCount}</p>
            <p className="text-xs text-apple-400">休息</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-apple-600">{girls.length}</p>
            <p className="text-xs text-apple-400">总计</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-400" />
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
          <div className="text-center py-12 text-apple-400">加载中...</div>
        ) : filteredGirls.length === 0 ? (
          <div className="text-center py-12 text-apple-400">
            {searchQuery ? '未找到匹配的结果' : '暂无妹妹，点击右上角添加'}
          </div>
        ) : (
          filteredGirls.map((girl) => {
            const status = statusMap[girl.status as GirlStatus]
            return (
              <div
                key={girl.id}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4"
              >
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-apple-pink to-apple-orange flex items-center justify-center text-white font-bold text-lg">
                  {girl.name[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-apple-900">{girl.name}</h3>
                    <Badge className={cn("text-xs px-2 py-0.5 rounded-full", status.bgColor, status.color)}>
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-apple-400 mt-1">
                    提成: {girl.commissionType === 'percent' ? `${girl.commissionValue}%` : `¥${girl.commissionValue}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-apple-400 hover:text-apple-blue"
                    onClick={() => handleOpenDialog(girl)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-apple-400 hover:text-red-500"
                    onClick={() => handleDelete(girl.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ChevronRight className="w-5 h-5 text-apple-300" />
                </div>
              </div>
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
              className="bg-apple-blue text-white hover:bg-apple-blue/90"
            >
              {editingGirl ? '保存' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
