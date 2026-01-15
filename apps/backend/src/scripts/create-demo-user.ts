/**
 * Create Demo User for Testing
 * Creates a user with the ID used by all demo data
 * 
 * Usage: npx ts-node src/scripts/create-demo-user.ts
 */

import { pool } from '../config/database';
import { hashPassword } from '../utils/password';

const DEMO_USER_ID = 'cfd469c6-266e-4134-a5bc-b485dd583e1c';
const DEMO_EMAIL = 'demo@agenticcommerce.com';
const DEMO_PASSWORD = 'Demo123!';
const DEMO_FIRST_NAME = 'Demo';
const DEMO_LAST_NAME = 'User';

async function createDemoUser() {
  console.log('👤 Creating demo user...');
  console.log(`   Email: ${DEMO_EMAIL}`);
  console.log(`   Password: ${DEMO_PASSWORD}`);
  console.log(`   User ID: ${DEMO_USER_ID}\n`);

  try {
    // Check if user already exists
    const existing = await pool.query(
      'SELECT id, email FROM users WHERE id = $1 OR email = $2',
      [DEMO_USER_ID, DEMO_EMAIL]
    );

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (user.id === DEMO_USER_ID) {
        console.log('✅ Demo user already exists with the correct ID');
        console.log(`   Email: ${user.email}`);
        return;
      } else if (user.email === DEMO_EMAIL) {
        console.log('⚠️  User with this email already exists but with different ID');
        console.log(`   Existing ID: ${user.id}`);
        console.log(`   Expected ID: ${DEMO_USER_ID}`);
        console.log('\n   You can either:');
        console.log('   1. Delete the existing user and run this script again');
        console.log('   2. Update the existing user ID to match the demo user ID');
        return;
      }
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await hashPassword(DEMO_PASSWORD);

    // Create user with specific ID
    console.log('📝 Creating user...');
    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, created_at`,
      [DEMO_USER_ID, DEMO_EMAIL, passwordHash, DEMO_FIRST_NAME, DEMO_LAST_NAME]
    );

    const user = result.rows[0];
    console.log('\n✅ Demo user created successfully!');
    console.log('\n📋 User Details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Created: ${user.created_at}`);
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${DEMO_EMAIL}`);
    console.log(`   Password: ${DEMO_PASSWORD}`);
    console.log('\n💡 You can now login with these credentials to see all demo data!');

  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      console.error('❌ Error: User with this email or ID already exists');
      console.error('   Run this script again to check existing user');
    } else {
      console.error('❌ Error creating demo user:', error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  createDemoUser()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { createDemoUser };
