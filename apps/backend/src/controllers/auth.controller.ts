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
}
