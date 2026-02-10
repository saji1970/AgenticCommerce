import { Request, Response } from 'express';
import { MandateRepository } from '../repositories/mandate.repository';

const mandateRepo = new MandateRepository();

export const adminMandateController = {
  list: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { status, type, limit } = req.query;
      const parsedLimit = parseInt(limit as string) || 100;

      let mandates;
      if (caller.adminRole !== 'super_admin' && caller.merchantId) {
        mandates = await mandateRepo.getAllWithMerchantScope(
          caller.merchantId,
          status as string | undefined,
          type as string | undefined,
          parsedLimit
        );
      } else {
        mandates = await mandateRepo.getAllMandates(
          status as string | undefined,
          type as string | undefined,
          parsedLimit
        );
      }

      res.json({
        success: true,
        data: mandates.map(m => ({
          id: m.id,
          userId: m.userId,
          agentId: m.agentId,
          agentName: m.agentName,
          type: m.type,
          status: m.status,
          constraints: m.constraints,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          expiresAt: m.validUntil,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list mandates' });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { id } = req.params;

      const mandate = await mandateRepo.getByIdWithMerchantCheck(id);
      if (!mandate) {
        res.status(404).json({ error: 'Mandate not found' });
        return;
      }

      // Merchant scope check
      if (caller.adminRole !== 'super_admin' && caller.merchantId) {
        if (mandate.agentMerchantId !== caller.merchantId) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      res.json({
        success: true,
        mandate: {
          id: mandate.id,
          userId: mandate.userId,
          agentId: mandate.agentId,
          agentName: mandate.agentName,
          type: mandate.type,
          status: mandate.status,
          constraints: mandate.constraints,
          validFrom: mandate.validFrom,
          validUntil: mandate.validUntil,
          revokedAt: mandate.revokedAt,
          revokedReason: mandate.revokedReason,
          createdAt: mandate.createdAt,
          updatedAt: mandate.updatedAt,
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get mandate' });
    }
  },

  revoke: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { id } = req.params;
      const { reason } = req.body;

      const mandate = await mandateRepo.getByIdWithMerchantCheck(id);
      if (!mandate) {
        res.status(404).json({ error: 'Mandate not found' });
        return;
      }

      // Merchant scope check
      if (caller.adminRole !== 'super_admin' && caller.merchantId) {
        if (mandate.agentMerchantId !== caller.merchantId) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      if (['revoked', 'expired'].includes(mandate.status)) {
        res.status(400).json({ error: `Cannot revoke mandate with status '${mandate.status}'` });
        return;
      }

      const updated = await mandateRepo.updateStatus(id, 'revoked', reason);
      res.json({ success: true, mandate: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to revoke mandate' });
    }
  },

  suspend: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { id } = req.params;

      const mandate = await mandateRepo.getByIdWithMerchantCheck(id);
      if (!mandate) {
        res.status(404).json({ error: 'Mandate not found' });
        return;
      }

      if (caller.adminRole !== 'super_admin' && caller.merchantId) {
        if (mandate.agentMerchantId !== caller.merchantId) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      if (mandate.status !== 'active') {
        res.status(400).json({ error: `Cannot suspend mandate with status '${mandate.status}', must be 'active'` });
        return;
      }

      const updated = await mandateRepo.updateStatus(id, 'suspended');
      res.json({ success: true, mandate: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to suspend mandate' });
    }
  },

  reactivate: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { id } = req.params;

      const mandate = await mandateRepo.getByIdWithMerchantCheck(id);
      if (!mandate) {
        res.status(404).json({ error: 'Mandate not found' });
        return;
      }

      if (caller.adminRole !== 'super_admin' && caller.merchantId) {
        if (mandate.agentMerchantId !== caller.merchantId) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      if (mandate.status !== 'suspended') {
        res.status(400).json({ error: `Cannot reactivate mandate with status '${mandate.status}', must be 'suspended'` });
        return;
      }

      const updated = await mandateRepo.updateStatus(id, 'active');
      res.json({ success: true, mandate: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reactivate mandate' });
    }
  },
};
