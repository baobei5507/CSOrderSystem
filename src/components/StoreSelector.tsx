import { useState, useEffect } from 'react'
import { ChevronDown, Plus, Store as StoreIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApi } from '@/hooks/useApi'
import type { Store } from '@/types'

export function StoreSelector() {
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newStoreName, setNewStoreName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  const { currentStore, setCurrentStore } = useAppStore()
  const { getStores, createStore, error } = useApi()
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    try {
      const data = await getStores()
      setStores(data)
      if (data.length > 0 && !currentStore) {
        setCurrentStore(data[0])
      }
    } catch (err) {
      console.error('加载店家失败:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) return
    
    setIsCreating(true)
    try {
      const store = await createStore({ name: newStoreName })
      setStores([...stores, store])
      setCurrentStore(store)
      setCreateOpen(false)
      setNewStoreName('')
    } catch (err) {
      console.error('创建店家失败:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectStore = (store: Store) => {
    setCurrentStore(store)
    setOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm">
        <StoreIcon className="w-4 h-4 text-apple-blue" />
        <span className="text-sm text-apple-400">加载中...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* 店家选择器 */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm",
            "transition-all duration-200 hover:shadow-md active:scale-95"
          )}
        >
          <StoreIcon className="w-4 h-4 text-apple-blue" />
          <span className="text-sm font-medium text-apple-900">
            {currentStore?.name || '选择店家'}
          </span>
          <ChevronDown className={cn("w-4 h-4 text-apple-400 transition-transform", open && "rotate-180")} />
        </button>

        {/* 下拉菜单 */}
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-apple-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              {stores.length === 0 ? (
                <div className="px-4 py-3 text-sm text-apple-400 text-center">
                  暂无店家
                </div>
              ) : (
                stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => handleSelectStore(store)}
                    className={cn(
                      "w-full px-4 py-3 text-left text-sm transition-colors",
                      currentStore?.id === store.id
                        ? "bg-apple-blue/10 text-apple-blue font-medium"
                        : "text-apple-600 hover:bg-apple-50"
                    )}
                  >
                    {store.name}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* 新建店家按钮 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full h-9 w-9 p-0 bg-apple-green/10 text-apple-green hover:bg-apple-green/20"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>新建店家</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">店家名称</Label>
              <Input
                id="name"
                placeholder="输入店家名称"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreateStore}
              disabled={isCreating || !newStoreName.trim()}
              className="bg-apple-blue text-white hover:bg-apple-blue/90"
            >
              {isCreating ? '创建中...' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
