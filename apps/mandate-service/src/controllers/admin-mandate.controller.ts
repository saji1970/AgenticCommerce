import { Request, Response } from 'express';
import { MandateRepository } from '../repositories/mandate.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { auditLogService } from '../services/audit-log.service';
import { backendDataRepository } from '../repositories/backend-data.repository';

const mandateRepo = new MandateRepository();
const transactionRepo = new TransactionRepository();

export const adminMandateController = {
  list: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { status, type, limit, agentId, offset } = req.query;
      const parsedLimit = parseInt(limit as string) || 100;
      const parsedOffset = parseInt(offset as string) || 0;

      let result;
      if (caller.adminRole !== 'super_admin' && caller.merchantId) {
        result = await mandateRepo.getAllWithMerchantScope(
          caller.merchantId,
          status as string | undefined,
          type as string | undefined,
          parsedLimit,
          agentId as string | undefined,
          parsedOffset,
        );
      } else {
        result = await mandateRepo.getAllMandates(
          status as string | undefined,
          type as string | undefined,
          parsedLimit,
          agentId as string | undefined,
          parsedOffset,
        );
      }

      res.json({
        success: true,
        data: result.mandates.map(m => ({
          id: m.id,
          userId: m.userId,
          agentId: m.agentId,
          agentName: m.agentName,
          type: m.type,
          status: m.status,
          constraints: m.constraints,
          parentMandateId: m.parentMandateId,
          paymentMethods: m.paymentMethods,
          validFrom: m.validFrom,
          validUntil: m.validUntil,
          revokedAt: m.revokedAt,
          revokedReason: m.revokedReason,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          expiresAt: m.validUntil,
        })),
        pagination: { total: result.total, limit: parsedLimit, offset: parsedOffset },
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
          parentMandateId: mandate.parentMandateId,
          paymentMethods: mandate.paymentMethods,
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

  getDetail: async (req: Request, res: Response) => {
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

      // Fetch related data in parallel
      const [parentMandate, childMandates, timeline, transactions, purchaseIntents, cartItems, linkedOrders] = await Promise.all([
        mandate.parentMandateId ? mandateRepo.getById(mandate.parentMandateId) : null,
        mandate.type === 'app' ? mandateRepo.getChildMandates(id) : [],
        auditLogService.getByMandateId(id).catch(() => []),
        transactionRepo.getByMandateId(id).catch(() => []),
        backendDataRepository.getPurchaseIntentsByMandateId(id),
        backendDataRepository.getCartItemsByMandateId(id),
        backendDataRepository.getOrdersByMandateId(id),
      ]);

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
          parentMandateId: mandate.parentMandateId,
          paymentMethods: mandate.paymentMethods,
          validFrom: mandate.validFrom,
          validUntil: mandate.validUntil,
          revokedAt: mandate.revokedAt,
          revokedReason: mandate.revokedReason,
          createdAt: mandate.createdAt,
          updatedAt: mandate.updatedAt,
        },
        parentMandate: parentMandate ? {
          id: parentMandate.id,
          type: parentMandate.type,
          status: parentMandate.status,
          agentName: parentMandate.agentName,
          constraints: parentMandate.constraints,
        } : null,
        childMandates: (childMandates as any[]).map(c => ({
          id: c.id,
          type: c.type,
          status: c.status,
          constraints: c.constraints,
          createdAt: c.createdAt,
        })),
        timeline: timeline.map(e => ({
          id: e.id,
          eventType: e.eventType,
          eventCategory: e.eventCategory,
          severity: e.severity,
          description: e.description,
          actorType: e.actorType,
          actorId: e.actorId,
          oldState: e.oldState,
          newState: e.newState,
          metadata: e.metadata,
          createdAt: e.createdAt,
        })),
        transactions: transactions.map(t => ({
          id: t.id,
          type: t.type,
          status: t.status,
          amount: t.amount,
          currency: t.currency,
          createdAt: t.createdAt,
          processedAt: t.processedAt,
        })),
        purchaseIntents,
        cartItems,
        linkedOrders,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get mandate detail' });
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
