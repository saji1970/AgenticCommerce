import { Request, Response } from 'express';
import { MerchantRepository } from '../repositories/merchant.repository';
import { AIAgentApp, AIAgentAppRepository } from '../repositories/ai-agent-app.repository';
import crypto from 'crypto';

const merchantRepo = new MerchantRepository();
const agentRepo = new AIAgentAppRepository();

/** Masks stored agent app token for admin list/detail (full value only on create/rotate). */
function maskAgentAppApiKey(key: string | null | undefined): string | undefined {
  if (!key) {
    return undefined;
  }
  if (key.length < 16) {
    return '***';
  }
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

function sanitizeAgentForAdmin(agent: AIAgentApp): AIAgentApp {
  return {
    ...agent,
    api_key: maskAgentAppApiKey(agent.api_key),
  };
}

export const adminMerchantController = {
  list: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;

      if (caller.adminRole === 'super_admin') {
        const merchants = await merchantRepo.getAll();
        res.json({ success: true, merchants, pagination: { total: merchants.length, limit: 100, offset: 0 } });
      } else {
        // Scoped to own merchant
        if (!caller.merchantId) {
          res.json({ success: true, merchants: [], pagination: { total: 0, limit: 100, offset: 0 } });
          return;
        }
        const merchant = await merchantRepo.getById(caller.merchantId);
        res.json({ success: true, merchants: merchant ? [merchant] : [], pagination: { total: merchant ? 1 : 0, limit: 100, offset: 0 } });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to list merchants' });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { id } = req.params;

      // Scope check for non-super_admin
      if (caller.adminRole !== 'super_admin' && id !== caller.merchantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const merchant = await merchantRepo.getById(id);
      if (!merchant) {
        res.status(404).json({ error: 'Merchant not found' });
        return;
      }

      res.json({ success: true, merchant });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get merchant' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, slug, description, webhookUrl, metadata } = req.body;

      const apiKey = 'mk_' + crypto.randomBytes(24).toString('hex');
      const apiSecret = 'ms_' + crypto.randomBytes(32).toString('hex');

      const merchant = await merchantRepo.create({
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description,
        api_key: apiKey,
        api_secret: apiSecret,
        webhook_url: webhookUrl,
        metadata,
      });

      res.status(201).json({ success: true, merchant, apiKey, apiSecret });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create merchant' });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { id } = req.params;

      // merchant_admin can only update own merchant
      if (caller.adminRole === 'merchant_admin' && id !== caller.merchantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const { name, description, webhookUrl, status, metadata } = req.body;
      const merchant = await merchantRepo.update(id, {
        name,
        description,
        webhook_url: webhookUrl,
        status,
        metadata,
      });

      res.json({ success: true, merchant });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update merchant' });
    }
  },

  updateStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const merchant = await merchantRepo.update(id, { status });
      res.json({ success: true, merchant });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update status' });
    }
  },

  listAgents: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { merchantId } = req.params;

      if (caller.adminRole !== 'super_admin' && merchantId !== caller.merchantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const agents = await agentRepo.getByMerchantId(merchantId);
      res.json({ success: true, agents: agents.map(sanitizeAgentForAdmin) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list agents' });
    }
  },

  registerAgent: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { merchantId } = req.params;

      if (caller.adminRole !== 'super_admin' && merchantId !== caller.merchantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const {
        name,
        slug,
        description,
        agentId,
        agentName,
        apiEndpoint,
        capabilities,
        metadata,
        appUiDisplayName,
        appUiBundleId,
      } = req.body;

      const appToken = `aat_${crypto.randomBytes(24).toString('hex')}`;

      const baseMeta =
        metadata && typeof metadata === 'object' && !Array.isArray(metadata)
          ? { ...(metadata as Record<string, unknown>) }
          : {};
      const appUi = {
        ...(typeof baseMeta.appUi === 'object' && baseMeta.appUi && !Array.isArray(baseMeta.appUi)
          ? { ...(baseMeta.appUi as Record<string, unknown>) }
          : {}),
        ...(appUiDisplayName ? { displayName: String(appUiDisplayName) } : {}),
        ...(appUiBundleId ? { bundleId: String(appUiBundleId) } : {}),
      };
      const mergedMetadata =
        Object.keys(appUi).length > 0 ? { ...baseMeta, appUi } : baseMeta;

      const agent = await agentRepo.create({
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description,
        agent_id: agentId,
        agent_name: agentName,
        api_endpoint: apiEndpoint,
        api_key: appToken,
        capabilities,
        merchant_id: merchantId,
        metadata: mergedMetadata,
      });

      res.status(201).json({
        success: true,
        agent: sanitizeAgentForAdmin(agent),
        appToken,
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to register agent' });
    }
  },

  getAgent: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { merchantId, agentId } = req.params;

      if (caller.adminRole !== 'super_admin' && merchantId !== caller.merchantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const agent = await agentRepo.getById(agentId);
      if (!agent || agent.merchant_id !== merchantId) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      res.json({ success: true, agent: sanitizeAgentForAdmin(agent) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get agent' });
    }
  },

  rotateAgentAppToken: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { merchantId, agentId } = req.params;

      if (caller.adminRole !== 'super_admin' && merchantId !== caller.merchantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const existing = await agentRepo.getById(agentId);
      if (!existing || existing.merchant_id !== merchantId) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      const appToken = `aat_${crypto.randomBytes(24).toString('hex')}`;
      const agent = await agentRepo.update(agentId, { api_key: appToken });

      res.json({
        success: true,
        appToken,
        agent: sanitizeAgentForAdmin(agent),
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to rotate app token' });
    }
  },

  updateAgent: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { merchantId, agentId } = req.params;

      if (caller.adminRole !== 'super_admin' && merchantId !== caller.merchantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const existing = await agentRepo.getById(agentId);
      if (!existing || existing.merchant_id !== merchantId) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      const { name, description, capabilities, status, apiEndpoint, appUiDisplayName, appUiBundleId } = req.body;

      const baseMeta =
        existing.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
          ? { ...existing.metadata }
          : {};
      const prevAppUi =
        typeof baseMeta.appUi === 'object' && baseMeta.appUi && !Array.isArray(baseMeta.appUi)
          ? { ...(baseMeta.appUi as Record<string, unknown>) }
          : {};
      const nextAppUi: Record<string, unknown> = { ...prevAppUi };
      if (appUiDisplayName !== undefined) {
        if (appUiDisplayName) {
          nextAppUi.displayName = String(appUiDisplayName);
        } else {
          delete nextAppUi.displayName;
        }
      }
      if (appUiBundleId !== undefined) {
        if (appUiBundleId) {
          nextAppUi.bundleId = String(appUiBundleId);
        } else {
          delete nextAppUi.bundleId;
        }
      }
      const hasMetaUpdate = appUiDisplayName !== undefined || appUiBundleId !== undefined;

      const agent = await agentRepo.update(agentId, {
        name,
        description,
        capabilities,
        status,
        api_endpoint: apiEndpoint,
        ...(hasMetaUpdate
          ? {
              metadata:
                Object.keys(nextAppUi).length > 0
                  ? { ...baseMeta, appUi: nextAppUi }
                  : (() => {
                      const { appUi: _removed, ...rest } = baseMeta as Record<string, unknown>;
                      return rest;
                    })(),
            }
          : {}),
      });

      res.json({ success: true, agent: sanitizeAgentForAdmin(agent) });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update agent' });
    }
  },

  deleteAgent: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { merchantId, agentId } = req.params;

      if (caller.adminRole !== 'super_admin' && merchantId !== caller.merchantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const existing = await agentRepo.getById(agentId);
      if (!existing || existing.merchant_id !== merchantId) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      // Soft-delete by setting status to inactive
      await agentRepo.update(agentId, { status: 'inactive' });
      res.json({ success: true, message: 'Agent deactivated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete agent' });
    }
  },

  rotateKeys: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { merchantId } = req.params;

      if (caller.adminRole !== 'super_admin' && merchantId !== caller.merchantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const apiKey = 'mk_' + crypto.randomBytes(24).toString('hex');
      const apiSecret = 'ms_' + crypto.randomBytes(32).toString('hex');

      await merchantRepo.update(merchantId, {});
      // Update api_key and api_secret directly
      const { query: dbQuery } = await import('../config/database');
      await dbQuery(
        'UPDATE merchants SET api_key = $1, api_secret = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [apiKey, apiSecret, merchantId]
      );

      res.json({ success: true, apiKey, apiSecret });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to rotate keys' });
    }
  },
};
