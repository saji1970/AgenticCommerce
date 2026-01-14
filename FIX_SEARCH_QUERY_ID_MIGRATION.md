# Fix: Missing search_query_id Column in products Table

## Problem

The error shows:
```
Error: error: column "search_query_id" of relation "products" does not exist
```

The code is trying to insert/update the `search_query_id` column in the `products` table, but this column doesn't exist in the database schema.

## Solution

You need to run a migration to add the `search_query_id` column to the `products` table.

### Migration File Created

I've created: `apps/backend/migrations/006_add_search_query_id_to_products.sql`

### How to Run the Migration

#### Option 1: Run SQL Directly on Railway Database

1. **Get Railway Database Connection String:**
   - Go to your Railway project dashboard
   - Open your PostgreSQL service
   - Copy the connection string or get the database URL

2. **Connect to Railway Database:**
   
   **Using Railway CLI:**
   ```bash
   railway link
   railway connect postgres
   ```
   
   **Or using psql directly:**
   ```bash
   psql $DATABASE_URL
   ```

3. **Run the Migration:**
   ```sql
   ALTER TABLE products 
   ADD COLUMN IF NOT EXISTS search_query_id UUID 
   REFERENCES search_queries(id) ON DELETE SET NULL;
   
   CREATE INDEX IF NOT EXISTS idx_products_search_query_id ON products(search_query_id);
   ```

#### Option 2: Use Railway SQL Editor

1. Go to Railway dashboard
2. Open your PostgreSQL service
3. Click on "Query" or "SQL Editor"
4. Paste and run:
   ```sql
   ALTER TABLE products 
   ADD COLUMN IF NOT EXISTS search_query_id UUID 
   REFERENCES search_queries(id) ON DELETE SET NULL;
   
   CREATE INDEX IF NOT EXISTS idx_products_search_query_id ON products(search_query_id);
   ```

#### Option 3: Run Migration Script (If Available)

If you have a migration system set up, you can run:
```bash
cd apps/backend
# If you have a migration runner
psql $DATABASE_URL -f migrations/006_add_search_query_id_to_products.sql
```

## Verify Migration

After running the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'search_query_id';

-- Should return:
-- column_name     | data_type
-- search_query_id | uuid
```

## Quick Fix SQL

Run this SQL on your Railway database:

```sql
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS search_query_id UUID 
REFERENCES search_queries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_search_query_id ON products(search_query_id);
```

## After Migration

Once the migration is run, the search functionality should work correctly. The error will be resolved and products can be saved with their associated search query IDs.

