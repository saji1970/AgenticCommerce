import { Request, Response } from 'express';
import { MandateService } from '../services/mandate.service';

export class MandateController {
  private mandateService: MandateService;

  constructor() {
    this.mandateService = new MandateService();
  }

  createMandate = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const mandate = await this.mandateService.createMandate(userId, req.body);

      res.status(201).json({
        success: true,
        data: mandate,
      });
    } catch (error) {
      console.error('Error creating mandate:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create mandate',
      });
    }
  };

  getUserMandates = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { status, type } = req.query;

      const mandates = await this.mandateService.getUserMandates(
        userId,
        status as any,
        type as any
      );

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

  getMandate = async (req: Request, res: Response) => {
    try {
      const { mandateId } = req.params;
      const mandate = await this.mandateService.getMandate(mandateId);

      if (!mandate) {
        return res.status(404).json({
          success: false,
          error: 'Mandate not found',
        });
      }

      res.json({
        success: true,
        data: mandate,
      });
    } catch (error) {
      console.error('Error getting mandate:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get mandate',
      });
    }
  };

  approveMandate = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { mandateId } = req.params;

      const mandate = await this.mandateService.approveMandate(mandateId, userId);

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

  suspendMandate = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { mandateId } = req.params;

      const mandate = await this.mandateService.suspendMandate(mandateId, userId);

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

  revokeMandate = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { mandateId } = req.params;
      const { reason } = req.body;

      const mandate = await this.mandateService.revokeMandate(mandateId, userId, reason);

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
}
