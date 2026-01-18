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
      const { userId, agentId, agentName, type, constraints, validUntil } = req.body;

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

  // Get user's mandates
  getUserMandates = async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId query parameter is required',
        });
      }

      const { status, type } = req.query;
      const mandates = await this.mandateService.getUserMandates(
        userId as string,
        status as string,
        type as string
      );

      res.json({
        success: true,
        data: mandates,
      });
    } catch (error) {
      console.error('Error getting user mandates:', error);
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

      const mandate = await this.mandateService.approveMandate(id, userId);

      res.json({
        success: true,
        data: mandate,
      });
    } catch (error) {
      console.error('Error approving mandate:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve mandate',
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
