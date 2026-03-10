import { Request, Response } from 'express';
import { CheckoutMandateService } from '../services/checkout-mandate.service';

export class CheckoutMandateController {
  private checkoutService: CheckoutMandateService;

  constructor() {
    this.checkoutService = new CheckoutMandateService();
  }

  createCheckoutMandate = async (req: Request, res: Response) => {
    try {
      const {
        userId, agentId, agentName, paymentMethod,
        maxAmountPerPayment, dailyLimit, monthlyLimit,
        expiryDate, appMandateId, constraints,
      } = req.body;

      if (!userId || !agentId || !paymentMethod || !maxAmountPerPayment) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, agentId, paymentMethod, maxAmountPerPayment',
        });
      }

      const mandate = await this.checkoutService.createCheckoutMandate({
        userId,
        agentId,
        agentName,
        paymentMethod,
        maxAmountPerPayment: parseFloat(maxAmountPerPayment),
        dailyLimit: dailyLimit != null ? parseFloat(dailyLimit) : undefined,
        monthlyLimit: monthlyLimit != null ? parseFloat(monthlyLimit) : undefined,
        expiryDate,
        appMandateId,
        constraints,
      });

      res.status(201).json({
        success: true,
        data: mandate,
      });
    } catch (error) {
      console.error('Error creating checkout mandate:', error);
      const message = error instanceof Error ? error.message : 'Failed to create checkout mandate';
      const status = message.includes('CIT authorization failed') ? 402 : 400;
      res.status(status).json({
        success: false,
        error: message,
      });
    }
  };

  getUserCheckoutMandates = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { status } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required',
        });
      }

      const mandates = await this.checkoutService.getUserCheckoutMandates(
        userId,
        status as string | undefined
      );

      res.json({
        success: true,
        data: mandates,
      });
    } catch (error) {
      console.error('Error getting checkout mandates:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get checkout mandates',
      });
    }
  };

  approveCheckoutMandate = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required in request body',
        });
      }

      const { mandate, consentToken } = await this.checkoutService.approveCheckoutMandate(id, userId);

      res.json({
        success: true,
        data: mandate,
        consentToken,
      });
    } catch (error) {
      console.error('Error approving checkout mandate:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve checkout mandate',
      });
    }
  };

  revokeCheckoutMandate = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, reason } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required in request body',
        });
      }

      const mandate = await this.checkoutService.revokeCheckoutMandate(id, userId, reason);

      res.json({
        success: true,
        data: mandate,
      });
    } catch (error) {
      console.error('Error revoking checkout mandate:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke checkout mandate',
      });
    }
  };

  getUsage = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const usage = await this.checkoutService.getUsage(id);

      res.json({
        success: true,
        data: usage,
      });
    } catch (error) {
      console.error('Error getting checkout usage:', error);
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get usage',
      });
    }
  };

  getTransactions = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // For now return empty transactions — the mandate-service doesn't have a
      // dedicated transactions table yet; usage is tracked on the mandate itself.
      res.json({
        success: true,
        data: [],
        total: 0,
      });
    } catch (error) {
      console.error('Error getting transactions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transactions',
      });
    }
  };

  executePaymentWithToken = async (req: Request, res: Response) => {
    try {
      const { consentToken, amount, currency, description } = req.body;

      if (!consentToken || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: consentToken, amount',
        });
      }

      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'amount must be a positive number',
        });
      }

      const result = await this.checkoutService.executePaymentWithToken(
        consentToken,
        amount,
        currency,
        description
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error executing payment with token:', error);
      const message = error instanceof Error ? error.message : 'Failed to execute payment';

      let status = 400;
      if (message.includes('not found')) status = 404;
      if (message.includes('Unauthorized')) status = 403;
      if (message.includes('MIT authorization failed')) status = 402;
      if (message.includes('limit exceeded') || message.includes('Limit exceeded')) status = 429;
      if (message.includes('expired')) status = 410;

      res.status(status).json({
        success: false,
        error: message,
      });
    }
  };

  validateConsentToken = async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'token is required in request body',
        });
      }

      const result = await this.checkoutService.validateConsentToken(token);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error validating consent token:', error);
      res.status(400).json({
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Token validation failed',
      });
    }
  };
}
