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
      
      // Log request for debugging
      console.log('[AgentAddToCart] Request:', {
        userId,
        productId: req.body.productId,
        productName: req.body.productName,
        price: req.body.price,
        quantity: req.body.quantity,
        mandateId: req.body.mandateId,
        agentId: req.body.agentId,
        hasProductImage: !!req.body.productImage,
        reasoningLength: req.body.reasoning?.length || 0,
      });
      
      const result = await this.acpService.agentAddToCart(userId, req.body);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error in agent add to cart:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add item to cart';
      res.status(400).json({
        success: false,
        error: {
          message: errorMessage,
        },
      });
    }
  };

  // Intent Mandate Endpoints
  createIntent = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { agentId, agentName, items, reasoning } = req.body;

      // Check/create intent mandate if not provided
      let mandateId = req.body.mandateId;
      if (!mandateId && agentId) {
        try {
          // Check for existing active intent mandate for this agent
          const MandateService = (await import('../services/mandate.service')).MandateService;
          const mandateService = new MandateService();
          const { MandateType, MandateStatus } = await import('@agentic-commerce/shared-types');

          const existingMandates = await mandateService.getUserMandates(
            userId,
            MandateStatus.ACTIVE,
            MandateType.INTENT
          );
          let intentMandate = existingMandates.find(m => m.agentId === agentId);

          // If no mandate exists, create one
          if (!intentMandate) {
            // Calculate intent value for constraints
            const intentValue = items.reduce((sum: number, item: any) => 
              sum + (item.price * item.quantity), 0
            );
            
            intentMandate = await mandateService.createMandate(userId, {
              agentId,
              agentName: agentName || agentId,
              type: MandateType.INTENT,
              constraints: {
                maxIntentValue: Math.max(intentValue * 2, 2000), // Allow 2x the intent value
                maxIntentsPerDay: 20,
                autoApproveUnder: 100,
              },
            });
          }

          mandateId = intentMandate.id;
        } catch (mandateError) {
          return res.status(400).json({
            success: false,
            error: mandateError instanceof Error ? mandateError.message : 'Mandate validation failed',
            requiresMandateApproval: true,
          });
        }
      }

      const intent = await this.acpService.createPurchaseIntent(userId, {
        ...req.body,
        mandateId,
      });

      res.status(201).json({
        success: true,
        data: intent,
        mandate: mandateId ? {
          id: mandateId,
          requiresApproval: intent.status === 'pending', // Signal if approval needed
        } : undefined,
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
