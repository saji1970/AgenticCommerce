import { User, CreateUserDTO, UpdateUserDTO } from '@agentic-commerce/shared-types';
import { query } from '../config/database';
import { hashPassword } from '../utils/password';

export class UserRepository {
  async create(userData: CreateUserDTO): Promise<User> {
    const passwordHash = await hashPassword(userData.password);

    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, phone_number, created_at, updated_at`,
      [userData.email, passwordHash, userData.firstName, userData.lastName, userData.phoneNumber]
    );

    return this.mapToUser(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    return result.rows.length > 0 ? this.mapToUser(result.rows[0]) : null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await query(
      'SELECT id, email, first_name, last_name, phone_number, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 ? this.mapToUser(result.rows[0]) : null;
  }

  async update(id: string, userData: UpdateUserDTO): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (userData.firstName !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(userData.firstName);
    }
    if (userData.lastName !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(userData.lastName);
    }
    if (userData.phoneNumber !== undefined) {
      updates.push(`phone_number = $${paramCount++}`);
      values.push(userData.phoneNumber);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, email, first_name, last_name, phone_number, created_at, updated_at`,
      values
    );

    return result.rows.length > 0 ? this.mapToUser(result.rows[0]) : null;
  }

  async getPasswordHash(email: string): Promise<string | null> {
    const result = await query(
      'SELECT password_hash FROM users WHERE email = $1',
      [email]
    );

    return result.rows.length > 0 ? result.rows[0].password_hash : null;
  }

  private mapToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phoneNumber: row.phone_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
