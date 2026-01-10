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

    // Get already executed migrations
    const executedResult = await pool.query(
      'SELECT filename FROM schema_migrations ORDER BY filename'
    );
    let executedMigrations = new Set(executedResult.rows.map(r => r.filename));

    // Safety check: Verify all core tables exist
    const requiredTables = ['users', 'products', 'cart_items', 'agent_mandates'];
    const missingTables: string[] = [];

    for (const table of requiredTables) {
      try {
        await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
      } catch (error) {
        missingTables.push(table);
      }
    }

    // If migrations are recorded but tables are missing, reset
    if (executedMigrations.size > 0 && missingTables.length > 0) {
      console.log(`⚠️  Migration tracking out of sync! Missing tables: ${missingTables.join(', ')}`);
      console.log('🔄 Clearing migration history to re-run all migrations...');
      await pool.query('DELETE FROM schema_migrations');
      executedMigrations = new Set();
    } else if (missingTables.length === 0 && executedMigrations.size > 0) {
      console.log('✅ Migration tracking verified - all core tables exist');
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
