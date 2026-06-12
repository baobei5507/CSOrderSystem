import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Store } from '@/types'

interface AuthUser {
  id: string
  username: string
  storeId: string | null
  role: string
}

interface AppState {
  // 登录认证
  token: string | null
  authUser: AuthUser | null
  isLoggedIn: boolean
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void

  // 当前店家
  currentStore: Store | null
  setCurrentStore: (store: Store | null) => void
  updateStore: (store: Store) => void
  
  // 客服名称
  serviceStaffName: string
  setServiceStaffName: (name: string) => void
  
  // 底部导航当前页
  activeTab: 'home' | 'daily' | 'customers' | 'analysis' | 'orders' | 'girls' | 'tags' | 'settings' | 'export'
  setActiveTab: (tab: 'home' | 'daily' | 'customers' | 'analysis' | 'orders' | 'girls' | 'tags' | 'settings' | 'export') => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      authUser: null,
      isLoggedIn: false,
      setAuth: (token, user) => set({ token, authUser: user, isLoggedIn: true }),
      clearAuth: () => set({ token: null, authUser: null, isLoggedIn: false }),

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