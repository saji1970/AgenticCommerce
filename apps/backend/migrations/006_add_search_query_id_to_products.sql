-- Migration: Add search_query_id column to products table
-- This column links products to their search queries

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS search_query_id UUID 
REFERENCES search_queries(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_products_search_query_id ON products(search_query_id);

