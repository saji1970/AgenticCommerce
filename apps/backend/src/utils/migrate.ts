import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

interface Migration {
  filename: string;
  sql: string;
}

export async function runMigrations(pool: Pool): Promise<void> {
  console.log('🔄 Starting database migrations...');

  try {
    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create update_updated_at_column function if it doesn't exist
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../../migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  No migrations directory found, skipping migrations');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort to ensure order

    if (files.length === 0) {
      console.log('ℹ️  No migration files found');
      return;
    }

    // Check if database tables actually exist
    const tablesExist = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'products', 'cart_items', 'mandates')
    `);

    const hasCoreTables = parseInt(tablesExist.rows[0].count) >= 3;

    // Get already executed migrations
    const executedResult = await pool.query(
      'SELECT filename FROM schema_migrations ORDER BY filename'
    );
    const executedMigrations = new Set(executedResult.rows.map(r => r.filename));

    // If we have migration records but no actual tables, reset migration tracking
    if (executedMigrations.size > 0 && !hasCoreTables) {
      console.log('⚠️  Migration tracking out of sync - resetting...');
      await pool.query('DELETE FROM schema_migrations');
      executedMigrations.clear();
    }

    // Read and prepare migrations
    const migrations: Migration[] = files
      .filter(f => !executedMigrations.has(f))
      .map(filename => ({
        filename,
        sql: fs.readFileSync(path.join(migrationsDir, filename), 'utf-8'),
      }));

    if (migrations.length === 0) {
      console.log('✅ All migrations already applied');
      return;
    }

    console.log(`📝 Found ${migrations.length} new migration(s) to apply`);

    // Execute each migration in a transaction
    for (const migration of migrations) {
      console.log(`   → Running: ${migration.filename}`);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Execute the migration SQL
        await client.query(migration.sql);

        // Record that this migration was executed
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [migration.filename]
        );

        await client.query('COMMIT');
        console.log(`   ✓ Completed: ${migration.filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`   ✗ Failed: ${migration.filename}`);
        throw error;
      } finally {
        client.release();
      }
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
