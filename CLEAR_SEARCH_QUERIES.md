# Clear All Search Queries from Database

This guide shows how to remove all past search queries from the database.

## Method 1: Using SQL Script (Recommended for Railway)

### Steps:

1. **Connect to Railway Database:**
   
   **Option A: Railway Dashboard**
   - Go to Railway dashboard
   - Open your PostgreSQL service
   - Click on "Query" or "SQL Editor"
   
   **Option B: Railway CLI**
   ```bash
   railway link
   railway connect postgres
   ```
   
   **Option C: Direct psql connection**
   ```bash
   psql $DATABASE_URL
   ```

2. **Run the SQL:**
   ```sql
   DELETE FROM search_queries;
   ```

   This will:
   - Delete all search queries
   - Automatically delete related `product_filters` (ON DELETE CASCADE)
   - Automatically delete related `ai_processing_logs` (ON DELETE CASCADE)
   - Set `search_query_id` to NULL in `products` (ON DELETE SET NULL)

3. **Verify deletion:**
   ```sql
   SELECT COUNT(*) FROM search_queries;
   -- Should return: 0
   ```

### Delete Products Too (Optional)

If you also want to delete all products that were created from these queries:

```sql
DELETE FROM products;
DELETE FROM search_queries;
```

Or in a transaction:
```sql
BEGIN;
DELETE FROM products;
DELETE FROM search_queries;
COMMIT;
```

## Method 2: Using TypeScript Script (Local Development)

If running locally:

```bash
cd apps/backend
npx ts-node src/scripts/clear-search-history.ts
```

Note: The script file needs to be moved to `src/scripts/` directory first.

## Quick SQL Command

**Delete all search queries (keeps products):**
```sql
DELETE FROM search_queries;
```

**Delete everything (queries + products + filters + logs):**
```sql
BEGIN;
DELETE FROM products;
DELETE FROM product_filters;
DELETE FROM ai_processing_logs;
DELETE FROM search_queries;
COMMIT;
```

## Important Notes

- **Products are NOT deleted** by default (foreign key is `ON DELETE SET NULL`)
- **Product filters ARE deleted** automatically (foreign key is `ON DELETE CASCADE`)
- **AI processing logs ARE deleted** automatically (foreign key is `ON DELETE CASCADE`)
- This operation **cannot be undone** - make sure you want to delete all queries
- Consider backing up the database first if you need to keep the data

## Verification Queries

After deletion, verify:

```sql
-- Check search queries count
SELECT COUNT(*) FROM search_queries;

-- Check products (should still exist, but search_query_id will be NULL)
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM products WHERE search_query_id IS NULL;

-- Check product filters (should be 0)
SELECT COUNT(*) FROM product_filters;

-- Check AI processing logs (should be 0)
SELECT COUNT(*) FROM ai_processing_logs;
```

