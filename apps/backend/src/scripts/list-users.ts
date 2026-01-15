/**
 * List All Users in Database
 * 
 * Usage: npx ts-node src/scripts/list-users.ts
 */

import { pool } from '../config/database';

async function listUsers() {
  console.log('👥 Listing all users in the database...\n');

  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, phone_number, created_at FROM users ORDER BY created_at DESC'
    );

    if (result.rows.length === 0) {
      console.log('❌ No users found in the database');
      return;
    }

    console.log(`✅ Found ${result.rows.length} user(s):\n`);

    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. User Details:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Phone: ${user.phone_number || 'N/A'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

    // Check for demo user
    const demoUserId = 'cfd469c6-266e-4134-a5bc-b485dd583e1c';
    const demoUser = result.rows.find(u => u.id === demoUserId);
    
    if (demoUser) {
      console.log('✅ Demo user found!');
      console.log(`   This user has access to all demo data (products, intents, mandates)`);
    } else {
      console.log('⚠️  Demo user NOT found');
      console.log(`   Expected ID: ${demoUserId}`);
      console.log('   Run: pnpm create:demo-user');
    }

  } catch (error) {
    console.error('❌ Error listing users:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  listUsers()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { listUsers };
