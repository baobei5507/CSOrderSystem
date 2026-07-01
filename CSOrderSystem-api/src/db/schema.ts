import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// 店家
export const stores = sqliteTable('stores', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  serviceCommissionType: text('service_commission_type', { enum: ['percent', 'fixed'] }).notNull(),
  serviceCommissionValue: real('service_commission_value').notNull(),
  // 第二客服提成配置
  secondStaffName: text('second_staff_name'),
  secondStaffCommissionType: text('second_staff_commission_type', { enum: ['percent', 'fixed'] }),
  secondStaffCommissionValue: real('second_staff_commission_value'),
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
  excludeFromDiscount: integer('exclude_from_discount', { mode: 'boolean' }).notNull().default(false),
  trialPrice: real('trial_price'), // 试钟价格（一口价，不参与优惠）
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
  dailyPrice: real('daily_price'), // 当日特价
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
  discountType: text('discount_type', { enum: ['memberDay', 'memberRegular', 'coupon', 'freeOrder', 'trial', 'none'] }), // 折扣类型
  discountPercent: integer('discount_percent'), // 实际折扣率
  discountAmount: integer('discount_amount'), // 优惠金额（分）
  deductedBalance: integer('deducted_balance'), // 实际扣除余额（元，注意与其他integer字段存分不同）
  usedMemberDayBenefit: integer('used_member_day_benefit', { mode: 'boolean' }).notNull().default(false), // 是否使用了会员日权益
  storeProfit: integer('store_profit'), // 店家利润（分）
  actualMinutes: integer('actual_minutes'), // 实际服务时长（分钟），null表示按预约时长完成
  couponSource: text('coupon_source'), // 优惠券来源（如TG群组）
  remark: text('remark'),
  orderSource: text('order_source').default('my'), // 订单来源: 'my'=我的预约, 'otherStaff'=其他客服预约(有提成), 'other'=其他人预约(无提成)
  otherStaffName: text('other_staff_name'), // 其他客服名称（orderSource=other时填写）
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

// 店铺会员配置 (与迁移脚本保持一致，使用 member_configs 表名)
export const storeMemberConfigs = sqliteTable('member_configs', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id).unique(),
  memberDays: text('member_days').notNull().default('1,2'), // 会员日，逗号分隔
  minBalancePercent: integer('min_balance_percent').notNull().default(50),
  priceMarkup: real('price_markup').notNull().default(0), // 会员优惠前提价
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

// 会员等级表
export const memberLevels = sqliteTable('member_levels', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => stores.id),
  level: integer('level').notNull(), // 等级 1-5
  name: text('name').notNull(), // 等级名称
  minRecharge: integer('min_recharge').notNull(), // 最低充值金额（分）
  regularDiscount: integer('regular_discount').notNull(), // 常规折扣
  memberDayDiscount: integer('member_day_discount').notNull(), // 会员日折扣
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

// 用户表（登录认证）
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  storeId: text('store_id').references(() => stores.id),
  role: text('role', { enum: ['admin', 'staff'] }).notNull().default('admin'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})
