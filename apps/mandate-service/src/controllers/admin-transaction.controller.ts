import { Request, Response } from 'express';
import { TransactionRepository } from '../repositories/transaction.repository';
import { MandateRepository } from '../repositories/mandate.repository';

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
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get transaction detail' });
    }
  },
};
