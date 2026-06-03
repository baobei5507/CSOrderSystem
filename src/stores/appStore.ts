import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Store } from '@/types'

interface AppState {
  // 当前店家
  currentStore: Store | null
  setCurrentStore: (store: Store | null) => void
  updateStore: (store: Store) => void
  
  // 客服名称
  serviceStaffName: string
  setServiceStaffName: (name: string) => void
  
  // 底部导航当前页
  activeTab: 'home' | 'customers' | 'orders' | 'girls' | 'tags' | 'settings'
  setActiveTab: (tab: 'home' | 'customers' | 'orders' | 'girls' | 'tags' | 'settings') => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentStore: null,
      setCurrentStore: (store) => set({ currentStore: store }),
      updateStore: (store) => set((state) => ({
        currentStore: state.currentStore?.id === store.id ? store : state.currentStore
      })),
      
      serviceStaffName: '客服',
      setServiceStaffName: (name) => set({ serviceStaffName: name }),
      
      activeTab: 'home',
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'app-storage',
    }
  )
)