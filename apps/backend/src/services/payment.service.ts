import { CartRepository } from '../repositories/cart.repository';
import { OrderRepository } from '../repositories/order.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentGatewayService } from './payment-gateway.service';
import {
  PaymentRequest,
  PaymentResponse,
  PaymentStatus,
  OrderHistoryResponse,
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

  async processPayment(userId: string, paymentRequest: PaymentRequest): Promise<PaymentResponse> {
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
      parseFloat(total.toFixed(2))
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
      }
    );

    try {
      // Update payment status to processing
      await this.paymentRepository.updatePaymentStatus(payment.id, PaymentStatus.PROCESSING);

      // Process payment through gateway
      const paymentResult = await this.paymentGateway.processPayment(
        order.total,
        paymentRequest.paymentMethod,
        paymentRequest.cardDetails,
        paymentRequest.paypalDetails
      );

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
