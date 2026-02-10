import { Request, Response } from 'express';
import { AdminUserService } from '../services/admin-user.service';

const adminUserService = new AdminUserService();

export const adminUserController = {
  create: async (req: Request, res: Response) => {
    try {
      const user = await adminUserService.createUser(req.adminCaller!, req.body);
      res.status(201).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          merchantId: user.merchantId,
          status: user.status,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create user';
      res.status(400).json({ error: message });
    }
  },

  list: async (req: Request, res: Response) => {
    try {
      const { role, merchantId, status } = req.query;
      const users = await adminUserService.listUsers(req.adminCaller!, {
        role: role as any,
        merchantId: merchantId as string,
        status: status as any,
      });

      res.json({
        success: true,
        data: users.map(u => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          merchantId: u.merchantId,
          status: u.status,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list users';
      res.status(403).json({ error: message });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const user = await adminUserService.getUser(req.adminCaller!, req.params.id);
      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          merchantId: user.merchantId,
          status: user.status,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'User not found';
      const status = message === 'Access denied' ? 403 : 404;
      res.status(status).json({ error: message });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const user = await adminUserService.updateUser(req.adminCaller!, req.params.id, req.body);
      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          merchantId: user.merchantId,
          status: user.status,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user';
      res.status(400).json({ error: message });
    }
  },

  deactivate: async (req: Request, res: Response) => {
    try {
      const user = await adminUserService.deactivateUser(req.adminCaller!, req.params.id);
      res.json({
        success: true,
        data: {
          id: user.id,
          status: user.status,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deactivate user';
      res.status(400).json({ error: message });
    }
  },
};
