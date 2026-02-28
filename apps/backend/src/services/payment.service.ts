import { CartRepository } from '../repositories/cart.repository';
import { OrderRepository } from '../repositories/order.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentGatewayService } from './payment-gateway.service';
import { mandateServiceClient } from '../clients/mandate-service.client';
import { executeWithToken as vrpExecuteWithToken } from '../clients/payment-gateway.client';
import {
  PaymentRequest,
  PaymentResponse,
  PaymentStatus,
  OrderHistoryResponse,
  PaymentMethod,
} from '@agentic-commerce/shared-types';

export class PaymentService {
  private cartRepository: CartRepository;
  private orderRepository: OrderRepository;
  private paymentRepository: PaymentRepository;
  private paymentGateway: PaymentGatewayService;

  constructor() {
    this.cartRepository = new CartRepository();
    this.orderRepository = new OrderRepository();
    this.paymentRepository = new PaymentRepository();
    this.paymentGateway = new PaymentGatewayService();
  }

  async processPayment(userId: string, paymentRequest: PaymentRequest & { mandateToken?: string }, authHeader?: string): Promise<PaymentResponse> {
    // Get cart items
    const cartItems = await this.cartRepository.getUserCart(userId);

    if (cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => {
      const variantPrice = item.variants?.reduce((vSum, v) => vSum + (v.priceModifier || 0), 0) || 0;
      return sum + (item.price + variantPrice) * item.quantity;
    }, 0);

    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    // Validate mandate token if provided
    if (paymentRequest.mandateToken) {
      const cartData = {
        items: cartItems.map(item => ({
          productId: item.productId,
          name: item.productName,
          price: item.price,
          quantity: item.quantity,
        })),
        total: parseFloat(total.toFixed(2)),
      };

      try {
        const validation = await mandateServiceClient.validateMandateToken(
          paymentRequest.mandateToken,
          cartData
        );

        if (!validation.valid) {
          const errorMsg = validation.errors?.join(', ') || 'Mandate token validation failed';
          throw new Error(`Mandate validation failed: ${errorMsg}`);
        }

        console.log('[PaymentService] Mandate token validated successfully for mandate:', validation.mandate?.id);
      } catch (error: any) {
        // If it's our own thrown error, re-throw
        if (error.message?.startsWith('Mandate validation failed')) {
          throw error;
        }
        // For network/service errors, log warning but don't block payment
        console.warn('[PaymentService] Mandate token validation error (proceeding):', error.message);
      }
    }

    // Collect mandate tokens from each cart item for audit trail
    const mandateTokens: Array<{ mandateId: string; mandateToken: string; productId?: string }> = [];
    for (const item of cartItems) {
      if (item.mandateId && item.mandateToken) {
        mandateTokens.push({
          mandateId: item.mandateId,
          mandateToken: item.mandateToken,
          productId: item.productId,
        });
      }
    }

    // Include payment mandate token from request if provided
    if (paymentRequest.mandateToken) {
      mandateTokens.push({
        mandateId: 'payment-mandate',
        mandateToken: paymentRequest.mandateToken,
      });
    }

    // Include explicit mandateTokens from request if provided
    if (paymentRequest.mandateTokens) {
      for (const entry of paymentRequest.mandateTokens) {
        if (!mandateTokens.find(t => t.mandateId === entry.mandateId)) {
          mandateTokens.push(entry);
        }
      }
    }

    // Create order
    const orderItems = cartItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      quantity: item.quantity,
      price: item.price,
      variants: item.variants?.map(v => ({
        name: v.name,
        value: v.value,
      })),
    }));

    const order = await this.orderRepository.createOrder(
      userId,
      orderItems,
      parseFloat(subtotal.toFixed(2)),
      parseFloat(tax.toFixed(2)),
      parseFloat(total.toFixed(2)),
      mandateTokens.length > 0 ? mandateTokens : undefined
    );

    // Create payment record
    const payment = await this.paymentRepository.createPayment(
      order.id,
      userId,
      order.total,
      paymentRequest.paymentMethod,
      paymentRequest.billingAddress,
      {
        cardLast4: paymentRequest.cardDetails?.cardNumber.slice(-4),
        paypalEmail: paymentRequest.paypalDetails?.email,
      },
      mandateTokens.length > 0 ? mandateTokens : undefined
    );

    try {
      // Update payment status to processing
      await this.paymentRepository.updatePaymentStatus(payment.id, PaymentStatus.PROCESSING);

      let paymentResult: { success: boolean; transactionId?: string; errorMessage?: string };

      // VRP mandate flow: use consent token via payment gateway
      if (paymentRequest.paymentMethod === PaymentMethod.VRP_MANDATE && paymentRequest.vrpConsentToken && authHeader) {
        const vrpResult = await vrpExecuteWithToken(
          {
            consentToken: paymentRequest.vrpConsentToken,
            amount: order.total,
            currency: 'USD',
            description: `Order ${order.id}`,
            cartId: order.id,
            productInfo: { orderId: order.id, itemCount: orderItems.length },
          },
          authHeader
        );
        paymentResult = {
          success: true,
          transactionId: vrpResult.gatewayResult?.transactionId || vrpResult.transaction?.transactionId,
        };
      } else {
        // Legacy: card or PayPal via mock gateway
        paymentResult = await this.paymentGateway.processPayment(
          order.total,
          paymentRequest.paymentMethod,
          paymentRequest.cardDetails,
          paymentRequest.paypalDetails
        );
      }

      if (paymentResult.success) {
        // Update payment status to succeeded
        const updatedPayment = await this.paymentRepository.updatePaymentStatus(
          payment.id,
          PaymentStatus.SUCCEEDED,
          paymentResult.transactionId
        );

        // Update order status to confirmed
        await this.orderRepository.updateOrderStatus(order.id, 'confirmed');
        await this.orderRepository.updateOrderPaymentId(order.id, payment.id);

        // Clear cart
        await this.cartRepository.clearUserCart(userId);

        return {
          payment: updatedPayment,
          order: await this.orderRepository.getOrderById(order.id) as any,
        };
      } else {
        // Update payment status to failed
        const updatedPayment = await this.paymentRepository.updatePaymentStatus(
          payment.id,
          PaymentStatus.FAILED,
          undefined,
          paymentResult.errorMessage
        );

        // Update order status to cancelled
        await this.orderRepository.updateOrderStatus(order.id, 'cancelled');

        throw new Error(paymentResult.errorMessage || 'Payment failed');
      }
    } catch (error) {
      // Update payment status to failed
      await this.paymentRepository.updatePaymentStatus(
        payment.id,
        PaymentStatus.FAILED,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );

      // Update order status to cancelled
      await this.orderRepository.updateOrderStatus(order.id, 'cancelled');

      throw error;
    }
  }

  async getOrderHistory(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<OrderHistoryResponse> {
    const offset = (page - 1) * limit;
    const orders = await this.orderRepository.getUserOrders(userId, limit, offset);
    const total = await this.orderRepository.getUserOrdersCount(userId);

    return {
      orders,
      total,
      page,
      limit,
    };
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await this.orderRepository.getOrderById(orderId);

    if (!order || order.userId !== userId) {
      throw new Error('Order not found');
    }

    const payment = order.paymentId
      ? await this.paymentRepository.getPaymentById(order.paymentId)
      : null;

    return {
      order,
      payment,
    };
  }
}
