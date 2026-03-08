import { Request, Response } from 'express';
import { CofPaymentService } from '../services/cof-payment.service';

const cofPaymentService = new CofPaymentService();

export const cofPaymentController = {
  processCIT: async (req: Request, res: Response) => {
    try {
      const { pan, amount, currency, terminalId, merchantId, mandateId } = req.body;

      if (!pan || !amount || !mandateId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: pan, amount, mandateId',
        });
      }

      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'amount must be a positive number',
        });
      }

      const result = await cofPaymentService.processCIT({
        pan,
        amount,
        currency,
        terminalId,
        merchantId,
        mandateId,
      });

      const status = result.success ? 200 : 400;
      res.status(status).json(result);
    } catch (error: any) {
      console.error('[CoF-CIT] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  },

  processMIT: async (req: Request, res: Response) => {
    try {
      const { networkToken, amount, currency, originalCitTransactionId, mandateId } = req.body;

      if (!networkToken || !amount || !originalCitTransactionId || !mandateId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: networkToken, amount, originalCitTransactionId, mandateId',
        });
      }

      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'amount must be a positive number',
        });
      }

      const result = await cofPaymentService.processMIT({
        networkToken,
        amount,
        currency,
        originalCitTransactionId,
        mandateId,
      });

      const status = result.success ? 200 : 400;
      res.status(status).json(result);
    } catch (error: any) {
      console.error('[CoF-MIT] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  },
};
