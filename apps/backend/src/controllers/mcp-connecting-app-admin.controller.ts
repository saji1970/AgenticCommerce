import { Request, Response } from 'express';
import {
  mcpConnectingAppRepository,
  McpConnectingKeyPurpose,
} from '../repositories/mcp-connecting-app.repository';

function parsePurpose(body: unknown): McpConnectingKeyPurpose {
  const p = typeof body === 'object' && body !== null && 'purpose' in body ? (body as { purpose?: unknown }).purpose : undefined;
  return p === 'agentic_api' ? 'agentic_api' : 'mcp_proxy';
}

function maskKey(key: string): string {
  if (key.length < 16) return '***';
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export const mcpConnectingAppAdminController = {
  list: async (_req: Request, res: Response): Promise<void> => {
    try {
      const rows = await mcpConnectingAppRepository.listAll();
      res.json({
        success: true,
        keys: rows.map((r) => ({
          id: r.id,
          name: r.name,
          keyPreview: maskKey(r.api_key),
          purpose: r.purpose || 'mcp_proxy',
          createdAt: r.created_at,
          revokedAt: r.revoked_at,
          active: !r.revoked_at,
        })),
      });
    } catch (e) {
      console.error('[MCP connecting apps] list:', e);
      res.status(500).json({ success: false, error: 'Failed to list keys' });
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name : 'Connecting app';
      const purpose = parsePurpose(req.body);
      const { row, apiKey } = await mcpConnectingAppRepository.create(name, purpose);
      res.status(201).json({
        success: true,
        apiKey,
        purpose: row.purpose || purpose,
        key: {
          id: row.id,
          name: row.name,
          purpose: row.purpose || purpose,
          keyPreview: maskKey(apiKey),
          createdAt: row.created_at,
        },
      });
    } catch (e) {
      console.error('[MCP connecting apps] create:', e);
      res.status(500).json({ success: false, error: 'Failed to create key' });
    }
  },

  revoke: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const ok = await mcpConnectingAppRepository.revoke(id);
      if (!ok) {
        res.status(404).json({ success: false, error: 'Key not found or already revoked' });
        return;
      }
      res.json({ success: true });
    } catch (e) {
      console.error('[MCP connecting apps] revoke:', e);
      res.status(500).json({ success: false, error: 'Failed to revoke key' });
    }
  },
};
