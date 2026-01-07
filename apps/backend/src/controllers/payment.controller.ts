import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  processPayment = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const paymentRequest = req.body;

      const result = await this.paymentService.processPayment(userId, paymentRequest);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment',
      });
    }
  };

  getOrderHistory = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.paymentService.getOrderHistory(userId, page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error getting order history:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get order history',
      });
    }
  };

  getOrderById = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { orderId } = req.params;

      const result = await this.paymentService.getOrderById(userId, orderId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error getting order:', error);
      res.status(error instanceof Error && error.message === 'Order not found' ? 404 : 500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get order',
      });
    }
  };
}
