import { MandateService } from './mandate.service';
import { CartService } from './cart.service';
import { PaymentService } from './payment.service';
import { PurchaseIntentRepository } from '../repositories/purchase-intent.repository';
import { AgentActionRepository } from '../repositories/agent-action.repository';
import {
  MandateType,
  AgentCartRequest,
  CreateIntentRequest,
  AgentPaymentRequest,
  PurchaseIntent,
} from '@agentic-commerce/shared-types';

export class AgenticCommerceService {
  private mandateService: MandateService;
  private cartService: CartService;
  private paymentService: PaymentService;
  private intentRepository: PurchaseIntentRepository;
  private actionRepository: AgentActionRepository;

  constructor() {
    this.mandateService = new MandateService();
    this.cartService = new CartService();
    this.paymentService = new PaymentService();
    this.intentRepository = new PurchaseIntentRepository();
    this.actionRepository = new AgentActionRepository();
  }

  async agentAddToCart(userId: string, request: AgentCartRequest): Promise<any> {
    try {
      // Validate mandate
      const mandate = await this.mandateService.validateMandateAccess(
        request.mandateId,
        request.agentId,
        MandateType.CART
      );

      // Validate constraints
      await this.mandateService.validateCartConstraints(
        mandate,
        request.price
      );

      // Add to cart
      const cartItem = await this.cartService.addToCart(
        userId,
        request.productId,
        request.productName,
        request.productImage,
        request.quantity,
        request.price,
        request.variants
      );

      // Log success
      await this.actionRepository.log(
        userId,
        request.agentId,
        request.mandateId,
        'add_to_cart',
        'cart',
        cartItem.id,
        {
          productId: request.productId,
          productName: request.productName,
          quantity: request.quantity,
          price: request.price,
          reasoning: request.reasoning,
        },
        true
      );

      return {
        success: true,
        cartItem,
        message: 'Item added to cart by agent',
      };
    } catch (error) {
      // Log failure
      await this.actionRepository.log(
        userId,
        request.agentId,
        request.mandateId,
        'add_to_cart',
        'cart',
        null,
        {
          productId: request.productId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        false,
        error instanceof Error ? error.message : undefined
      );

      throw error;
    }
  }

  async createPurchaseIntent(userId: string, request: CreateIntentRequest): Promise<PurchaseIntent> {
    try {
      // Validate mandate
      const mandate = await this.mandateService.validateMandateAccess(
        request.mandateId,
        request.agentId,
        MandateType.INTENT
      );

      // Calculate totals
      const subtotal = request.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);
      const tax = subtotal * 0.08; // 8% tax
      const total = subtotal + tax;

      // Validate constraints and check auto-approval
      const shouldAutoApprove = await this.mandateService.validateIntentConstraints(
        mandate,
        total
      );

      // Calculate expiry (default 24 hours)
      const constraints = mandate.constraints as any;
      const expiryHours = constraints.expiryHours || 24;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiryHours);

      // Create intent
      const intent = await this.intentRepository.create(
        userId,
        request.agentId,
        request.mandateId,
        request.items,
        subtotal,
        tax,
        total,
        request.reasoning,
        expiresAt
      );

      // Auto-approve if conditions met
      if (shouldAutoApprove) {
        await this.intentRepository.approve(intent.id);
      }

      // Log action
      await this.actionRepository.log(
        userId,
        request.agentId,
        request.mandateId,
        'create_intent',
        'intent',
        intent.id,
        {
          itemCount: request.items.length,
          total,
          reasoning: request.reasoning,
          autoApproved: shouldAutoApprove,
        },
        true
      );

      return intent;
    } catch (error) {
      // Log failure
      await this.actionRepository.log(
        userId,
        request.agentId,
        request.mandateId,
        'create_intent',
        'intent',
        null,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        false,
        error instanceof Error ? error.message : undefined
      );

      throw error;
    }
  }

  async approveIntent(userId: string, intentId: string): Promise<PurchaseIntent> {
    const intent = await this.intentRepository.getById(intentId);

    if (!intent || intent.userId !== userId) {
      throw new Error('Intent not found');
    }

    if (intent.status !== 'pending') {
      throw new Error('Intent is not pending');
    }

    if (new Date() > new Date(intent.expiresAt)) {
      await this.intentRepository.execute(intentId);
      throw new Error('Intent has expired');
    }

    return await this.intentRepository.approve(intentId);
  }

  async rejectIntent(userId: string, intentId: string, reason: string): Promise<PurchaseIntent> {
    const intent = await this.intentRepository.getById(intentId);

    if (!intent || intent.userId !== userId) {
      throw new Error('Intent not found');
    }

    if (intent.status !== 'pending') {
      throw new Error('Intent is not pending');
    }

    return await this.intentRepository.reject(intentId, reason);
  }

  async agentExecutePayment(userId: string, request: AgentPaymentRequest): Promise<any> {
    try {
      // Validate mandate
      const mandate = await this.mandateService.validateMandateAccess(
        request.mandateId,
        request.agentId,
        MandateType.PAYMENT
      );

      // If intentId provided, validate and use it
      if (request.intentId) {
        const intent = await this.intentRepository.getById(request.intentId);

        if (!intent || intent.userId !== userId) {
          throw new Error('Intent not found');
        }

        if (intent.status !== 'approved') {
          throw new Error('Intent must be approved before payment');
        }

        if (new Date() > new Date(intent.expiresAt)) {
          throw new Error('Intent has expired');
        }

        // Execute payment using intent
        const paymentRequest = {
          cartId: userId, // Using userId as cartId for now
          paymentMethod: request.paymentMethod as any,
          cardDetails: request.cardDetails,
          paypalDetails: request.paypalDetails,
        };

        const result = await this.paymentService.processPayment(userId, paymentRequest);

        // Mark intent as executed
        await this.intentRepository.execute(request.intentId);

        // Log success
        await this.actionRepository.log(
          userId,
          request.agentId,
          request.mandateId,
          'execute_payment',
          'payment',
          result.payment.id,
          {
            intentId: request.intentId,
            amount: result.payment.amount,
            reasoning: request.reasoning,
          },
          true
        );

        return result;
      } else {
        throw new Error('Payment mandate requires approved intent');
      }
    } catch (error) {
      // Log failure
      await this.actionRepository.log(
        userId,
        request.agentId,
        request.mandateId,
        'execute_payment',
        'payment',
        null,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        false,
        error instanceof Error ? error.message : undefined
      );

      throw error;
    }
  }

  async getUserIntents(userId: string, status?: string): Promise<PurchaseIntent[]> {
    return await this.intentRepository.getUserIntents(userId, status);
  }

  async getAgentActions(userId: string, agentId?: string, limit?: number): Promise<any[]> {
    return await this.actionRepository.getAgentActions(userId, agentId, limit);
  }
}
