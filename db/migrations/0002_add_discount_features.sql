-- Migration: 添加优惠相关功能
-- 1. 添加妹妹不参与优惠字段
-- 2. 添加当日价格字段
-- 3. 添加会员配置表和会员等级表

-- 添加妹妹不参与优惠字段
ALTER TABLE girls ADD COLUMN exclude_from_discount INTEGER DEFAULT 0;

-- 添加妹妹套餐价格当日价格字段
ALTER TABLE girl_package_prices ADD COLUMN daily_price REAL;

-- 创建会员配置表
CREATE TABLE member_configs (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES stores(id),
    enabled INTEGER DEFAULT 0,
    price_markup REAL DEFAULT 0,
    min_balance_percent INTEGER DEFAULT 50,
    member_days TEXT DEFAULT '1,2',
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
    updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
);

-- 创建会员等级表
CREATE TABLE member_levels (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES stores(id),
    level INTEGER NOT NULL,
    name TEXT NOT NULL,
    min_recharge INTEGER NOT NULL,
    regular_discount INTEGER NOT NULL,
    member_day_discount INTEGER NOT NULL,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
    updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
);

-- 创建唯一索引
CREATE UNIQUE INDEX idx_member_configs_store_id ON member_configs(store_id);
CREATE UNIQUE INDEX idx_member_levels_store_level ON member_levels(store_id, level);
