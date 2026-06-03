-- 添加套餐基础价格字段
ALTER TABLE packages ADD COLUMN base_price REAL DEFAULT 0;

-- 更新已有数据
UPDATE packages SET base_price = 0 WHERE base_price IS NULL;
