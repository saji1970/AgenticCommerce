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
      const { status, type, limit, agentId, offset, merchantId, startDate, endDate } = req.query;
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
          merchantId as string | undefined,
          startDate as string | undefined,
          endDate as string | undefined,
        );
      }

      res.json({
        success: true,
        data: result.mandates.map((m: any) => ({
          id: m.id,
          userId: m.userId,
          agentId: m.agentId,
          agentName: m.agentName,
          type: m.type,
          status: m.status,
          constraints: m.constraints,
          parentMandateId: m.parentMandateId,
          paymentMethods: m.paymentMethods,
          merchantId: m.merchantId,
          merchantName: m.merchantName,
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
      const [parentMandate, childMandates, timeline, mitTransactions, purchaseIntents, cartItems, linkedOrders] = await Promise.all([
        mandate.parentMandateId ? mandateRepo.getById(mandate.parentMandateId) : null,
        mandate.type === 'app' ? mandateRepo.getChildMandates(id) : [],
        auditLogService.getByMandateId(id).catch(() => []),
        transactionRepo.getByMandateId(id).catch(() => []),
        backendDataRepository.getPurchaseIntentsByMandateId(id),
        backendDataRepository.getCartItemsByMandateId(id),
        backendDataRepository.getOrdersByMandateId(id),
      ]);

      // Build transactions list: prepend CIT if this mandate has CIT data
      const transactions: any[] = [];
      if (mandate.citTransactionId) {
        transactions.push({
          id: `cit-${mandate.id}`,
          type: 'CIT',
          status: 'completed',
          amount: mandate.constraints?.maxAmountPerPayment ?? mandate.constraints?.maxTransactionAmount ?? 0,
          currency: 'USD',
          createdAt: mandate.createdAt,
          processedAt: mandate.createdAt,
          transactionId: mandate.citTransactionId,
          description: 'Initial CIT Authorization',
          metadata: { networkToken: mandate.networkToken || null },
        });
      }
      transactions.push(...mitTransactions.map(t => ({
        id: t.id,
        type: t.type,
        status: t.status,
        amount: t.amount,
        currency: t.currency,
        createdAt: t.createdAt,
        processedAt: t.processedAt,
      })));

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
        transactions,
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

      if (['completed', 'revoked', 'expired'].includes(mandate.status)) {
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

  updateConstraints: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { id } = req.params;
      const { constraints } = req.body;

      if (!constraints || typeof constraints !== 'object' || Object.keys(constraints).length === 0) {
        res.status(400).json({ error: 'Constraints must be a non-empty object' });
        return;
      }

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

      if (['completed', 'revoked', 'expired'].includes(mandate.status)) {
        res.status(400).json({ error: `Cannot update constraints for mandate with status '${mandate.status}'` });
        return;
      }

      // Validate numeric fields are positive numbers
      const numericFields = ['maxAmountPerPayment', 'maxTransactionAmount', 'dailyLimit', 'monthlyLimit', 'maxFrequency'];
      for (const field of numericFields) {
        if (constraints[field] !== undefined) {
          const val = Number(constraints[field]);
          if (isNaN(val) || val <= 0) {
            res.status(400).json({ error: `${field} must be a positive number` });
            return;
          }
          constraints[field] = val;
        }
      }

      // Keep maxAmountPerPayment and maxTransactionAmount in sync
      if (constraints.maxTransactionAmount && !constraints.maxAmountPerPayment) {
        constraints.maxAmountPerPayment = constraints.maxTransactionAmount;
      } else if (constraints.maxAmountPerPayment && !constraints.maxTransactionAmount) {
        constraints.maxTransactionAmount = constraints.maxAmountPerPayment;
      }

      const oldConstraints = { ...mandate.constraints };
      const merged = { ...mandate.constraints, ...constraints };
      const updated = await mandateRepo.update(id, { constraints: merged });

      // Audit log
      await auditLogService.log({
        eventType: 'mandate.constraints_updated',
        eventCategory: 'mandate',
        severity: 'warning',
        description: `Admin ${caller.userId} updated constraints for mandate ${id}`,
        actorType: 'system',
        actorId: caller.userId,
        mandateId: id,
        oldState: oldConstraints,
        newState: merged,
        metadata: { adminRole: caller.adminRole, source: 'admin_panel' },
      }).catch(() => {});

      res.json({ success: true, mandate: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update constraints' });
    }
  },
};
