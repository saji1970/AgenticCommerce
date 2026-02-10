import { Request, Response } from 'express';
import { MandateService } from '../services/mandate.service';
import { paymentGatewayService } from '../services/payment-gateway.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AIAgentAppRepository } from '../repositories/ai-agent-app.repository';

export class PaymentController {
  private mandateService: MandateService;
  private transactionRepo: TransactionRepository;
  private agentRepo: AIAgentAppRepository;

  constructor() {
    this.mandateService = new MandateService();
    this.transactionRepo = new TransactionRepository();
    this.agentRepo = new AIAgentAppRepository();
  }

  /**
   * Process payment through the payment gateway
   * First validates the mandate, then processes the payment
   */
  processPayment = async (req: Request, res: Response) => {
    try {
      const { userId, agentId, mandateId, amount, currency, paymentMethod, cardDetails, paypalDetails, metadata } = req.body;

      // Validate required fields
      if (!userId || !agentId || !mandateId || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, agentId, mandateId, amount',
        });
      }

      // Validate mandate first
      try {
        const mandate = await this.mandateService.validateMandateForTransaction(
          userId,
          agentId,
          'payment',
          amount
        );

        if (mandate.id !== mandateId) {
          return res.status(400).json({
            success: false,
            error: 'Mandate ID does not match validated mandate',
          });
        }
      } catch (mandateError: any) {
        return res.status(400).json({
          success: false,
          error: `Mandate validation failed: ${mandateError.message}`,
        });
      }

      // Resolve merchant_id from agent
      let merchantId: string | undefined;
      try {
        const agentApp = await this.agentRepo.getByAgentId(agentId);
        if (agentApp?.merchant_id) {
          merchantId = agentApp.merchant_id;
        }
      } catch {
        // Non-critical: continue without merchant_id
      }

      // Process payment through gateway
      const paymentResult = await paymentGatewayService.processPayment({
        amount,
        currency: currency || 'USD',
        paymentMethod,
        cardDetails,
        paypalDetails,
        metadata: {
          ...metadata,
          userId,
          agentId,
          mandateId,
        },
      });

      // Record transaction in DB (both success and failure)
      try {
        await this.transactionRepo.create({
          mandateId,
          userId,
          agentId,
          merchantId,
          type: 'payment',
          status: paymentResult.success ? 'completed' : 'failed',
          amount,
          currency: currency || 'USD',
          gatewayTransactionId: paymentResult.transactionId,
          gatewayResponse: paymentResult as any,
          metadata,
          errorMessage: paymentResult.success ? undefined : paymentResult.error,
          processedAt: paymentResult.success ? new Date() : undefined,
        });
      } catch (dbError) {
        console.error('Failed to record transaction in DB:', dbError);
        // Don't break payment response on DB failure
      }

      if (!paymentResult.success) {
        return res.status(400).json({
          success: false,
          error: paymentResult.error || 'Payment processing failed',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          transactionId: paymentResult.transactionId,
          status: paymentResult.status,
          amount: paymentResult.amount,
          currency: paymentResult.currency,
          processedAt: paymentResult.processedAt,
          gateway: paymentResult.gateway,
        },
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment',
      });
    }
  };
}
