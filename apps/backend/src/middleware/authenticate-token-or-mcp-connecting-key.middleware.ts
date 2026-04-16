import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { mcpConnectingAppRepository } from '../repositories/mcp-connecting-app.repository';

/**
 * For Card MCP proxy: accept end-user JWT, or a connecting-app key (mcpc_...)
 * via Authorization: Bearer mcpc_... or X-Connecting-App-Key: mcpc_...
 */
export async function authenticateTokenOrMcpConnectingKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const bearer =
    typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7).trim()
      : '';
  const headerKey =
    typeof req.headers['x-connecting-app-key'] === 'string'
      ? (req.headers['x-connecting-app-key'] as string).trim()
      : '';

  const mcpKey = bearer.startsWith('mcpc_') ? bearer : headerKey.startsWith('mcpc_') ? headerKey : '';

  if (mcpKey) {
    try {
      const row = await mcpConnectingAppRepository.findActiveByApiKey(mcpKey);
      if (!row) {
        res.status(401).json({
          success: false,
          error: { message: 'Invalid or revoked connecting app API key' },
        });
        return;
      }
      req.mcpAuthMode = 'mcp_connecting_app';
      req.mcpConnectingApp = { id: row.id, name: row.name };
      next();
      return;
    } catch {
      res.status(500).json({
        success: false,
        error: { message: 'Authentication failed' },
      });
      return;
    }
  }

  if (!bearer) {
    res.status(401).json({
      success: false,
      error: { message: 'Access token or connecting app API key required' },
    });
    return;
  }

  try {
    const payload = verifyToken(bearer);
    req.user = payload;
    req.mcpAuthMode = 'jwt';
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token' },
    });
  }
}
