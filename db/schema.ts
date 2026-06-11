import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// 店家
export const stores = sqliteTable('stores', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  serviceCommissionType: text('service_commission_type', { enum: ['percent', 'fixed'] }).notNull(),
  serviceCommissionValue: real('service_commission_value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

// 妹妹
export const girls = sqliteTable('girls', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  name: text('name').notNull(),
  status: text('status', { enum: ['active', 'rest', 'left'] }).notNull(),
  commissionType: text('commission_type', { enum: ['percent', 'fixed'] }).notNull(),
  commissionValue: real('commission_value').notNull(),
  excludeFromDiscount: integer('exclude_from_discount', { mode: 'boolean' }).notNull().default(false), // 不参与任何优惠
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

// 套餐
export const packages = sqliteTable('packages', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  code: text('code').notNull(),
  name: text('name').notNull(),
  status: text('status', { enum: ['active', 'inactive'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

// 妹妹套餐价格
export const girlPackagePrices = sqliteTable('girl_package_prices', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  girlId: text('girl_id').notNull().references(() => girls.id),
  packageId: text('package_id').notNull().references(() => packages.id),
  price: real('price').notNull(), // 常规价格
  dailyPrice: real('daily_price'), // 当日特价（可选，优先使用）
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

// 顾客
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  nickname: text('nickname'),
  remark: text('remark'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

// 顾客账号
export const customerAccounts = sqliteTable('customer_accounts', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  platform: text('platform', { enum: ['wechat', 'telegram'] }).notNull(),
  account: text('account').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

// 标签
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  name: text('name').notNull(),
  color: text('color'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
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
  appointmentTime: integer('appointment_time', { mode: 'timestamp' }),
  hours: integer('hours').notNull().default(1),
  price: real('price').notNull(),
  discount: real('discount').default(0),
  finalPrice: real('final_price').notNull(),
  originalPrice: integer('original_price'),
  totalOriginalAmount: integer('total_original_amount'),
  discountType: text('discount_type'),
  discountPercent: integer('discount_percent'),
  discountAmount: integer('discount_amount'),
  deductedBalance: integer('deducted_balance'),
  usedMemberDayBenefit: integer('used_member_day_benefit', { mode: 'boolean' }).notNull().default(false),
  status: text('status', { enum: ['pending', 'completed', 'cancelled'] }).notNull(),
  serviceStaffName: text('service_staff_name').notNull(),
  girlIncome: real('girl_income').notNull(),
  serviceCommission: real('service_commission').notNull(),
  storeProfit: integer('store_profit'),
  couponSource: text('coupon_source'),
  remark: text('remark'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

// 会员配置
export const memberConfigs = sqliteTable('member_configs', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id).unique(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  priceMarkup: real('price_markup').notNull().default(0), // 会员优惠前提价（元）
  minBalancePercent: integer('min_balance_percent').notNull().default(50), // 最低余额比例
  memberDays: text('member_days').notNull().default('1,2'), // 会员日，逗号分隔
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

// 会员等级
export const memberLevels = sqliteTable('member_levels', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  level: integer('level').notNull(), // 等级 1-5
  name: text('name').notNull(), // 等级名称
  minRecharge: integer('min_recharge').notNull(), // 最低充值金额（分）
  regularDiscount: integer('regular_discount').notNull(), // 常规折扣（如95表示95折）
  memberDayDiscount: integer('member_day_discount').notNull(), // 会员日折扣
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})