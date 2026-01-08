import { Request, Response } from 'express';
import { AgenticCommerceService } from '../services/agentic-commerce.service';

export class AgenticCommerceController {
  private acpService: AgenticCommerceService;

  constructor() {
    this.acpService = new AgenticCommerceService();
  }

  // Cart Mandate Endpoints
  agentAddToCart = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const result = await this.acpService.agentAddToCart(userId, req.body);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error in agent add to cart:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add item to cart',
      });
    }
  };

  // Intent Mandate Endpoints
  createIntent = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const intent = await this.acpService.createPurchaseIntent(userId, req.body);

      res.status(201).json({
        success: true,
        data: intent,
      });
    } catch (error) {
      console.error('Error creating intent:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create intent',
      });
    }
  };

  getUserIntents = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { status } = req.query;

      const intents = await this.acpService.getUserIntents(userId, status as string);

      res.json({
        success: true,
        data: intents,
      });
    } catch (error) {
      console.error('Error getting intents:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get intents',
      });
    }
  };

  approveIntent = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { intentId } = req.params;

      const intent = await this.acpService.approveIntent(userId, intentId);

      res.json({
        success: true,
        data: intent,
      });
    } catch (error) {
      console.error('Error approving intent:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve intent',
      });
    }
  };

  rejectIntent = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { intentId } = req.params;
      const { reason } = req.body;

      const intent = await this.acpService.rejectIntent(userId, intentId, reason);

      res.json({
        success: true,
        data: intent,
      });
    } catch (error) {
      console.error('Error rejecting intent:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject intent',
      });
    }
  };

  // Payment Mandate Endpoints
  agentExecutePayment = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const result = await this.acpService.agentExecutePayment(userId, req.body);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error in agent payment:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute payment',
      });
    }
  };

  // Agent Actions (Audit Log)
  getAgentActions = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { agentId, limit } = req.query;

      const actions = await this.acpService.getAgentActions(
        userId,
        agentId as string,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: actions,
      });
    } catch (error) {
      console.error('Error getting agent actions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agent actions',
      });
    }
  };
}
