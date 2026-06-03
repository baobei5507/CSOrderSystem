-- Migration: Add discount fields to orders table
-- Created at: 2026-06-03

ALTER TABLE orders ADD COLUMN discount REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN final_price REAL DEFAULT price;

-- Update existing orders to set final_price equal to price
UPDATE orders SET final_price = price WHERE final_price IS NULL;
