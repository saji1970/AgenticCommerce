import { Request, Response } from 'express';
import { vrpConsentService } from '../services/vrp-consent.service';

export const vrpConsentController = {
  async createConsent(req: Request, res: Response) {
    try {
      const { userId, agentId, agentName, paymentMethod, maxAmountPerPayment, dailyLimit, monthlyLimit, expiryDate, constraints } = req.body;

      if (!userId || !agentId || !agentName || !paymentMethod || !maxAmountPerPayment) {
        return res.status(400).json({ success: false, error: 'Missing required fields: userId, agentId, agentName, paymentMethod, maxAmountPerPayment' });
      }

      const consent = await vrpConsentService.createConsent({
        userId,
        agentId,
        agentName,
        paymentMethod,
        maxAmountPerPayment: parseFloat(maxAmountPerPayment),
        dailyLimit: dailyLimit ? parseFloat(dailyLimit) : undefined,
        monthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : undefined,
        expiryDate,
        constraints,
      });

      res.status(201).json({ success: true, data: consent });
    } catch (error: any) {
      console.error('Error creating VRP consent:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getUserConsents(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { status } = req.query;
      const consents = await vrpConsentService.getUserConsents(userId, status as string);
      res.json({ success: true, data: consents });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getConsentById(req: Request, res: Response) {
    try {
      const consent = await vrpConsentService.getConsentById(req.params.id);
      if (!consent) return res.status(404).json({ success: false, error: 'Consent not found' });
      res.json({ success: true, data: consent });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async approveConsent(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

      const result = await vrpConsentService.approveConsent(req.params.id, userId);
      res.json({ success: true, data: result.consent, consentToken: result.token });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async revokeConsent(req: Request, res: Response) {
    try {
      const { userId, reason } = req.body;
      if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

      const consent = await vrpConsentService.revokeConsent(req.params.id, userId, reason);
      res.json({ success: true, data: consent });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async getUsage(req: Request, res: Response) {
    try {
      const usage = await vrpConsentService.getUsage(req.params.id);
      res.json({ success: true, data: usage });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async executePayment(req: Request, res: Response) {
    try {
      const { consentId, amount, currency, description, metadata } = req.body;

      if (!consentId || !amount) {
        return res.status(400).json({ success: false, error: 'consentId and amount are required' });
      }

      const agentId = req.caller?.agentId || req.caller?.id;
      if (!agentId) return res.status(401).json({ success: false, error: 'Agent identity required' });

      const result = await vrpConsentService.validateAndExecutePayment({
        consentId,
        agentId,
        amount: parseFloat(amount),
        currency,
        description,
        metadata,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('not authorized') ? 403
        : error.message.includes('exceeds') || error.message.includes('expired') || error.message.includes('not active') ? 400
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async validateToken(req: Request, res: Response) {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ success: false, error: 'token is required' });

      const result = await vrpConsentService.validateToken(token);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
