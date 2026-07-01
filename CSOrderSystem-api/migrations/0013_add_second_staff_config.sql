-- 添加第二客服提成配置字段到 stores 表
ALTER TABLE stores ADD COLUMN second_staff_name TEXT;
ALTER TABLE stores ADD COLUMN second_staff_commission_type TEXT;
ALTER TABLE stores ADD COLUMN second_staff_commission_value REAL;
