import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const CreateAdminUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['super_admin', 'merchant_admin', 'merchant_operator']),
  merchantId: z.string().uuid().optional().nullable(),
});

export const UpdateAdminUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  status: z.enum(['active', 'suspended', 'deactivated']).optional(),
  password: z.string().min(6).optional(),
});
