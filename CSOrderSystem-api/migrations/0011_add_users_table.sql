-- 创建用户表（用于登录认证）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, -- PBKDF2 hashed password
  salt TEXT NOT NULL, -- 密码盐值
  store_id TEXT REFERENCES stores(id), -- 关联店铺（可选，管理员可不关联）
  role TEXT NOT NULL DEFAULT 'admin', -- 角色: admin / staff
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 插入默认管理员账号（密码在首次部署后通过API修改）
-- 默认密码: admin123，会在代码中通过 PBKDF2 生成hash