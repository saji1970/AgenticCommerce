import { Request, Response } from 'express';
import { AdminUserService } from '../services/admin-user.service';

const adminUserService = new AdminUserService();

export const adminAuthController = {
  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const result = await adminUserService.authenticate(email, password);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      const status = message === 'Invalid credentials' ? 401 : 403;
      res.status(status).json({ error: message });
    }
  },

  me: async (req: Request, res: Response) => {
    try {
      const user = await adminUserService.getMe(req.adminCaller!.userId);
      res.json({ user });
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'User not found' });
    }
  },
};
