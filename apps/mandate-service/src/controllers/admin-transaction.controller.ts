import { Request, Response } from 'express';
import { TransactionRepository } from '../repositories/transaction.repository';
import { MandateRepository } from '../repositories/mandate.repository';
import { query } from '../config/database';

const transactionRepo = new TransactionRepository();
const mandateRepo = new MandateRepository();

export const adminTransactionController = {
  list: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { status, type, agentId, limit, offset } = req.query;

      const filters: Record<string, string> = {};
      if (status) filters.status = status as string;
      if (type) filters.type = type as string;
      if (agentId) filters.agentId = agentId as string;

      // Force merchant scope for non-super_admin
      if (caller.adminRole !== 'super_admin' && caller.merchantId) {
        filters.merchantId = caller.merchantId;
      }

      const parsedLimit = parseInt(limit as string) || 10;
      const parsedOffset = parseInt(offset as string) || 0;

      const { transactions, total } = await transactionRepo.getAll(filters, parsedLimit, parsedOffset);

      res.json({
        success: true,
        data: transactions,
        pagination: { total, limit: parsedLimit, offset: parsedOffset },
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list transactions' });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { id } = req.params;

      const transaction = await transactionRepo.getById(id);
      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      // Merchant scope check
      if (caller.adminRole !== 'super_admin' && caller.merchantId) {
        if (transaction.merchantId !== caller.merchantId) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      res.json({ success: true, transaction });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get transaction' });
    }
  },

  getDetail: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { id } = req.params;

      const transaction = await transactionRepo.getById(id);
      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      if (caller.adminRole !== 'super_admin' && caller.merchantId) {
        if (transaction.merchantId !== caller.merchantId) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      // Fetch linked mandate if exists
      const linkedMandate = transaction.mandateId
        ? await mandateRepo.getById(transaction.mandateId)
        : null;

      // Fetch parent mandate (APP/VRP) and sibling mandates
      let parentMandate = null;
      let relatedMandates: any[] = [];

      if (linkedMandate?.parentMandateId) {
        const parent = await mandateRepo.getById(linkedMandate.parentMandateId);
        if (parent) {
          parentMandate = {
            id: parent.id,
            type: parent.type,
            status: parent.status,
            agentName: parent.agentName,
            constraints: parent.constraints || {},
          };

          // Fetch sibling mandates (other children of the same parent)
          const siblings = await mandateRepo.getChildMandates(parent.id);
          relatedMandates = siblings
            .filter(s => s.id !== linkedMandate.id)
            .map(s => ({
              id: s.id,
              type: s.type,
              status: s.status,
              constraints: s.constraints || {},
              createdAt: s.createdAt,
            }));
        }
      }

      res.json({
        success: true,
        transaction,
        linkedMandate: linkedMandate ? {
          id: linkedMandate.id,
          type: linkedMandate.type,
          status: linkedMandate.status,
          agentId: linkedMandate.agentId,
          agentName: linkedMandate.agentName,
          constraints: linkedMandate.constraints,
          createdAt: linkedMandate.createdAt,
        } : null,
        parentMandate,
        relatedMandates,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get transaction detail' });
    }
  },

  seedTest: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      if (caller.adminRole !== 'super_admin') {
        res.status(403).json({ error: 'Only super_admin can seed test data' });
        return;
      }

      // Find a real payment mandate to link to (preferably one with a parent)
      const mandateResult = await query(
        `SELECT * FROM agent_mandates WHERE type = 'payment' ORDER BY created_at DESC LIMIT 1`
      );
      let mandate = mandateResult.rows[0];

      // Fallback: use any mandate
      if (!mandate) {
        const fallback = await query(`SELECT * FROM agent_mandates ORDER BY created_at DESC LIMIT 1`);
        mandate = fallback.rows[0];
      }

      const now = new Date();
      const mmddhhmmss = [
        String(now.getUTCMonth() + 1).padStart(2, '0'),
        String(now.getUTCDate()).padStart(2, '0'),
        String(now.getUTCHours()).padStart(2, '0'),
        String(now.getUTCMinutes()).padStart(2, '0'),
        String(now.getUTCSeconds()).padStart(2, '0'),
      ].join('');

      const isoMessage = {
        MTI: '0200',
        DE2_NetworkToken: '****4242',
        DE4_Amount: '000000002999',
        DE7_TransmissionDateTime: mmddhhmmss,
        DE11_STAN: '123456',
        DE25_POSConditionCode: '08',
        DE48_CoFIndicator: 'MIT',
        DE49_Currency: 'USD',
        DE63_OriginalCitRef: 'CIT-TEST-REF-001',
        MandateId: mandate?.id || 'test-mandate',
      };

      const tx = await transactionRepo.create({
        mandateId: mandate?.id || undefined,
        userId: mandate?.user_id || 'test-user',
        agentId: mandate?.agent_id || 'test-agent',
        merchantId: mandate?.merchant_id || undefined,
        type: 'payment',
        status: 'completed',
        amount: 29.99,
        currency: 'USD',
        gatewayTransactionId: `GW-TEST-${Date.now()}`,
        gatewayResponse: {
          responseCode: '00',
          message: 'Approved',
          isoMessage,
        },
        metadata: {
          parentMandateId: mandate?.parent_mandate_id || null,
          description: 'Test VRP checkout payment (seeded)',
          isoMessage,
        },
        processedAt: new Date(),
      });

      res.json({ success: true, transaction: tx, message: 'Test transaction seeded' });
    } catch (error: any) {
      console.error('[SeedTest] Failed:', error);
      res.status(500).json({ error: 'Failed to seed test transaction', detail: error.message });
    }
  },
};
