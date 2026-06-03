-- 店家表
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  service_commission_type TEXT NOT NULL CHECK (service_commission_type IN ('percent', 'fixed')),
  service_commission_value REAL NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 妹妹表
CREATE TABLE IF NOT EXISTS girls (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'rest', 'left')),
  commission_type TEXT NOT NULL CHECK (commission_type IN ('percent', 'fixed')),
  commission_value REAL NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- 套餐表
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- 妹妹套餐价格表
CREATE TABLE IF NOT EXISTS girl_package_prices (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  girl_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  price REAL NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (girl_id) REFERENCES girls(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
  UNIQUE(girl_id, package_id)
);

-- 顾客表
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  nickname TEXT,
  remark TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- 顾客账号表
CREATE TABLE IF NOT EXISTS customer_accounts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('wechat', 'telegram')),
  account TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- 顾客标签关联表
CREATE TABLE IF NOT EXISTS customer_tags (
  customer_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (customer_id, tag_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  store_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_account_id TEXT NOT NULL,
  girl_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  appointment_time INTEGER,
  price REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
  service_staff_name TEXT NOT NULL,
  girl_income REAL NOT NULL,
  service_commission REAL NOT NULL,
  remark TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (girl_id) REFERENCES girls(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

-- 订单快照表
CREATE TABLE IF NOT EXISTS order_snapshots (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  customer_name_snapshot TEXT,
  customer_account_snapshot TEXT,
  girl_name_snapshot TEXT,
  package_name_snapshot TEXT,
  price_snapshot REAL NOT NULL,
  girl_commission_type_snapshot TEXT NOT NULL,
  girl_commission_value_snapshot REAL NOT NULL,
  service_commission_type_snapshot TEXT NOT NULL,
  service_commission_value_snapshot REAL NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_girls_store ON girls(store_id);
CREATE INDEX IF NOT EXISTS idx_packages_store ON packages(store_id);
CREATE INDEX IF NOT EXISTS idx_girl_prices_store ON girl_package_prices(store_id);
CREATE INDEX IF NOT EXISTS idx_girl_prices_girl ON girl_package_prices(girl_id);
CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer ON customer_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_tags_store ON tags(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_girl ON orders(girl_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_snapshots_order ON order_snapshots(order_id);