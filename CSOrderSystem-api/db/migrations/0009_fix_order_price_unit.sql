-- 修复历史订单金额单位问题
-- 问题：部分订单的 finalPrice 被错误地存储为分（应该是元）
-- 策略：如果 finalPrice > 10000 且是整数，认为是分，需要转为元

-- 先查看当前数据情况（调试用，不实际修改）
-- SELECT id, order_no, originalPrice, totalOriginalAmount, discountAmount, finalPrice,
--        CASE 
--          WHEN finalPrice > 10000 AND finalPrice = CAST(finalPrice AS INTEGER) THEN '需要修复'
--          ELSE '正常'
--        END as status
-- FROM orders;

-- 修复 finalPrice：如果值大于 10000 且是整数，认为是分，转为元
UPDATE orders
SET finalPrice = finalPrice / 100.0
WHERE finalPrice > 10000 
  AND finalPrice = CAST(finalPrice AS INTEGER);

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

-- 修复 storeProfit 字段
UPDATE orders
SET storeProfit = storeProfit / 100
WHERE storeProfit > 10000;
