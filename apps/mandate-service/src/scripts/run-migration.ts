import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from '../config/database';

async function runMigration(filename: string) {
  try {
    const migrationPath = join(__dirname, '../../migrations', filename);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log(`Running migration: ${filename}`);
    await query(migrationSQL);
    console.log(`✅ Migration ${filename} completed successfully`);
  } catch (error) {
    console.error(`❌ Error running migration ${filename}:`, error);
    process.exit(1);
  }
}

const filename = process.argv[2];
if (!filename) {
  console.error('Usage: tsx src/scripts/run-migration.ts <migration-filename>');
  process.exit(1);
}

runMigration(filename);
