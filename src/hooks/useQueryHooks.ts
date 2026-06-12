import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Store, Girl, Package, Customer, Tag, Order } from '@/types'
import { useAppStore } from '@/stores/appStore'

const API_BASE = 'https://cs-order-api.550759734-d15.workers.dev/api'

// 通用fetch函数（带认证）
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const storageData = localStorage.getItem('app-storage')
  let token: string | null = null
  if (storageData) {
    try {
      const parsed = JSON.parse(storageData)
      token = parsed?.state?.token || null
    } catch {}
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    ...options,
  })

  if (response.status === 401) {
    const store = useAppStore.getState()
    store.clearAuth()
    throw new Error('登录已过期，请重新登录')
  }

  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'API Error')
  }
  return data.data
}

// Stores API
export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: () => fetchApi<Store[]>('/stores'),
  })
}

export function useCreateStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) =>
      fetchApi<{ id: string }>('/stores', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stores'] }),
  })
}

// Girls API
export function useGirls(storeId?: string) {
  return useQuery({
    queryKey: ['girls', storeId],
    queryFn: () => fetchApi<Girl[]>(`/girls?storeId=${storeId}`),
    enabled: !!storeId,
  })
}

export function useCreateGirl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { storeId: string; name: string; status: string; commissionType: string; commissionValue: number }) =>
      fetchApi<{ id: string }>('/girls', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['girls', vars.storeId] }),
  })
}

export function useUpdateGirl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Girl> }) =>
      fetchApi(`/girls?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['girls'] })
    },
  })
}

export function useDeleteGirl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/girls?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['girls'] })
    },
  })
}

// Packages API
export function usePackages(storeId?: string) {
  return useQuery({
    queryKey: ['packages', storeId],
    queryFn: () => fetchApi<Package[]>(`/packages?storeId=${storeId}`),
    enabled: !!storeId,
  })
}

export function useCreatePackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { storeId: string; name: string; code: string; basePrice: number }) =>
      fetchApi<{ id: string }>('/packages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['packages', vars.storeId] }),
  })
}

export function useUpdatePackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Package> }) =>
      fetchApi(`/packages?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
  })
}

export function useDeletePackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/packages?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
  })
}

// Customers API
export function useCustomers(storeId?: string) {
  return useQuery({
    queryKey: ['customers', storeId],
    queryFn: () => fetchApi<Customer[]>(`/customers?storeId=${storeId}`),
    enabled: !!storeId,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { storeId: string; name: string; accounts?: any[]; tagIds?: string[] }) =>
      fetchApi<{ id: string }>('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['customers', vars.storeId] }),
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      fetchApi(`/customers?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/customers?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

// Tags API
export function useTags(storeId?: string) {
  return useQuery({
    queryKey: ['tags', storeId],
    queryFn: () => fetchApi<Tag[]>(`/tags?storeId=${storeId}`),
    enabled: !!storeId,
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { storeId: string; name: string; color: string }) =>
      fetchApi<{ id: string }>('/tags', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['tags', vars.storeId] }),
  })
}

export function useUpdateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tag> }) =>
      fetchApi(`/tags?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/tags?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

// Orders API
export function useOrders(storeId?: string) {
  return useQuery({
    queryKey: ['orders', storeId],
    queryFn: () => fetchApi<Order[]>(`/orders?storeId=${storeId}`),
    enabled: !!storeId,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { storeId: string; customerId: string; girlId: string; packageId: string; finalPrice: number; appointmentTime?: string }) =>
      fetchApi<{ id: string; orderNo: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['orders', vars.storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', vars.storeId] })
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Order> }) =>
      fetchApi(`/orders?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/orders?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// Dashboard API
export function useDashboard(storeId?: string) {
  return useQuery({
    queryKey: ['dashboard', storeId],
    queryFn: () => fetchApi<{
      todayRevenue: number
      todayOrders: number
      monthRevenue: number
      monthOrders: number
      girlRanking: { id: string; name: string; orderCount: number; revenue: number }[]
      customerRanking: { id: string; name: string; orderCount: number; revenue: number }[]
    }>(`/dashboard?storeId=${storeId}`),
    enabled: !!storeId,
  })
}
