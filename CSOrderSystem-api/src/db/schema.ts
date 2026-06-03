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
  price: real('price').notNull(),
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
  customerAccountId: text('customer_account_id').notNull().references(() => customerAccounts.id),
  girlId: text('girl_id').notNull().references(() => girls.id),
  packageId: text('package_id').notNull().references(() => packages.id),
  appointmentTime: integer('appointment_time', { mode: 'timestamp' }),
  price: real('price').notNull(),
  status: text('status', { enum: ['pending', 'completed', 'cancelled'] }).notNull(),
  serviceStaffName: text('service_staff_name').notNull(),
  girlIncome: real('girl_income').notNull(),
  serviceCommission: real('service_commission').notNull(),
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
