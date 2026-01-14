-- Clear all search queries from the database
-- This script deletes all search queries and related data

-- Note: Due to foreign key constraints:
-- - product_filters will be automatically deleted (ON DELETE CASCADE)
-- - ai_processing_logs will be automatically deleted (ON DELETE CASCADE)
-- - products.search_query_id will be set to NULL (ON DELETE SET NULL)

-- Delete all search queries
DELETE FROM search_queries;

-- Optional: Also delete products created from these queries
-- Uncomment the line below if you also want to delete all products
-- DELETE FROM products;
