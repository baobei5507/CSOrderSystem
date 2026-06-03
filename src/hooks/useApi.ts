import { useState, useCallback } from 'react'
import type { Store, Girl, Package, Customer, Tag, Order, CustomerAccount } from '@/types'

const API_BASE = 'https://cs-order-api.550759734-d15.workers.dev/api'

// 通用fetch函数
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'API Error')
  }
  return data.data
}

// 统一的 useApi hook
export function useApi() {
  const [error, setError] = useState<string | null>(null)

  // Stores
  const getStores = useCallback(async (): Promise<Store[]> => {
    return fetchApi('/stores')
  }, [])

  const createStore = useCallback(async (data: { name: string }): Promise<Store> => {
    return fetchApi('/stores', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }, [])

  const updateStore = useCallback(async (id: string, data: Partial<Store>): Promise<Store> => {
    return fetchApi(`/stores?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }, [])

  // Girls
  const getGirls = useCallback(async (storeId: string): Promise<Girl[]> => {
    return fetchApi(`/girls?storeId=${storeId}`)
  }, [])

  const createGirl = useCallback(async (data: {
    storeId: string
    name: string
    status: string
    commissionType: string
    commissionValue: number
  }): Promise<Girl> => {
    return fetchApi('/girls', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }, [])

  const updateGirl = useCallback(async (id: string, data: Partial<Girl>): Promise<Girl> => {
    return fetchApi(`/girls?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }, [])

  const deleteGirl = useCallback(async (id: string): Promise<void> => {
    return fetchApi(`/girls?id=${id}`, { method: 'DELETE' })
  }, [])

  // Packages
  const getPackages = useCallback(async (storeId: string): Promise<Package[]> => {
    return fetchApi(`/packages?storeId=${storeId}`)
  }, [])

  const createPackage = useCallback(async (data: {
    storeId: string
    name: string
    code: string
    basePrice: number
  }): Promise<Package> => {
    return fetchApi('/packages', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }, [])

  const updatePackage = useCallback(async (id: string, data: Partial<Package>): Promise<Package> => {
    return fetchApi(`/packages?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }, [])

  const deletePackage = useCallback(async (id: string): Promise<void> => {
    return fetchApi(`/packages?id=${id}`, { method: 'DELETE' })
  }, [])

  // Tags
  const getTags = useCallback(async (storeId: string): Promise<Tag[]> => {
    return fetchApi(`/tags?storeId=${storeId}`)
  }, [])

  const createTag = useCallback(async (data: {
    storeId: string
    name: string
    color: string
  }): Promise<Tag> => {
    return fetchApi('/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }, [])

  const updateTag = useCallback(async (id: string, data: Partial<Tag>): Promise<Tag> => {
    return fetchApi(`/tags?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }, [])

  const deleteTag = useCallback(async (id: string): Promise<void> => {
    return fetchApi(`/tags?id=${id}`, { method: 'DELETE' })
  }, [])

  // Customers
  const getCustomers = useCallback(async (storeId: string): Promise<(Customer & { accounts?: CustomerAccount[]; tagIds?: string[] })[]> => {
    return fetchApi(`/customers?storeId=${storeId}`)
  }, [])

  const createCustomer = useCallback(async (data: {
    storeId: string
    name: string
    accounts?: { platform: string; accountId: string; note?: string }[]
    tagIds?: string[]
  }): Promise<{ id: string; accounts?: { id: string; platform: string; account: string }[] }> => {
    return fetchApi('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }, [])

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer & { accounts?: { platform: string; accountId: string; note?: string }[]; tagIds?: string[] }>): Promise<Customer> => {
    return fetchApi(`/customers?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }, [])

  const deleteCustomer = useCallback(async (id: string): Promise<void> => {
    return fetchApi(`/customers?id=${id}`, { method: 'DELETE' })
  }, [])

  // Orders
  const getOrders = useCallback(async (storeId: string): Promise<Order[]> => {
    return fetchApi(`/orders?storeId=${storeId}`)
  }, [])

  const createOrder = useCallback(async (data: {
    storeId: string
    customerId: string
    customerAccountId?: string
    girlId: string
    packageId: string
    price: number
    appointmentTime?: string
  }): Promise<Order> => {
    return fetchApi('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }, [])

  const updateOrder = useCallback(async (id: string, data: Partial<Order>): Promise<Order> => {
    return fetchApi(`/orders?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }, [])

  const deleteOrder = useCallback(async (id: string): Promise<void> => {
    return fetchApi(`/orders?id=${id}`, { method: 'DELETE' })
  }, [])

  // Dashboard
  const getDashboard = useCallback(async (storeId: string): Promise<{
    todayRevenue: number
    todayOrders: number
    todayCompleted: number
    todayCancelled: number
    monthRevenue: number
    monthOrders: number
    monthCompleted: number
    monthCancelled: number
    monthServiceCommission: number
    totalCustomers: number
    newCustomersThisMonth: number
    girlRanking: { id: string; name: string; orderCount: number; revenue: number; girlIncome: number }[]
    customerRanking: { id: string; name: string; orderCount: number; revenue: number }[]
    tagStats: { id: string; name: string; color: string | null; count: number }[]
  }> => {
    return fetchApi(`/dashboard?storeId=${storeId}`)
  }, [])

  // Girl Package Prices
  const getGirlPackagePrices = useCallback(async (girlId: string): Promise<{ packageId: string; price: number; packageName: string; packageCode: string }[]> => {
    return fetchApi(`/girl-package-prices?girlId=${girlId}`)
  }, [])

  return {
    error,
    setError,
    // Stores
    getStores,
    createStore,
    updateStore,
    // Girls
    getGirls,
    createGirl,
    updateGirl,
    deleteGirl,
    // Packages
    getPackages,
    createPackage,
    updatePackage,
    deletePackage,
    // Tags
    getTags,
    createTag,
    updateTag,
    deleteTag,
    // Customers
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    // Orders
    getOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    // Dashboard
    getDashboard,
    // Girl Package Prices
    getGirlPackagePrices,
  }
}

// React Query hooks (保留供其他用途)
export * from './useQueryHooks'
