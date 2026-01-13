import { pool } from '../config/database';

async function migrate() {
  try {
    console.log('Running migration: Add search_query_id to products table...');

    await pool.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS search_query_id UUID
      REFERENCES search_queries(id) ON DELETE SET NULL;
    `);

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
