import { Request, Response } from 'express';
import { DisputeRepository } from '../repositories/dispute.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { disputeService } from '../services/dispute.service';

const disputeRepo = new DisputeRepository();
const transactionRepo = new TransactionRepository();

export const adminDisputeController = {
  list: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const { status, merchantId, agentId, transactionId, limit = '20', offset = '0' } = req.query;

      const filters: Record<string, any> = {};
      if (status) filters.status = status as string;
      if (agentId) filters.agentId = agentId as string;
      if (transactionId) filters.transactionId = transactionId as string;

      // Force merchant scope for non-super_admin
      if (caller.adminRole !== 'super_admin' && caller.merchantId) {
        filters.merchantId = caller.merchantId;
      } else if (merchantId) {
        filters.merchantId = merchantId as string;
      }

      const result = await disputeRepo.getAll(
        filters,
        parseInt(limit as string, 10),
        parseInt(offset as string, 10),
      );

      res.json({
        success: true,
        data: result.disputes,
        pagination: {
          total: result.total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        },
      });
    } catch (err: any) {
      console.error('[Disputes] list error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const dispute = await disputeRepo.getById(req.params.id);
      if (!dispute) {
        return res.status(404).json({ success: false, error: 'Dispute not found' });
      }

      // Merchant scope check
      if (caller.adminRole !== 'super_admin' && caller.merchantId) {
        if (dispute.merchantId !== caller.merchantId) {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }

      res.json({ success: true, data: dispute });
    } catch (err: any) {
      console.error('[Disputes] getById error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { transactionId, reason, disputeAmount, currency, notes } = req.body;

      if (!transactionId || !reason || disputeAmount === undefined) {
        return res.status(400).json({
          success: false,
          error: 'transactionId, reason, and disputeAmount are required',
        });
      }

      // Load transaction to auto-fill fields
      const transaction = await transactionRepo.getById(transactionId);
      if (!transaction) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }

      // Check for existing dispute
      const existing = await disputeRepo.getByTransactionId(transactionId);
      if (existing && existing.status !== 'closed') {
        return res.status(409).json({
          success: false,
          error: 'An active dispute already exists for this transaction',
          disputeId: existing.id,
        });
      }

      const dispute = await disputeRepo.create({
        transactionId,
        mandateId: transaction.mandateId || undefined,
        userId: transaction.userId,
        agentId: transaction.agentId || undefined,
        merchantId: transaction.merchantId || undefined,
        reason,
        disputeAmount: parseFloat(disputeAmount),
        currency: currency || transaction.currency,
        notes,
      });

      res.status(201).json({ success: true, data: dispute });
    } catch (err: any) {
      console.error('[Disputes] create error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const dispute = await disputeRepo.getById(req.params.id);
      if (!dispute) {
        return res.status(404).json({ success: false, error: 'Dispute not found' });
      }

      const { status, notes, externalCaseId } = req.body;
      const updateData: Record<string, any> = {};

      if (status) {
        updateData.status = status;
        if (status === 'won' || status === 'lost' || status === 'closed') {
          updateData.resolvedAt = new Date();
        }
      }
      if (notes !== undefined) updateData.notes = notes;
      if (externalCaseId !== undefined) updateData.externalCaseId = externalCaseId;

      const updated = await disputeRepo.update(req.params.id, updateData);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[Disputes] update error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  assembleEvidence: async (req: Request, res: Response) => {
    try {
      const updated = await disputeService.assembleEvidencePack(req.params.id);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[Disputes] assembleEvidence error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  exportCSV: async (req: Request, res: Response) => {
    try {
      const csv = await disputeService.exportCSV(req.params.id);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=dispute-${req.params.id}.csv`);
      res.send(csv);
    } catch (err: any) {
      console.error('[Disputes] exportCSV error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  pushToBAU: async (req: Request, res: Response) => {
    try {
      const { webhookUrl } = req.body;
      if (!webhookUrl) {
        return res.status(400).json({ success: false, error: 'webhookUrl is required' });
      }

      const updated = await disputeService.pushToBAU(req.params.id, webhookUrl);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[Disputes] pushToBAU error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },
};
