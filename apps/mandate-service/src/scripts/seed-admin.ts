/**
 * Seed script: creates default super_admin user
 * Usage: npx tsx src/scripts/seed-admin.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { query } from '../config/database';

async function seedAdmin() {
  const email = 'admin@agenticcommerce.com';
  const password = 'Balaji1@';
  const firstName = 'Super';
  const lastName = 'Admin';

  try {
    // Check if already exists
    const existing = await query('SELECT id FROM admin_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log(`Admin user ${email} already exists, skipping.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await query(
      `INSERT INTO admin_users (email, password_hash, first_name, last_name, role, status)
       VALUES ($1, $2, $3, $4, 'super_admin', 'active')`,
      [email, passwordHash, firstName, lastName]
    );

    console.log(`Created super_admin: ${email} / ${password}`);
  } catch (err) {
    console.error('Failed to seed admin user:', err);
    process.exit(1);
  }

  process.exit(0);
}

seedAdmin();
