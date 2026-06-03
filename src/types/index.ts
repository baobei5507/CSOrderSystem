// 店家
export interface Store {
  id: string
  name: string
  serviceCommissionType: 'percent' | 'fixed'
  serviceCommissionValue: number
  createdAt: number
  updatedAt: number
}

// 妹妹
export interface Girl {
  id: string
  storeId: string
  name: string
  status: 'active' | 'rest' | 'left'
  commissionType: 'percent' | 'fixed'
  commissionValue: number
  createdAt: number
  updatedAt: number
}

// 套餐
export interface Package {
  id: string
  storeId: string
  code: string
  name: string
  basePrice: number
  status: 'active' | 'inactive'
  createdAt: number
  updatedAt: number
}

// 妹妹套餐价格
export interface GirlPackagePrice {
  id: string
  storeId: string
  girlId: string
  packageId: string
  price: number
  createdAt: number
  updatedAt: number
}

// 顾客
export interface Customer {
  id: string
  storeId: string
  name: string
  nickname?: string | null
  remark?: string | null
  accounts?: Account[]
  tagIds?: string[]
  createdAt: number
  updatedAt: number
}

// 账号（用于顾客）
export interface Account {
  id?: string
  platform: string
  accountId: string
  note?: string
}

// 顾客账号
export interface CustomerAccount {
  id: string
  customerId: string
  platform: 'wechat' | 'telegram'
  account: string
  createdAt: number
}

// 标签
export interface Tag {
  id: string
  storeId: string
  name: string
  color: string | null
  createdAt: number
}

// 顾客标签关联
export interface CustomerTag {
  customerId: string
  tagId: string
}

// 订单
export interface Order {
  id: string
  orderNo: string
  storeId: string
  customerId: string
  customerAccountId: string
  girlId: string
  packageId: string
  appointmentTime: number | null
  price: number
  status: 'pending' | 'completed' | 'cancelled'
  serviceStaffName: string
  girlIncome: number
  serviceCommission: number
  remark: string | null
  createdAt: number
  updatedAt: number
}

// 订单快照
export interface OrderSnapshot {
  id: string
  orderId: string
  customerNameSnapshot: string | null
  customerAccountSnapshot: string | null
  girlNameSnapshot: string | null
  packageNameSnapshot: string | null
  priceSnapshot: number
  girlCommissionTypeSnapshot: 'percent' | 'fixed'
  girlCommissionValueSnapshot: number
  serviceCommissionTypeSnapshot: 'percent' | 'fixed'
  serviceCommissionValueSnapshot: number
  createdAt: number
}

// API响应
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 统计数据
export interface DashboardStats {
  todayOrders: number
  todayAmount: number
  todayServiceCommission: number
  todayGirlIncome: number
  monthOrders: number
  monthAmount: number
  monthServiceCommission: number
  monthGirlIncome: number
}

// 排行数据
export interface GirlRanking {
  id: string
  name: string
  orderCount: number
  income: number
}

export interface CustomerRanking {
  id: string
  nickname: string
  orderCount: number
  totalAmount: number
}