import { Request, Response } from 'express';
import { AP2GatewayService } from '../services/ap2-gateway.service';
import { MerchantRepository } from '../repositories/merchant.repository';
import {
  AP2AuthorizationRequest,
  AP2CartOperationRequest,
  AP2IntentOperationRequest,
  AP2PaymentOperationRequest,
  AP2MandateVerificationRequest,
} from '@agentic-commerce/shared-types';

// Extend Request type to include merchant
export interface AP2Request extends Request {
  merchant?: any;
  merchantId?: string;
}

export class AP2GatewayController {
  private gatewayService: AP2GatewayService;
  private merchantRepository: MerchantRepository;

  constructor() {
    this.gatewayService = new AP2GatewayService();
    this.merchantRepository = new MerchantRepository();
  }

  // ============================================================================
  // Authorization & Verification
  // ============================================================================

  authorizeTransaction = async (req: AP2Request, res: Response): Promise<void> => {
    try {
      const request: AP2AuthorizationRequest = req.body;

      const response = await this.gatewayService.authorizeRequest(request);

      if (response.authorized) {
        res.json(response);
      } else {
        res.status(403).json(response);
      }
    } catch (error) {
      console.error('Error authorizing transaction:', error);
      res.status(500).json({
        authorized: false,
        transactionId: '',
        message: error instanceof Error ? error.message : 'Authorization failed',
      });
    }
  };

  verifyMandate = async (req: AP2Request, res: Response): Promise<void> => {
    try {
      const request: AP2MandateVerificationRequest = req.body;

      const response = await this.gatewayService.verifyMandate(request);

      if (response.valid) {
        res.json(response);
      } else {
        res.status(400).json(response);
      }
    } catch (error) {
      console.error('Error verifying mandate:', error);
      res.status(500).json({
        valid: false,
        reason: error instanceof Error ? error.message : 'Verification failed',
      });
    }
  };

  // ============================================================================
  // Cart Operations
  // ============================================================================

  processCartOperation = async (req: AP2Request, res: Response): Promise<void> => {
    try {
      const merchant = req.merchant;
      const userId = req.body.userId; // In production, this might come from auth token
      const request: AP2CartOperationRequest = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          transactionId: '',
          message: 'userId is required',
        });
        return;
      }

      const response = await this.gatewayService.processCartOperation(
        merchant,
        userId,
        request
      );

      if (response.success) {
        res.json(response);
      } else {
        res.status(400).json(response);
      }
    } catch (error) {
      console.error('Error processing cart operation:', error);
      res.status(500).json({
        success: false,
        transactionId: '',
        message: error instanceof Error ? error.message : 'Cart operation failed',
      });
    }
  };

  // ============================================================================
  // Intent Operations
  // ============================================================================

  processIntentOperation = async (req: AP2Request, res: Response): Promise<void> => {
    try {
      const merchant = req.merchant;
      const userId = req.body.userId;
      const request: AP2IntentOperationRequest = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          transactionId: '',
          message: 'userId is required',
        });
        return;
      }

      const response = await this.gatewayService.processIntentOperation(
        merchant,
        userId,
        request
      );

      if (response.success) {
        res.json(response);
      } else {
        res.status(400).json(response);
      }
    } catch (error) {
      console.error('Error processing intent operation:', error);
      res.status(500).json({
        success: false,
        transactionId: '',
        message: error instanceof Error ? error.message : 'Intent operation failed',
      });
    }
  };

  // ============================================================================
  // Payment Operations
  // ============================================================================

  processPaymentOperation = async (req: AP2Request, res: Response): Promise<void> => {
    try {
      const merchant = req.merchant;
      const userId = req.body.userId;
      const request: AP2PaymentOperationRequest = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          transactionId: '',
          message: 'userId is required',
        });
        return;
      }

      const response = await this.gatewayService.processPaymentOperation(
        merchant,
        userId,
        request
      );

      if (response.success) {
        res.json(response);
      } else {
        res.status(400).json(response);
      }
    } catch (error) {
      console.error('Error processing payment operation:', error);
      res.status(500).json({
        success: false,
        transactionId: '',
        message: error instanceof Error ? error.message : 'Payment operation failed',
      });
    }
  };

  // ============================================================================
  // Utility Endpoints
  // ============================================================================

  getApiDocs = async (req: Request, res: Response): Promise<void> => {
    res.json({
      name: 'Agentic Protocol 2 (AP2) Gateway API',
      version: '1.0.0',
      description: 'Acquirer bank integration API for AI agent-powered shopping',
      endpoints: {
        authorization: {
          method: 'POST',
          path: '/api/ap2/gateway/authorize',
          description: 'Authorize an agent transaction',
        },
        mandateVerification: {
          method: 'POST',
          path: '/api/ap2/gateway/verify-mandate',
          description: 'Verify mandate validity and check limits',
        },
        cartOperations: {
          method: 'POST',
          path: '/api/ap2/gateway/cart',
          description: 'Process cart operations (add, update, remove)',
        },
        intentOperations: {
          method: 'POST',
          path: '/api/ap2/gateway/intent',
          description: 'Create purchase intents',
        },
        paymentOperations: {
          method: 'POST',
          path: '/api/ap2/gateway/payment',
          description: 'Execute payments',
        },
      },
      authentication: {
        type: 'API Key + HMAC Signature',
        headers: {
          'X-AP2-API-Key': 'Your merchant API key',
          'X-AP2-Signature': 'HMAC-SHA256 signature of request body',
        },
      },
    });
  };

  healthCheck = async (req: Request, res: Response): Promise<void> => {
    res.json({
      status: 'ok',
      service: 'AP2 Gateway',
      timestamp: new Date().toISOString(),
    });
  };
}
