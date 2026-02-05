/**
 * Authentication Middleware
 * Supports JWT bearer tokens, merchant API keys, and system service tokens.
 * Attaches caller identity to req for downstream authorization.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { query } from '../config/database';

export interface CallerIdentity {
  type: 'user' | 'agent' | 'merchant' | 'system';
  id: string;
  email?: string;
  merchantId?: string;
  agentId?: string;
}

declare global {
  namespace Express {
    interface Request {
      caller?: CallerIdentity;
    }
  }
}

/**
 * Authenticate a JWT bearer token (for users and system services).
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Bearer token required' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as any;
    req.caller = {
      type: payload.role === 'system' ? 'system' : 'user',
      id: payload.userId || payload.sub || payload.id,
      email: payload.email,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Authenticate a merchant API key (X-Api-Key header).
 */
export function authenticateMerchantApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    res.status(401).json({ error: 'X-Api-Key header required' });
    return;
  }

  query(`SELECT id, status FROM merchants WHERE api_key = $1`, [apiKey])
    .then(result => {
      if (result.rows.length === 0) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
      }
      const merchant = result.rows[0];
      if (merchant.status !== 'active') {
        res.status(403).json({ error: `Merchant is ${merchant.status}` });
        return;
      }
      req.caller = { type: 'merchant', id: merchant.id, merchantId: merchant.id };
      next();
    })
    .catch(() => {
      res.status(500).json({ error: 'Authentication failed' });
    });
}

/**
 * Flexible auth: tries JWT first, then API key.
 */
export function authenticateAny(req: Request, res: Response, next: NextFunction): void {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return authenticateJWT(req, res, next);
  }
  if (req.headers['x-api-key']) {
    return authenticateMerchantApiKey(req, res, next);
  }
  res.status(401).json({ error: 'Authentication required (Bearer token or X-Api-Key)' });
}

/**
 * Require a specific caller type.
 */
export function requireCallerType(...types: CallerIdentity['type'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.caller || !types.includes(req.caller.type)) {
      res.status(403).json({ error: `This endpoint requires one of: ${types.join(', ')}` });
      return;
    }
    next();
  };
}
