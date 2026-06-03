import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Store } from '@/types'

interface AppState {
  // 当前店家
  currentStore: Store | null
  setCurrentStore: (store: Store | null) => void
  
  // 客服名称
  serviceStaffName: string
  setServiceStaffName: (name: string) => void
  
  // 底部导航当前页
  activeTab: 'home' | 'customers' | 'orders' | 'girls' | 'settings'
  setActiveTab: (tab: 'home' | 'customers' | 'orders' | 'girls' | 'settings') => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentStore: null,
      setCurrentStore: (store) => set({ currentStore: store }),
      
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