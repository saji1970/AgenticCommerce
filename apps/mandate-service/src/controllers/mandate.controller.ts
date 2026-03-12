import { Request, Response } from 'express';
import { MandateService } from '../services/mandate.service';

export class MandateController {
  private mandateService: MandateService;

  constructor() {
    this.mandateService = new MandateService();
  }

  // Register a new mandate (called by agents)
  registerMandate = async (req: Request, res: Response) => {
    try {
      const { userId, agentId, agentName, type, constraints, parentMandateId, paymentMethods, validUntil } = req.body;

      if (!userId || !agentId || !type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, agentId, type',
        });
      }

      const mandate = await this.mandateService.createMandate({
        userId,
        agentId,
        agentName,
        type,
        constraints,
        parentMandateId,
        paymentMethods,
        validUntil: validUntil ? new Date(validUntil) : undefined,
      });

      res.status(201).json({
        success: true,
        data: mandate,
      });
    } catch (error) {
      console.error('Error registering mandate:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register mandate',
      });
    }
  };

  // Get mandates - all mandates if no userId, or user-specific
  getUserMandates = async (req: Request, res: Response) => {
    try {
      const { userId, status, type, limit } = req.query;

      let mandates;
      if (userId) {
        mandates = await this.mandateService.getUserMandates(
          userId as string,
          status as string,
          type as string
        );
      } else {
        // No userId - return all mandates (admin view)
        mandates = await this.mandateService.getAllMandates(
          status as string,
          type as string,
          limit ? parseInt(limit as string) : undefined
        );
      }

      res.json({
        success: true,
        data: mandates,
      });
    } catch (error) {
      console.error('Error getting mandates:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get mandates',
      });
    }
  };

  // Get specific mandate
  getMandate = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const mandate = await this.mandateService.getMandate(id);

      res.json({
        success: true,
        data: mandate,
      });
    } catch (error) {
      console.error('Error getting mandate:', error);
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Mandate not found',
      });
    }
  };

  // Approve mandate (called by user)
  approveMandate = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required in request body',
        });
      }

      const { mandate, mandateToken } = await this.mandateService.approveMandate(id, userId);

      res.json({
        success: true,
        data: mandate,
        mandateToken,
      });
    } catch (error) {
      console.error('Error approving mandate:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve mandate',
      });
    }
  };

  // Validate mandate token (called by backend during checkout)
  validateMandateToken = async (req: Request, res: Response) => {
    try {
      const { token, cartData } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'token is required in request body',
        });
      }

      const result = await this.mandateService.validateMandateToken(token, cartData);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error validating mandate token:', error);
      res.status(400).json({
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Token validation failed',
      });
    }
  };

  // Suspend mandate
  suspendMandate = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required in request body',
        });
      }

      const mandate = await this.mandateService.suspendMandate(id, userId);

      res.json({
        success: true,
        data: mandate,
      });
    } catch (error) {
      console.error('Error suspending mandate:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to suspend mandate',
      });
    }
  };

  // Revoke mandate
  revokeMandate = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, reason } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required in request body',
        });
      }

      const mandate = await this.mandateService.revokeMandate(id, userId, reason);

      res.json({
        success: true,
        data: mandate,
      });
    } catch (error) {
      console.error('Error revoking mandate:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke mandate',
      });
    }
  };

  // Get user's app mandates
  getUserAppMandates = async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId query parameter is required',
        });
      }

      const mandates = await this.mandateService.getUserAppMandates(userId as string);

      res.json({
        success: true,
        data: mandates,
      });
    } catch (error) {
      console.error('Error getting app mandates:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get app mandates',
      });
    }
  };

  // Get app mandate with its child mandates
  getAppMandateChildren = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.mandateService.getAppMandateWithChildren(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error getting app mandate children:', error);
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'App mandate not found',
      });
    }
  };

  // Complete mandates after successful payment
  completeMandatesAfterPayment = async (req: Request, res: Response) => {
    try {
      const { mandateIds } = req.body;

      if (!mandateIds || !Array.isArray(mandateIds) || mandateIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'mandateIds array is required',
        });
      }

      const result = await this.mandateService.completeMandatesAfterPayment(mandateIds);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error completing mandates:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete mandates',
      });
    }
  };

  // Register a mandate with CIT authorization (provisions network token)
  registerMandateWithCIT = async (req: Request, res: Response) => {
    try {
      const {
        userId, agentId, agentName, type, constraints, parentMandateId,
        paymentMethods, validUntil, cardDetails, dailyLimit, periodLimit, periodType,
      } = req.body;

      if (!userId || !agentId || !type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, agentId, type',
        });
      }

      if (!cardDetails || !cardDetails.pan || !cardDetails.amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: cardDetails.pan, cardDetails.amount',
        });
      }

      const result = await this.mandateService.createMandateWithCIT({
        userId,
        agentId,
        agentName,
        type,
        constraints,
        parentMandateId,
        paymentMethods,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        cardDetails,
        dailyLimit,
        periodLimit,
        periodType,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error registering mandate with CIT:', error);
      const message = error instanceof Error ? error.message : 'Failed to register mandate with CIT';
      const status = message.includes('CIT authorization failed') ? 402 : 400;
      res.status(status).json({
        success: false,
        error: message,
      });
    }
  };

  // Process agent payment via MIT (uses stored network token)
  processAgentPayment = async (req: Request, res: Response) => {
    try {
      const { mandateId, userId, agentId, amount, currency } = req.body;

      if (!mandateId || !userId || !agentId || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: mandateId, userId, agentId, amount',
        });
      }

      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'amount must be a positive number',
        });
      }

      const result = await this.mandateService.processAgentPaymentMIT({
        mandateId,
        userId,
        agentId,
        amount,
        currency,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error processing agent payment:', error);
      const message = error instanceof Error ? error.message : 'Failed to process agent payment';

      let status = 400;
      if (message.includes('not found')) status = 404;
      else if (message.includes('Unauthorized')) status = 403;
      else if (message.includes('MIT authorization failed')) status = 402;
      else if (message.includes('limit exceeded') || message.includes('Limit exceeded')) status = 429;

      res.status(status).json({
        success: false,
        error: message,
      });
    }
  };

  // Update constraints on user's own mandate
  updateConstraints = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, constraints } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required in request body',
        });
      }

      if (!constraints || typeof constraints !== 'object' || Object.keys(constraints).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'constraints must be a non-empty object',
        });
      }

      const mandate = await this.mandateService.getMandate(id);
      if (mandate.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only update constraints on your own mandates',
        });
      }

      if (['completed', 'revoked', 'expired'].includes(mandate.status)) {
        return res.status(400).json({
          success: false,
          error: `Cannot update constraints for mandate with status '${mandate.status}'`,
        });
      }

      // Validate numeric fields are positive numbers
      const numericFields = ['maxTransactionAmount', 'maxAmountPerPayment', 'dailySpendingLimit', 'dailyLimit', 'monthlySpendingLimit', 'monthlyLimit'];
      for (const field of numericFields) {
        if (constraints[field] !== undefined) {
          const val = Number(constraints[field]);
          if (isNaN(val) || val <= 0) {
            return res.status(400).json({
              success: false,
              error: `${field} must be a positive number`,
            });
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

      const merged = { ...mandate.constraints, ...constraints };
      const updated = await this.mandateService.updateMandateConstraints(id, merged);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error('Error updating mandate constraints:', error);
      res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update constraints',
      });
    }
  };

  // Validate mandate for transaction (called by agents before transactions)
  validateMandate = async (req: Request, res: Response) => {
    try {
      const { userId, agentId, mandateType, transactionAmount } = req.body;

      if (!userId || !agentId || !mandateType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, agentId, mandateType',
        });
      }

      const mandate = await this.mandateService.validateMandateForTransaction(
        userId,
        agentId,
        mandateType,
        transactionAmount
      );

      res.json({
        success: true,
        data: {
          valid: true,
          mandate: {
            id: mandate.id,
            type: mandate.type,
            status: mandate.status,
            constraints: mandate.constraints,
          },
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Mandate validation failed',
      });
    }
  };
}
