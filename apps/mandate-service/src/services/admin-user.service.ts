import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AdminUserRepository, AdminUser, AdminRole, CreateAdminUserData, UpdateAdminUserData, AdminUserFilters } from '../repositories/admin-user.repository';
import { query } from '../config/database';

export interface AdminCaller {
  userId: string;
  email: string;
  adminRole: AdminRole;
  merchantId: string | null;
}

export class AdminUserService {
  private repo = new AdminUserRepository();

  async authenticate(email: string, password: string): Promise<{ token: string; user: any }> {
    const adminUser = await this.repo.getByEmail(email);
    if (!adminUser) {
      throw new Error('Invalid credentials');
    }

    if (adminUser.status !== 'active') {
      throw new Error('Account is ' + adminUser.status);
    }

    const valid = await bcrypt.compare(password, adminUser.passwordHash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    await this.repo.updateLastLogin(adminUser.id);

    // Resolve merchant name if applicable
    let merchantName: string | null = null;
    if (adminUser.merchantId) {
      const result = await query('SELECT name FROM merchants WHERE id = $1', [adminUser.merchantId]);
      if (result.rows.length > 0) {
        merchantName = result.rows[0].name;
      }
    }

    const token = jwt.sign(
      {
        userId: adminUser.id,
        email: adminUser.email,
        adminRole: adminUser.role,
        merchantId: adminUser.merchantId,
      },
      config.jwt.secret as jwt.Secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    return {
      token,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        role: adminUser.role,
        merchantId: adminUser.merchantId,
        merchantName,
      },
    };
  }

  async getMe(userId: string): Promise<any> {
    const adminUser = await this.repo.getById(userId);
    if (!adminUser) throw new Error('User not found');

    let merchantName: string | null = null;
    if (adminUser.merchantId) {
      const result = await query('SELECT name FROM merchants WHERE id = $1', [adminUser.merchantId]);
      if (result.rows.length > 0) {
        merchantName = result.rows[0].name;
      }
    }

    return {
      id: adminUser.id,
      email: adminUser.email,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      role: adminUser.role,
      merchantId: adminUser.merchantId,
      merchantName,
    };
  }

  async createUser(actor: AdminCaller, data: { email: string; password: string; firstName: string; lastName: string; role: AdminRole; merchantId?: string | null }): Promise<AdminUser> {
    // Enforce creation rules
    if (actor.adminRole === 'super_admin') {
      // super_admin can create any role
      if (data.role !== 'super_admin' && !data.merchantId) {
        throw new Error('merchantId is required for merchant_admin and merchant_operator roles');
      }
    } else if (actor.adminRole === 'merchant_admin') {
      // merchant_admin can only create operator for their own merchant
      if (data.role !== 'merchant_operator') {
        throw new Error('Merchant admins can only create merchant_operator users');
      }
      data.merchantId = actor.merchantId!;
    } else {
      throw new Error('You do not have permission to create users');
    }

    // Check email uniqueness
    const existing = await this.repo.getByEmail(data.email);
    if (existing) {
      throw new Error('Email already in use');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.repo.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      merchantId: data.role === 'super_admin' ? null : data.merchantId,
      createdBy: actor.userId,
    });
  }

  async listUsers(actor: AdminCaller, filters?: AdminUserFilters): Promise<AdminUser[]> {
    if (actor.adminRole === 'super_admin') {
      return this.repo.getAll(filters);
    }

    if (actor.adminRole === 'merchant_admin') {
      // Only see users for own merchant
      return this.repo.getAll({
        ...filters,
        merchantId: actor.merchantId!,
      });
    }

    throw new Error('You do not have permission to list users');
  }

  async getUser(actor: AdminCaller, userId: string): Promise<AdminUser> {
    const user = await this.repo.getById(userId);
    if (!user) throw new Error('User not found');

    // Scope check
    if (actor.adminRole !== 'super_admin' && user.merchantId !== actor.merchantId) {
      throw new Error('Access denied');
    }

    return user;
  }

  async updateUser(actor: AdminCaller, userId: string, data: { firstName?: string; lastName?: string; email?: string; status?: string; password?: string }): Promise<AdminUser> {
    const user = await this.repo.getById(userId);
    if (!user) throw new Error('User not found');

    // Scope check
    if (actor.adminRole !== 'super_admin' && user.merchantId !== actor.merchantId) {
      throw new Error('Access denied');
    }

    // merchant_admin can't modify other merchant_admins
    if (actor.adminRole === 'merchant_admin' && user.role === 'merchant_admin' && user.id !== actor.userId) {
      throw new Error('Cannot modify another merchant admin');
    }

    const updateData: UpdateAdminUserData = {};
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.email) updateData.email = data.email;
    if (data.status) updateData.status = data.status as any;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);

    return this.repo.update(userId, updateData);
  }

  async deactivateUser(actor: AdminCaller, userId: string): Promise<AdminUser> {
    const user = await this.repo.getById(userId);
    if (!user) throw new Error('User not found');

    // Can't deactivate yourself
    if (user.id === actor.userId) {
      throw new Error('Cannot deactivate your own account');
    }

    // Scope check
    if (actor.adminRole !== 'super_admin' && user.merchantId !== actor.merchantId) {
      throw new Error('Access denied');
    }

    return this.repo.deactivate(userId);
  }
}
