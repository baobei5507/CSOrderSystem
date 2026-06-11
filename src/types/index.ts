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
  excludeFromDiscount?: boolean // 不参与任何优惠
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
  dailyPrice?: number | null // 当日特价（可选，优先使用）
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
  balance?: number // 余额（分）
  totalRecharge?: number // 累计充值（分）
  memberLevel?: number // 会员等级 0-5
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
  hours?: number // 预约小时数
  originalPrice?: number // 每小时原价
  totalOriginalAmount?: number // 原价总计
  price: number
  discount?: number
  finalPrice?: number
  discountType?: 'memberDay' | 'memberRegular' | 'coupon' | 'freeOrder' | 'none'
  discountPercent?: number // 实际折扣率
  discountAmount?: number // 优惠金额
  deductedBalance?: number // 实际扣除余额
  usedMemberDayBenefit?: number // 是否使用了会员日权益
  girlIncome: number
  serviceCommission: number
  storeProfit?: number // 店家利润
  couponSource?: string | null // 优惠券来源（如TG群组）
  status: 'pending' | 'completed' | 'cancelled'
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

// 会员等级
export interface MemberLevel {
  id?: string
  storeId?: string
  level: number
  name: string
  minRecharge: number // 分
  regularDiscount: number // 如95表示95折
  memberDayDiscount: number
  createdAt?: number
  updatedAt?: number
}

// 会员配置
export interface MemberConfig {
  id?: string
  storeId?: string
  enabled: boolean
  priceMarkup: number // 会员优惠前提价（元）
  minBalancePercent: number
  memberDays: number[]
  levels: MemberLevel[]
  createdAt?: number
  updatedAt?: number
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