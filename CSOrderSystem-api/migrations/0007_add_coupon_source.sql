-- 添加优惠券来源字段到订单表
ALTER TABLE orders ADD COLUMN coupon_source TEXT;
