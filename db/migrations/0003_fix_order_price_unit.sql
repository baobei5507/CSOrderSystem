-- 修复历史订单金额单位问题
-- 问题：部分订单的 final_price 被错误地存储为分（应该是元）
-- 策略：如果 final_price > 10000 且是整数，认为是分，需要转为元

-- 修复 final_price：如果值大于 10000 且是整数，认为是分，转为元
UPDATE orders
SET final_price = final_price / 100.0
WHERE final_price > 10000 
  AND final_price = CAST(final_price AS INTEGER);

-- 修复 price 字段（兼容旧字段）
UPDATE orders
SET price = price / 100.0
WHERE price > 10000 
  AND price = CAST(price AS INTEGER);

-- 修复 discount 字段（兼容旧字段）
UPDATE orders
SET discount = discount / 100.0
WHERE discount > 10000 
  AND discount = CAST(discount AS INTEGER);

-- 修复 store_profit 字段
UPDATE orders
SET store_profit = store_profit / 100
WHERE store_profit > 10000;
