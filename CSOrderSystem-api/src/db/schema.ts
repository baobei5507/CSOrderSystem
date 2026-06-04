import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// 店家
export const stores = sqliteTable('stores', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  serviceCommissionType: text('service_commission_type', { enum: ['percent', 'fixed'] }).notNull(),
  serviceCommissionValue: real('service_commission_value').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

// 妹妹
export const girls = sqliteTable('girls', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  name: text('name').notNull(),
  status: text('status', { enum: ['active', 'rest', 'left'] }).notNull(),
  commissionType: text('commission_type', { enum: ['percent', 'fixed'] }).notNull(),
  commissionValue: real('commission_value').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

// 套餐
export const packages = sqliteTable('packages', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  code: text('code').notNull(),
  name: text('name').notNull(),
  basePrice: real('base_price').notNull().default(0),
  status: text('status', { enum: ['active', 'inactive'] }).notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

// 妹妹套餐价格
export const girlPackagePrices = sqliteTable('girl_package_prices', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  girlId: text('girl_id').notNull().references(() => girls.id),
  packageId: text('package_id').notNull().references(() => packages.id),
  price: real('price').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

// 顾客
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  nickname: text('nickname'),
  remark: text('remark'),
  balance: integer('balance').notNull().default(0), // 余额（分）
  totalRecharge: integer('total_recharge').notNull().default(0), // 累计充值（分）
  memberLevel: integer('member_level').notNull().default(0), // 会员等级 0-5
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

// 顾客账号
export const customerAccounts = sqliteTable('customer_accounts', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  platform: text('platform', { enum: ['wechat', 'telegram'] }).notNull(),
  account: text('account').notNull(),
  createdAt: integer('created_at').notNull(),
})

// 标签
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  name: text('name').notNull(),
  color: text('color'),
  createdAt: integer('created_at').notNull(),
})

// 顾客标签关联
export const customerTags = sqliteTable('customer_tags', {
  customerId: text('customer_id').notNull().references(() => customers.id),
  tagId: text('tag_id').notNull().references(() => tags.id),
}, (table) => ({
  pk: { columns: [table.customerId, table.tagId] },
}))

// 订单
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  orderNo: text('order_no').notNull().unique(),
  storeId: text('store_id').notNull().references(() => stores.id),
  customerId: text('customer_id').notNull().references(() => customers.id),
  customerAccountId: text('customer_account_id').references(() => customerAccounts.id),
  girlId: text('girl_id').notNull().references(() => girls.id),
  packageId: text('package_id').notNull().references(() => packages.id),
  appointmentTime: integer('appointment_time'),
  hours: integer('hours').notNull().default(1), // 预约小时数
  price: real('price').notNull(),
  discount: real('discount').default(0),
  finalPrice: real('final_price').notNull(),
  status: text('status', { enum: ['pending', 'completed', 'cancelled'] }).notNull(),
  serviceStaffName: text('service_staff_name').notNull(),
  girlIncome: real('girl_income').notNull(),
  serviceCommission: real('service_commission').notNull(),
  // 会员折扣相关字段
  originalPrice: integer('original_price'), // 每小时原价（分）
  totalOriginalAmount: integer('total_original_amount'), // 原价总计（分）
  discountType: text('discount_type', { enum: ['memberDay', 'memberRegular', 'coupon', 'none'] }), // 折扣类型
  discountPercent: integer('discount_percent'), // 实际折扣率
  discountAmount: integer('discount_amount'), // 优惠金额（分）
  deductedBalance: integer('deducted_balance'), // 实际扣除余额（分）
  usedMemberDayBenefit: integer('used_member_day_benefit', { mode: 'boolean' }).notNull().default(false), // 是否使用了会员日权益
  storeProfit: integer('store_profit'), // 店家利润（分）
  remark: text('remark'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

// 订单快照
export const orderSnapshots = sqliteTable('order_snapshots', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  customerNameSnapshot: text('customer_name_snapshot'),
  customerAccountSnapshot: text('customer_account_snapshot'),
  girlNameSnapshot: text('girl_name_snapshot'),
  packageNameSnapshot: text('package_name_snapshot'),
  priceSnapshot: real('price_snapshot').notNull(),
  girlCommissionTypeSnapshot: text('girl_commission_type_snapshot', { enum: ['percent', 'fixed'] }).notNull(),
  girlCommissionValueSnapshot: real('girl_commission_value_snapshot').notNull(),
  serviceCommissionTypeSnapshot: text('service_commission_type_snapshot', { enum: ['percent', 'fixed'] }).notNull(),
  serviceCommissionValueSnapshot: real('service_commission_value_snapshot').notNull(),
  createdAt: integer('created_at').notNull(),
})

// 店铺会员配置
export const storeMemberConfigs = sqliteTable('store_member_configs', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id).unique(),
  levels: text('levels').notNull(), // JSON: 会员等级数组
  memberDays: text('member_days').notNull(), // JSON: 会员日 [1, 2]
  minBalancePercent: integer('min_balance_percent').notNull().default(50),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

// 余额流水
export const balanceTransactions = sqliteTable('balance_transactions', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  orderId: text('order_id').references(() => orders.id),
  type: text('type', { enum: ['recharge', 'consume', 'refund', 'adjust'] }).notNull(),
  amount: integer('amount').notNull(), // 分，正数增加，负数减少
  balanceBefore: integer('balance_before'),
  balanceAfter: integer('balance_after'),
  remark: text('remark'),
  createdAt: integer('created_at').notNull(),
})

// 会员日使用记录
export const memberDayUsage = sqliteTable('member_day_usage', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  storeId: text('store_id').notNull().references(() => stores.id),
  date: text('date').notNull(), // YYYY-MM-DD
  usedCount: integer('used_count').notNull().default(1),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  unique: { columns: [table.customerId, table.storeId, table.date] },
}))

// 充值记录
export const rechargeRecords = sqliteTable('recharge_records', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  storeId: text('store_id').notNull().references(() => stores.id),
  amount: integer('amount').notNull(), // 充值金额（分）
  giftAmount: integer('gift_amount').default(0), // 赠送金额（分）
  beforeLevel: integer('before_level'),
  afterLevel: integer('after_level'),
  remark: text('remark'),
  createdAt: integer('created_at').notNull(),
})
