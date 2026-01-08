import { MerchantRepository } from '../repositories/merchant.repository';
import { AP2TransactionRepository } from '../repositories/ap2-transaction.repository';
import { MandateService } from './mandate.service';
import { AgenticCommerceService } from './agentic-commerce.service';
import { AP2WebhookService } from './ap2-webhook.service';
import {
  Merchant,
  MandateType,
  AP2TransactionType,
  AP2TransactionStatus,
  AP2CartOperationRequest,
  AP2IntentOperationRequest,
  AP2PaymentOperationRequest,
  AP2OperationResponse,
  AP2AuthorizationRequest,
  AP2AuthorizationResponse,
  AP2MandateVerificationRequest,
  AP2MandateVerificationResponse,
  AP2WebhookEvent,
  AgentCartRequest,
  CreateIntentRequest,
  AgentPaymentRequest,
} from '@agentic-commerce/shared-types';
import crypto from 'crypto';

export class AP2GatewayService {
  private merchantRepository: MerchantRepository;
  private transactionRepository: AP2TransactionRepository;
  private mandateService: MandateService;
  private acpService: AgenticCommerceService;
  private webhookService: AP2WebhookService;

  constructor() {
    this.merchantRepository = new MerchantRepository();
    this.transactionRepository = new AP2TransactionRepository();
    this.mandateService = new MandateService();
    this.acpService = new AgenticCommerceService();
    this.webhookService = new AP2WebhookService();
  }

  // ============================================================================
  // Authorization & Verification
  // ============================================================================

  async authorizeRequest(request: AP2AuthorizationRequest): Promise<AP2AuthorizationResponse> {
    // Get merchant
    const merchant = await this.merchantRepository.getById(request.merchantId);
    if (!merchant) {
      return {
        authorized: false,
        transactionId: '',
        message: 'Merchant not found',
      };
    }

    if (merchant.status !== 'active') {
      return {
        authorized: false,
        transactionId: '',
        message: `Merchant is ${merchant.status}`,
      };
    }

    // Verify request signature
    const isValidSignature = this.verifySignature(
      request,
      merchant.apiSecret
    );

    if (!isValidSignature) {
      return {
        authorized: false,
        transactionId: '',
        message: 'Invalid signature',
      };
    }

    // Check timestamp for replay protection (within 5 minutes)
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (Math.abs(now - request.timestamp) > maxAge) {
      return {
        authorized: false,
        transactionId: '',
        message: 'Request timestamp expired',
      };
    }

    // Validate mandate
    try {
      const mandate = await this.mandateService.validateMandateAccess(
        request.mandateId,
        request.agentId
      );

      // Check transaction limits based on merchant settings
      if (request.amount && request.amount > merchant.settings.maxTransactionAmount) {
        return {
          authorized: false,
          transactionId: '',
          message: `Transaction amount exceeds merchant limit of ${merchant.settings.maxTransactionAmount}`,
        };
      }

      // Create transaction record
      const transaction = await this.transactionRepository.create(
        merchant.id,
        request.userId,
        request.agentId,
        request.mandateId,
        request.transactionType,
        request.amount || null,
        request.metadata
      );

      // Update merchant activity
      await this.merchantRepository.updateLastActivity(merchant.id);

      return {
        authorized: true,
        transactionId: transaction.id,
        constraints: {
          maxAmount: merchant.settings.maxTransactionAmount,
          requiresApproval: mandate.type === MandateType.INTENT,
        },
      };
    } catch (error) {
      return {
        authorized: false,
        transactionId: '',
        message: error instanceof Error ? error.message : 'Authorization failed',
      };
    }
  }

  async verifyMandate(request: AP2MandateVerificationRequest): Promise<AP2MandateVerificationResponse> {
    try {
      const mandate = await this.mandateService.validateMandateAccess(
        request.mandateId,
        request.agentId
      );

      // Get remaining limits
      const dailySpending = await this.transactionRepository.getSpendingByMandate(
        request.mandateId,
        'day'
      );
      const monthlySpending = await this.transactionRepository.getSpendingByMandate(
        request.mandateId,
        'month'
      );
      const transactionsToday = await this.transactionRepository.countTransactionsByMandate(
        request.mandateId,
        'day'
      );

      return {
        valid: true,
        mandate: {
          id: mandate.id,
          type: mandate.type,
          status: mandate.status,
          constraints: mandate.constraints,
          validUntil: mandate.validUntil,
        },
        remainingLimits: {
          dailySpending,
          monthlySpending,
          transactionsToday,
        },
      };
    } catch (error) {
      return {
        valid: false,
        reason: error instanceof Error ? error.message : 'Mandate verification failed',
      };
    }
  }

  // ============================================================================
  // Cart Operations
  // ============================================================================

  async processCartOperation(
    merchant: Merchant,
    userId: string,
    request: AP2CartOperationRequest
  ): Promise<AP2OperationResponse> {
    if (!merchant.settings.supportsCartMandate) {
      return {
        success: false,
        transactionId: '',
        message: 'Merchant does not support cart mandates',
      };
    }

    try {
      // Verify signature
      if (!this.verifySignature(request, merchant.apiSecret)) {
        return {
          success: false,
          transactionId: '',
          message: 'Invalid signature',
        };
      }

      // Check timestamp
      if (!this.isTimestampValid(request.timestamp)) {
        return {
          success: false,
          transactionId: '',
          message: 'Request timestamp expired',
        };
      }

      // Create transaction record
      const transaction = await this.transactionRepository.create(
        merchant.id,
        userId,
        request.agentId,
        request.mandateId,
        AP2TransactionType.CART_ADD,
        request.price || null,
        {
          operation: request.operation,
          productId: request.productId,
          productName: request.productName,
          quantity: request.quantity,
          reasoning: request.reasoning,
        }
      );

      if (request.operation === 'add') {
        // Execute ACP cart operation
        const acpRequest: AgentCartRequest = {
          mandateId: request.mandateId,
          agentId: request.agentId,
          productId: request.productId,
          productName: request.productName || '',
          quantity: request.quantity || 1,
          price: request.price || 0,
          reasoning: request.reasoning,
        };

        const result = await this.acpService.agentAddToCart(userId, acpRequest);

        // Update transaction status
        await this.transactionRepository.updateStatus(
          transaction.id,
          AP2TransactionStatus.COMPLETED
        );

        // Send webhook notification
        await this.webhookService.sendWebhook(
          merchant,
          AP2WebhookEvent.CART_UPDATED,
          {
            transactionId: transaction.id,
            operation: request.operation,
            cartItem: result.cartItem,
          }
        );

        return {
          success: true,
          transactionId: transaction.id,
          data: result,
        };
      }

      // For update/remove operations, mark as completed for now
      await this.transactionRepository.updateStatus(
        transaction.id,
        AP2TransactionStatus.COMPLETED
      );

      return {
        success: true,
        transactionId: transaction.id,
        message: `Cart ${request.operation} operation recorded`,
      };
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        message: error instanceof Error ? error.message : 'Cart operation failed',
      };
    }
  }

  // ============================================================================
  // Intent Operations
  // ============================================================================

  async processIntentOperation(
    merchant: Merchant,
    userId: string,
    request: AP2IntentOperationRequest
  ): Promise<AP2OperationResponse> {
    if (!merchant.settings.supportsIntentMandate) {
      return {
        success: false,
        transactionId: '',
        message: 'Merchant does not support intent mandates',
      };
    }

    try {
      // Verify signature
      if (!this.verifySignature(request, merchant.apiSecret)) {
        return {
          success: false,
          transactionId: '',
          message: 'Invalid signature',
        };
      }

      // Check timestamp
      if (!this.isTimestampValid(request.timestamp)) {
        return {
          success: false,
          transactionId: '',
          message: 'Request timestamp expired',
        };
      }

      // Calculate total
      const total = request.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Create transaction record
      const transaction = await this.transactionRepository.create(
        merchant.id,
        userId,
        request.agentId,
        request.mandateId,
        AP2TransactionType.INTENT_CREATE,
        total,
        {
          items: request.items,
          reasoning: request.reasoning,
        }
      );

      // Execute ACP intent creation
      const acpRequest: CreateIntentRequest = {
        mandateId: request.mandateId,
        agentId: request.agentId,
        items: request.items,
        reasoning: request.reasoning,
      };

      const intent = await this.acpService.createPurchaseIntent(userId, acpRequest);

      // Update transaction status
      await this.transactionRepository.updateStatus(
        transaction.id,
        AP2TransactionStatus.AUTHORIZED
      );

      // Send webhook notification
      await this.webhookService.sendWebhook(
        merchant,
        AP2WebhookEvent.INTENT_CREATED,
        {
          transactionId: transaction.id,
          intent: intent,
        }
      );

      return {
        success: true,
        transactionId: transaction.id,
        data: { intent },
      };
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        message: error instanceof Error ? error.message : 'Intent operation failed',
      };
    }
  }

  // ============================================================================
  // Payment Operations
  // ============================================================================

  async processPaymentOperation(
    merchant: Merchant,
    userId: string,
    request: AP2PaymentOperationRequest
  ): Promise<AP2OperationResponse> {
    if (!merchant.settings.supportsPaymentMandate) {
      return {
        success: false,
        transactionId: '',
        message: 'Merchant does not support payment mandates',
      };
    }

    try {
      // Verify signature
      if (!this.verifySignature(request, merchant.apiSecret)) {
        return {
          success: false,
          transactionId: '',
          message: 'Invalid signature',
        };
      }

      // Check timestamp
      if (!this.isTimestampValid(request.timestamp)) {
        return {
          success: false,
          transactionId: '',
          message: 'Request timestamp expired',
        };
      }

      // Check daily/monthly limits
      const dailyStats = await this.transactionRepository.getDailyStats(
        merchant.id,
        new Date()
      );

      if (dailyStats.totalVolume + request.amount > merchant.settings.dailyTransactionLimit) {
        return {
          success: false,
          transactionId: '',
          message: 'Daily transaction limit exceeded',
        };
      }

      // Create transaction record
      const transaction = await this.transactionRepository.create(
        merchant.id,
        userId,
        request.agentId,
        request.mandateId,
        AP2TransactionType.PAYMENT_EXECUTE,
        request.amount,
        {
          intentId: request.intentId,
          paymentMethod: request.paymentMethod,
          reasoning: request.reasoning,
        }
      );

      // Execute ACP payment
      const acpRequest: AgentPaymentRequest = {
        mandateId: request.mandateId,
        agentId: request.agentId,
        intentId: request.intentId,
        paymentMethod: request.paymentMethod,
        reasoning: request.reasoning,
      };

      const result = await this.acpService.agentExecutePayment(userId, acpRequest);

      // Update transaction status
      await this.transactionRepository.updateStatus(
        transaction.id,
        AP2TransactionStatus.COMPLETED,
        result.payment.id
      );

      // Send webhook notification
      await this.webhookService.sendWebhook(
        merchant,
        AP2WebhookEvent.PAYMENT_COMPLETED,
        {
          transactionId: transaction.id,
          payment: result.payment,
        }
      );

      return {
        success: true,
        transactionId: transaction.id,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        message: error instanceof Error ? error.message : 'Payment operation failed',
      };
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private verifySignature(request: any, apiSecret: string): boolean {
    const { signature, timestamp, ...data } = request;

    // Create signature payload
    const payload = `${timestamp}.${JSON.stringify(data)}`;

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', apiSecret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  private isTimestampValid(timestamp: number, maxAge: number = 300000): boolean {
    const now = Date.now();
    return Math.abs(now - timestamp) <= maxAge;
  }

  generateSignature(data: any, apiSecret: string, timestamp: number): string {
    const payload = `${timestamp}.${JSON.stringify(data)}`;
    return crypto
      .createHmac('sha256', apiSecret)
      .update(payload)
      .digest('hex');
  }
}
