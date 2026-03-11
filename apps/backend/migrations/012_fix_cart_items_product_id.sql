-- Migration 012: Remove FK constraint on cart_items.product_id
-- Products can come from external sources (Google Shopping, etc.) and don't
-- always exist in the local products table. Cart already stores denormalized
-- product data (name, image, price) so the FK is not needed.

-- Drop the foreign key constraint
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;

-- Change product_id from UUID to TEXT to accept external product IDs
ALTER TABLE cart_items ALTER COLUMN product_id TYPE TEXT USING product_id::TEXT;
