/**
 * Admin Authentication & Authorization Middleware
 * Verifies admin JWT tokens and enforces role-based access.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AdminRole } from '../repositories/admin-user.repository';
import { AdminCaller } from '../services/admin-user.service';

declare global {
  namespace Express {
    interface Request {
      adminCaller?: AdminCaller;
    }
  }
}

/**
 * Verify admin JWT and attach adminCaller to request.
 */
export function authenticateAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Bearer token required' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as any;

    if (!payload.adminRole) {
      res.status(401).json({ error: 'Not an admin token' });
      return;
    }

    req.adminCaller = {
      userId: payload.userId,
      email: payload.email,
      adminRole: payload.adminRole,
      merchantId: payload.merchantId || null,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Require one of the specified admin roles.
 */
export function requireAdminRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.adminCaller) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.adminCaller.adminRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

/**
 * Ensure merchant-scoped users can only access their own merchant data.
 * Checks req.params.merchantId or req.params.id against caller's merchantId.
 */
export function requireMerchantScope(paramName: string = 'merchantId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.adminCaller) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Super admins can access everything
    if (req.adminCaller.adminRole === 'super_admin') {
      next();
      return;
    }

    const requestedMerchantId = req.params[paramName];
    if (requestedMerchantId && requestedMerchantId !== req.adminCaller.merchantId) {
      res.status(403).json({ error: 'Access denied: merchant scope violation' });
      return;
    }

    next();
  };
}
