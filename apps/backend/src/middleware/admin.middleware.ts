import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * Middleware to check if user is an admin
 * Must be used after authenticateToken middleware
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;

    if (!user) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }

    // Check if user has admin role
    const { pool } = await import('../config/database');
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [user.userId]);

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    const userRole = result.rows[0].role;

    if (userRole !== 'admin') {
      throw new AppError(403, 'Admin access required', 'FORBIDDEN');
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(500, 'Error checking admin status', 'INTERNAL_ERROR'));
    }
  }
};
