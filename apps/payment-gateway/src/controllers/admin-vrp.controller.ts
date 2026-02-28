import { Request, Response } from 'express';
import { vrpConsentService } from '../services/vrp-consent.service';

export const adminVrpController = {
  async listConsents(req: Request, res: Response) {
    try {
      const { status, agentId, merchantId, userId, limit, offset } = req.query;
      const result = await vrpConsentService.getAllConsents({
        status: status as string,
        agentId: agentId as string,
        merchantId: merchantId as string,
        userId: userId as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });
      res.json({ success: true, data: result.consents, pagination: { total: result.total, limit: limit || 20, offset: offset || 0 } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getConsentDetail(req: Request, res: Response) {
    try {
      const consent = await vrpConsentService.getConsentById(req.params.id);
      if (!consent) return res.status(404).json({ success: false, error: 'Consent not found' });

      const usage = await vrpConsentService.getUsage(req.params.id);
      const { transactions } = await vrpConsentService.getTransactionsByConsent(req.params.id, 50, 0);

      res.json({ success: true, data: { consent, usage, transactions } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getConsentTransactions(req: Request, res: Response) {
    try {
      const { limit, offset } = req.query;
      const result = await vrpConsentService.getTransactionsByConsent(
        req.params.id,
        limit ? parseInt(limit as string, 10) : undefined,
        offset ? parseInt(offset as string, 10) : undefined,
      );
      res.json({ success: true, data: result.transactions, pagination: { total: result.total } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async listAllTransactions(req: Request, res: Response) {
    try {
      const { status, userId, agentId, mandateId, merchantId, limit, offset } = req.query;
      const result = await vrpConsentService.getAllTransactions({
        status: status as string,
        userId: userId as string,
        agentId: agentId as string,
        mandateId: mandateId as string,
        merchantId: merchantId as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });
      res.json({ success: true, data: result.transactions, pagination: { total: result.total, limit: limit || 20, offset: offset || 0 } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async suspendConsent(req: Request, res: Response) {
    try {
      const consent = await vrpConsentService.suspendConsent(req.params.id);
      res.json({ success: true, data: consent });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async revokeConsent(req: Request, res: Response) {
    try {
      const { reason } = req.body;
      const consent = await vrpConsentService.adminRevokeConsent(req.params.id, reason);
      res.json({ success: true, data: consent });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  },
};
