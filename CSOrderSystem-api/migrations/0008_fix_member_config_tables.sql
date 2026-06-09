-- 修复会员配置表结构不一致问题
-- 删除旧表（如果存在）
DROP TABLE IF EXISTS store_member_configs;

-- 创建正确的会员配置表
CREATE TABLE IF NOT EXISTS member_configs (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL UNIQUE,
  member_days TEXT NOT NULL DEFAULT '1,2', -- 逗号分隔的会员日，如 '1,2' 表示周一、周二
  min_balance_percent INTEGER NOT NULL DEFAULT 50,
  price_markup REAL NOT NULL DEFAULT 0, -- 会员优惠前提价
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 创建会员等级表（独立的表，而非JSON字段）
CREATE TABLE IF NOT EXISTS member_levels (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  level INTEGER NOT NULL, -- 等级 1-5
  name TEXT NOT NULL, -- 等级名称
  min_recharge INTEGER NOT NULL, -- 最低充值金额（分）
  regular_discount INTEGER NOT NULL, -- 常规折扣
  member_day_discount INTEGER NOT NULL, -- 会员日折扣
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_member_configs_store ON member_configs(store_id);
CREATE INDEX IF NOT EXISTS idx_member_levels_store ON member_levels(store_id);
