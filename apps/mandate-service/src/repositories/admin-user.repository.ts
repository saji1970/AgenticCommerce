import { query } from '../config/database';

export type AdminRole = 'super_admin' | 'merchant_admin' | 'merchant_operator';
export type AdminStatus = 'active' | 'suspended' | 'deactivated';

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  merchantId: string | null;
  status: AdminStatus;
  lastLoginAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAdminUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  merchantId?: string | null;
  createdBy?: string | null;
}

export interface UpdateAdminUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: AdminStatus;
  passwordHash?: string;
}

export interface AdminUserFilters {
  role?: AdminRole;
  merchantId?: string;
  status?: AdminStatus;
}

export class AdminUserRepository {
  async create(data: CreateAdminUserData): Promise<AdminUser> {
    const result = await query(
      `INSERT INTO admin_users (email, password_hash, first_name, last_name, role, merchant_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.email,
        data.passwordHash,
        data.firstName,
        data.lastName,
        data.role,
        data.merchantId || null,
        data.createdBy || null,
      ]
    );
    return this.mapRowToAdminUser(result.rows[0]);
  }

  async getById(id: string): Promise<AdminUser | null> {
    const result = await query('SELECT * FROM admin_users WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToAdminUser(result.rows[0]);
  }

  async getByEmail(email: string): Promise<AdminUser | null> {
    const result = await query('SELECT * FROM admin_users WHERE email = $1', [email]);
    if (result.rows.length === 0) return null;
    return this.mapRowToAdminUser(result.rows[0]);
  }

  async getAll(filters?: AdminUserFilters): Promise<AdminUser[]> {
    let queryText = 'SELECT * FROM admin_users WHERE 1=1';
    const params: any[] = [];

    if (filters?.role) {
      params.push(filters.role);
      queryText += ` AND role = $${params.length}`;
    }
    if (filters?.merchantId) {
      params.push(filters.merchantId);
      queryText += ` AND merchant_id = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      queryText += ` AND status = $${params.length}`;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    return result.rows.map(row => this.mapRowToAdminUser(row));
  }

  async update(id: string, data: UpdateAdminUserData): Promise<AdminUser> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.firstName !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(data.lastName);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.passwordHash !== undefined) {
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(data.passwordHash);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE admin_users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return this.mapRowToAdminUser(result.rows[0]);
  }

  async updateLastLogin(id: string): Promise<void> {
    await query('UPDATE admin_users SET last_login_at = NOW() WHERE id = $1', [id]);
  }

  async deactivate(id: string): Promise<AdminUser> {
    return this.update(id, { status: 'deactivated' });
  }

  private mapRowToAdminUser(row: any): AdminUser {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      merchantId: row.merchant_id,
      status: row.status,
      lastLoginAt: row.last_login_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
