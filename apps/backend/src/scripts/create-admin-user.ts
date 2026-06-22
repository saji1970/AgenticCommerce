/**
 * Create Admin User
 * Creates an admin user with email admin@agenticcommerce.com and password Balaji1@
 * 
 * Usage: npx ts-node src/scripts/create-admin-user.ts
 */

import { pool } from '../config/database';
import { hashPassword } from '../utils/password';

const ADMIN_EMAIL = 'admin@agenticcommerce.com';
const ADMIN_PASSWORD = 'Balaji1@';
const ADMIN_FIRST_NAME = 'Admin';
const ADMIN_LAST_NAME = 'User';

async function createAdminUser() {
  console.log('👤 Creating admin user...');
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role: admin\n`);

  try {
    // Check if admin user already exists
    const existing = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      
      // Update to admin role if not already
      if (user.role !== 'admin') {
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', user.id]);
        console.log('✅ Updated existing user to admin role');
      } else {
        console.log('✅ Admin user already exists');
      }
      
      console.log(`   User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: admin`);
      return;
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    // Create admin user
    console.log('📝 Creating admin user...');
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, role, created_at`,
      [ADMIN_EMAIL, passwordHash, ADMIN_FIRST_NAME, ADMIN_LAST_NAME, 'admin']
    );

    const user = result.rows[0];
    console.log('\n✅ Admin user created successfully!');
    console.log('\n📋 Admin User Details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.created_at}`);
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n💡 You can now login to the admin portal with these credentials!');

  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      console.error('❌ Error: User with this email already exists');
      console.error('   Run this script again to check existing user');
    } else {
      console.error('❌ Error creating admin user:', error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { createAdminUser };
