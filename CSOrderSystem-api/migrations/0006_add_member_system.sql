-- 店铺会员配置表
CREATE TABLE IF NOT EXISTS store_member_configs (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  levels TEXT NOT NULL, -- JSON array
  member_days TEXT NOT NULL, -- JSON array [1,2] 表示周一、周二
  min_balance_percent INTEGER DEFAULT 50,
  enabled INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 余额流水表
CREATE TABLE IF NOT EXISTS balance_transactions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  order_id TEXT,
  type TEXT NOT NULL, -- 'recharge', 'consume', 'refund'
  amount INTEGER NOT NULL, -- 变动金额（分），负数表示消费
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  remark TEXT,
  created_at INTEGER NOT NULL
);

-- 会员日使用记录表
CREATE TABLE IF NOT EXISTS member_day_usage (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  used_count INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- 充值记录表
CREATE TABLE IF NOT EXISTS recharge_records (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  amount INTEGER NOT NULL, -- 充值金额（分）
  gift_amount INTEGER DEFAULT 0, -- 赠送金额（分）
  before_level INTEGER DEFAULT 0,
  after_level INTEGER DEFAULT 0,
  remark TEXT,
  created_at INTEGER NOT NULL
);

-- 顾客表添加余额和会员相关字段
ALTER TABLE customers ADD COLUMN balance INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN total_recharge INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN member_level INTEGER DEFAULT 0;

-- 订单表添加会员折扣相关字段
ALTER TABLE orders ADD COLUMN hours INTEGER DEFAULT 1;
ALTER TABLE orders ADD COLUMN original_price INTEGER; -- 每小时原价
ALTER TABLE orders ADD COLUMN total_original_amount INTEGER; -- 原价总计
ALTER TABLE orders ADD COLUMN discount_type TEXT; -- 'memberDay', 'memberRegular', 'coupon', 'none'
ALTER TABLE orders ADD COLUMN discount_percent INTEGER; -- 实际折扣率
ALTER TABLE orders ADD COLUMN discount_amount INTEGER; -- 优惠金额
ALTER TABLE orders ADD COLUMN deducted_balance INTEGER; -- 实际扣除余额
ALTER TABLE orders ADD COLUMN used_member_day_benefit INTEGER DEFAULT 0; -- 是否使用了会员日权益
ALTER TABLE orders ADD COLUMN store_profit INTEGER; -- 店家利润

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_balance_transactions_customer ON balance_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_order ON balance_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_member_day_usage_customer ON member_day_usage(customer_id, store_id, date);
CREATE INDEX IF NOT EXISTS idx_recharge_records_customer ON recharge_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_member_configs_store ON store_member_configs(store_id);
