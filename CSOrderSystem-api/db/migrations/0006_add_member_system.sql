-- 店铺会员配置表
CREATE TABLE IF NOT EXISTS store_member_configs (
  id TEXT PRIMARY KEY,
  storeId TEXT NOT NULL UNIQUE,
  levels TEXT NOT NULL, -- JSON: 会员等级数组
  memberDays TEXT NOT NULL, -- JSON: 会员日 [1, 2] 表示周一、周二
  minBalancePercent INTEGER DEFAULT 50, -- 会员日最低余额百分比
  enabled INTEGER DEFAULT 0, -- 是否启用会员系统
  createdAt INTEGER,
  updatedAt INTEGER
);

-- 顾客表增加余额字段
ALTER TABLE customers ADD COLUMN balance INTEGER DEFAULT 0; -- 余额（分）
ALTER TABLE customers ADD COLUMN totalRecharge INTEGER DEFAULT 0; -- 累计充值（用于判断等级）
ALTER TABLE customers ADD COLUMN memberLevel INTEGER DEFAULT 0; -- 当前等级 0-5

-- 余额流水表
CREATE TABLE IF NOT EXISTS balance_transactions (
  id TEXT PRIMARY KEY,
  customerId TEXT NOT NULL,
  orderId TEXT, -- 关联订单（消费时）
  type TEXT NOT NULL, -- 'recharge' | 'consume' | 'refund' | 'adjust'
  amount INTEGER NOT NULL, -- 变动金额（分），正数增加，负数减少
  balanceBefore INTEGER,
  balanceAfter INTEGER,
  remark TEXT,
  createdAt INTEGER
);

-- 会员日使用记录
CREATE TABLE IF NOT EXISTS member_day_usage (
  id TEXT PRIMARY KEY,
  customerId TEXT NOT NULL,
  storeId TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  usedCount INTEGER DEFAULT 1,
  createdAt INTEGER,
  UNIQUE(customerId, storeId, date)
);

-- 充值记录表
CREATE TABLE IF NOT EXISTS recharge_records (
  id TEXT PRIMARY KEY,
  customerId TEXT NOT NULL,
  storeId TEXT NOT NULL,
  amount INTEGER NOT NULL, -- 充值金额（分）
  giftAmount INTEGER DEFAULT 0, -- 赠送金额（分）
  beforeLevel INTEGER,
  afterLevel INTEGER,
  remark TEXT,
  createdAt INTEGER
);

-- 订单表增加折扣相关字段
ALTER TABLE orders ADD COLUMN hours INTEGER DEFAULT 1; -- 预约小时数
ALTER TABLE orders ADD COLUMN originalPrice INTEGER; -- 每小时原价（分）
ALTER TABLE orders ADD COLUMN totalOriginalAmount INTEGER; -- 原价总计（分）
ALTER TABLE orders ADD COLUMN discountType TEXT; -- 'memberDay' | 'memberRegular' | 'coupon' | 'none'
ALTER TABLE orders ADD COLUMN discountPercent INTEGER DEFAULT 100; -- 实际折扣率
ALTER TABLE orders ADD COLUMN discountAmount INTEGER DEFAULT 0; -- 优惠金额（分）
ALTER TABLE orders ADD COLUMN deductedBalance INTEGER DEFAULT 0; -- 实际扣除余额（分）
ALTER TABLE orders ADD COLUMN usedMemberDayBenefit INTEGER DEFAULT 0; -- 是否使用了会员日权益
ALTER TABLE orders ADD COLUMN girlIncome INTEGER; -- 妹妹提成（分）
ALTER TABLE orders ADD COLUMN serviceCommission INTEGER; -- 客服提成（分）
ALTER TABLE orders ADD COLUMN storeProfit INTEGER; -- 店家利润（分）
