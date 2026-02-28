import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface CallerIdentity {
  type: 'user' | 'agent' | 'admin';
  id: string;
  email?: string;
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
 * Authenticate a JWT bearer token (for users).
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Bearer token required' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as any;
    req.caller = {
      type: 'user',
      id: payload.userId || payload.sub || payload.id,
      email: payload.email,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Authenticate admin JWT (separate secret).
 */
export function authenticateAdminJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Bearer token required' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.adminJwtSecret) as any;
    req.caller = {
      type: 'admin',
      id: payload.userId || payload.sub || payload.id,
      email: payload.email,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

/**
 * Authenticate agent via X-Api-Key header.
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;
  const agentId = req.headers['x-agent-id'] as string;

  if (!apiKey) {
    res.status(401).json({ error: 'X-Api-Key header required' });
    return;
  }

  // For the mock gateway, accept any API key with an agent ID
  if (!agentId) {
    res.status(401).json({ error: 'X-Agent-Id header required' });
    return;
  }

  req.caller = {
    type: 'agent',
    id: agentId,
    agentId,
  };
  next();
}

/**
 * Flexible auth: tries JWT first, then API key.
 */
export function authenticateAny(req: Request, res: Response, next: NextFunction): void {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return authenticateJWT(req, res, next);
  }
  if (req.headers['x-api-key']) {
    return authenticateApiKey(req, res, next);
  }
  res.status(401).json({ error: 'Authentication required (Bearer token or X-Api-Key)' });
}
