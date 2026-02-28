import { Request, Response } from 'express';
import { vrpConsentService } from '../services/vrp-consent.service';

export const vrpConsentController = {
  async createConsent(req: Request, res: Response) {
    try {
      const { userId, agentId, agentName, paymentMethod, maxAmountPerPayment, dailyLimit, monthlyLimit, expiryDate, constraints, appMandateId, merchantId } = req.body;

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
        appMandateId,
        merchantId,
      });

      res.status(201).json({ success: true, data: consent });
    } catch (error: any) {
      console.error('Error creating VRP consent:', error);
      let msg = error.message || 'Failed to create consent';
      let status = 500;
      if (msg.includes('invalid input syntax for type uuid') || msg.includes('invalid UUID')) {
        msg = 'Invalid user session. Please log out and log in again via the main app.';
        status = 400;
      } else if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('connection') || msg.includes('ECONNREFUSED')) {
        msg = 'Payment service temporarily unavailable. Please try again later.';
        status = 503;
      }
      res.status(status).json({ success: false, error: msg });
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

  async getConsentTransactions(req: Request, res: Response) {
    try {
      const consentId = req.params.id;
      const userId = req.caller?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const consent = await vrpConsentService.getConsentById(consentId);
      if (!consent) return res.status(404).json({ success: false, error: 'Consent not found' });
      if (consent.userId !== userId) return res.status(403).json({ success: false, error: 'Not authorized to view this consent' });

      const limit = parseInt((req.query.limit as string) || '50', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);
      const result = await vrpConsentService.getTransactionsByConsent(consentId, limit, offset);
      res.json({ success: true, data: result.transactions, total: result.total });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async executePayment(req: Request, res: Response) {
    try {
      const { consentId, amount, currency, description, metadata, mandateId, appMandateId, cartId, intentId, merchantId, productInfo } = req.body;

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
        mandateId,
        appMandateId,
        cartId,
        intentId,
        merchantId,
        productInfo,
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

  /**
   * Execute payment using consent token (user-initiated checkout).
   * User must be authenticated via JWT and token must belong to their consent.
   */
  async executeWithToken(req: Request, res: Response) {
    try {
      const { consentToken, amount, currency, description, metadata, cartId, intentId, productInfo } = req.body;
      const userId = req.caller?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
      if (!consentToken || !amount) {
        return res.status(400).json({ success: false, error: 'consentToken and amount are required' });
      }

      const validation = await vrpConsentService.validateToken(consentToken);
      if (!validation.valid || !validation.consent) {
        return res.status(400).json({ success: false, error: validation.error || 'Invalid or expired consent token' });
      }
      if (validation.consent.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Not authorized to use this consent' });
      }

      const result = await vrpConsentService.validateAndExecutePayment({
        consentId: validation.consent.id,
        agentId: validation.consent.agentId,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        description: description || 'Checkout payment',
        metadata,
        cartId,
        intentId,
        productInfo,
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
};
