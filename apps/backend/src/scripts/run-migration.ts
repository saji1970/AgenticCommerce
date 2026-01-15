/**
 * Run a specific migration file
 * Usage: npx ts-node src/scripts/run-migration.ts 007_add_role_to_users.sql
 */

import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

async function runMigration(migrationFile: string) {
  const migrationPath = path.join(__dirname, '../../migrations', migrationFile);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log(`📝 Running migration: ${migrationFile}`);
  
  try {
    await pool.query(sql);
    console.log(`✅ Migration completed successfully: ${migrationFile}`);
  } catch (error: any) {
    if (error.code === '42710' || error.message.includes('already exists')) {
      console.log(`⚠️  Migration already applied (or column already exists): ${migrationFile}`);
    } else {
      console.error(`❌ Error running migration:`, error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: npx ts-node src/scripts/run-migration.ts <migration-file>');
  process.exit(1);
}

runMigration(migrationFile)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
