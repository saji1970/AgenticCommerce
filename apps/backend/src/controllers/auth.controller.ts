import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginCredentials, RegisterData } from '@agentic-commerce/shared-types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: RegisterData = req.body;
      const result = await this.authService.register(data);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const credentials: LoginCredentials = req.body;
      const result = await this.authService.login(credentials);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.authService.forgotPassword(req.body.email);

      res.status(200).json({
        success: true,
        data: { message: 'If an account with that email exists, a password reset link has been sent.' },
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;
      await this.authService.resetPassword(token, password);

      res.status(200).json({
        success: true,
        data: { message: 'Password has been reset successfully. You can now log in.' },
      });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const { currentPassword, newPassword } = req.body;
      await this.authService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        data: { message: 'Password changed successfully.' },
      });
    } catch (error) {
      next(error);
    }
  };
}
