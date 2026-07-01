-- 添加订单来源字段，区分"我的预约"和"其他客服预约"
ALTER TABLE orders ADD COLUMN order_source TEXT DEFAULT 'my';
ALTER TABLE orders ADD COLUMN other_staff_name TEXT DEFAULT NULL;
