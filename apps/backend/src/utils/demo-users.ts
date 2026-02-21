/**
 * Demo Users Configuration
 * Users in this list will use sample data instead of real API calls
 */

import { pool } from '../config/database';

export const DEMO_USER_EMAILS = [
  'alice@example.com',
  'bob@example.com',
  'carol@example.com',
];

// User IDs that have demo seed data (from seed-demo-search-data.ts)
export const DEMO_USER_IDS = [
  'cfd469c6-266e-4134-a5bc-b485dd583e1c',
];

/**
 * Check if a user is a demo user by email
 */
export async function isDemoUserByEmail(email: string): Promise<boolean> {
  return DEMO_USER_EMAILS.includes(email.toLowerCase());
}

/**
 * Check if a user is a demo user by user ID
 */
export async function isDemoUserById(userId: string): Promise<boolean> {
  // Check by user ID first (for users with seeded demo data)
  if (DEMO_USER_IDS.includes(userId)) {
    return true;
  }

  try {
    const result = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const email = result.rows[0].email;
    return DEMO_USER_EMAILS.includes(email.toLowerCase());
  } catch (error) {
    console.error('Error checking if user is demo user:', error);
    return false;
  }
}
