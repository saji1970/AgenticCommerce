import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import {
  SignedMandate,
  IntentMandate,
  CartMandate,
  CreateIntentMandateRequest,
  CreateCartMandateRequest,
} from '@agentic-commerce/shared';
import {
  MandateManager,
  MandateAuditLogger,
  PostgresAuditStore,
} from '@agentic-commerce/ap2-mandate';
import { PaymentService } from '@agentic-commerce/payment';

export class MandateController {
  private mandateManager: MandateManager;
  private auditLogger: MandateAuditLogger;
  private pool: Pool;
  private paymentService: PaymentService;

  constructor(
    mandateManager: MandateManager,
    pool: Pool,
    paymentService: PaymentService
  ) {
    this.mandateManager = mandateManager;
    this.pool = pool;
    this.paymentService = paymentService;

    // Initialize audit logger
    const auditStore = new PostgresAuditStore(pool);
    this.auditLogger = new MandateAuditLogger(auditStore);
  }

  /**
   * Create Intent Mandate
   * POST /api/v1/mandates/intent
   */
  createIntentMandate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const request: CreateIntentMandateRequest = {
        user_id: userId,
        request: req.body.request,
        max_price: req.body.max_price,
        min_price: req.body.min_price,
        time_limit_hours: req.body.time_limit_hours || 24,
        approved_merchants: req.body.approved_merchants,
        blocked_merchants: req.body.blocked_merchants,
        categories: req.body.categories,
      };

      // Create signed mandate
      const signedMandate = this.mandateManager.createIntentMandate(request);

      // Save to database
      await this.saveIntentMandate(signedMandate);

      // Log audit event
      await this.auditLogger.logIntentMandateCreated(signedMandate, {
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        data: signedMandate,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create Cart Mandate
   * POST /api/v1/mandates/cart
   */
  createCartMandate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const request: CreateCartMandateRequest = {
        user_id: userId,
        intent_mandate_id: req.body.intent_mandate_id,
        items: req.body.items,
        total_price: req.body.total_price,
        merchant: req.body.merchant,
        payment_method_id: req.body.payment_method_id,
        shipping_address: req.body.shipping_address,
      };

      // Get intent mandate for validation
      const intentMandate = await this.getIntentMandateById(request.intent_mandate_id);
      if (!intentMandate) {
        res.status(404).json({
          success: false,
          error: 'Intent Mandate not found',
        });
        return;
      }

      // Create signed cart mandate
      const cartMandate = this.mandateManager.createCartMandate(request);

      // Validate against intent mandate
      const validation = this.mandateManager.validateCartAgainstIntent(
        cartMandate,
        intentMandate
      );

      if (!validation.is_valid) {
        res.status(400).json({
          success: false,
          error: 'Cart Mandate validation failed',
          violations: validation.errors,
        });
        return;
      }

      // Save to database
      await this.saveCartMandate(cartMandate);

      // Log audit event
      await this.auditLogger.logCartMandateCreated(cartMandate, {
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        data: cartMandate,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Process AP2 Payment
   * POST /api/v1/mandates/process-payment
   */
  processPayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { cart_mandate_id, payment_method_id } = req.body;

      // Get cart mandate
      const cartMandate = await this.getCartMandateById(cart_mandate_id);
      if (!cartMandate) {
        res.status(404).json({
          success: false,
          error: 'Cart Mandate not found',
        });
        return;
      }

      // Verify user owns the mandate
      if (cartMandate.mandate.user_id !== userId) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // Verify mandate signature
      const verification = this.mandateManager.verifyMandate(cartMandate);
      if (!verification.is_valid) {
        res.status(400).json({
          success: false,
          error: 'Invalid mandate signature',
          details: verification.errors,
        });
        return;
      }

      // Process payment through AP2
      const result = await this.paymentService.processAP2Payment(
        cartMandate,
        payment_method_id
      );

      // Save transaction to database
      await this.saveAP2Transaction(result);

      // Log audit event
      await this.auditLogger.logMandateExecuted(
        cartMandate.mandate.mandate_id,
        'cart',
        userId,
        result.transaction_id,
        result.amount,
        result.status === 'success' ? 'success' : 'failed'
      );

      // Update mandate status
      if (result.status === 'success') {
        await this.updateMandateStatus(cart_mandate_id, 'completed');
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get Intent Mandate
   * GET /api/v1/mandates/intent/:mandateId
   */
  getIntentMandate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { mandateId } = req.params;

      const mandate = await this.getIntentMandateById(mandateId);
      if (!mandate) {
        res.status(404).json({
          success: false,
          error: 'Mandate not found',
        });
        return;
      }

      // Verify user owns the mandate
      if (mandate.mandate.user_id !== userId) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      res.json({
        success: true,
        data: mandate,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user's mandates
   * GET /api/v1/mandates/user
   */
  getUserMandates = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { type, status } = req.query;

      const query = `
        SELECT * FROM ${type === 'cart' ? 'cart_mandates' : 'intent_mandates'}
        WHERE user_id = $1
        ${status ? 'AND status = $2' : ''}
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const values = status ? [userId, status] : [userId];
      const result = await this.pool.query(query, values);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Revoke mandate
   * POST /api/v1/mandates/:mandateId/revoke
   */
  revokeMandate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { mandateId } = req.params;
      const { reason } = req.body;

      // Get mandate
      let mandate = await this.getIntentMandateById(mandateId);
      let mandateType: 'intent' | 'cart' = 'intent';

      if (!mandate) {
        mandate = await this.getCartMandateById(mandateId);
        mandateType = 'cart';
      }

      if (!mandate) {
        res.status(404).json({
          success: false,
          error: 'Mandate not found',
        });
        return;
      }

      // Verify user owns the mandate
      if (mandate.mandate.user_id !== userId) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // Revoke mandate
      const revokedMandate = this.mandateManager.revokeMandate(mandate);

      // Update database
      await this.updateMandateStatus(mandateId, 'revoked');

      // Log audit event
      await this.auditLogger.logMandateRevoked(mandateId, mandateType, userId, reason);

      res.json({
        success: true,
        data: revokedMandate,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get mandate audit trail
   * GET /api/v1/mandates/:mandateId/audit
   */
  getAuditTrail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { mandateId } = req.params;

      const events = await this.auditLogger.getMandateAuditTrail(mandateId);

      // Verify user owns at least one event
      if (events.length > 0 && events[0].user_id !== userId) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  };

  // Private helper methods

  private async saveIntentMandate(mandate: SignedMandate<IntentMandate>): Promise<void> {
    const query = `
      INSERT INTO intent_mandates (
        mandate_id, user_id, request, max_price, min_price, valid_until,
        approved_merchants, blocked_merchants, categories, shipping_constraints,
        status, signature, public_key, algorithm, signed_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `;

    const values = [
      mandate.mandate.mandate_id,
      mandate.mandate.user_id,
      mandate.mandate.request,
      mandate.mandate.constraints.max_price,
      mandate.mandate.constraints.min_price || null,
      mandate.mandate.constraints.valid_until,
      mandate.mandate.constraints.approved_merchants || null,
      mandate.mandate.constraints.blocked_merchants || null,
      mandate.mandate.constraints.categories || null,
      mandate.mandate.constraints.shipping_constraints
        ? JSON.stringify(mandate.mandate.constraints.shipping_constraints)
        : null,
      mandate.mandate.status,
      mandate.signature,
      mandate.public_key,
      mandate.algorithm,
      mandate.signed_at,
      mandate.mandate.metadata ? JSON.stringify(mandate.mandate.metadata) : null,
    ];

    await this.pool.query(query, values);
  }

  private async saveCartMandate(mandate: SignedMandate<CartMandate>): Promise<void> {
    const query = `
      INSERT INTO cart_mandates (
        mandate_id, user_id, intent_mandate_id, items, total_price,
        merchant_id, merchant_name, merchant_info, payment_method_id,
        shipping_address, status, signature, public_key, algorithm, signed_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `;

    const values = [
      mandate.mandate.mandate_id,
      mandate.mandate.user_id,
      mandate.mandate.intent_mandate_id,
      JSON.stringify(mandate.mandate.items),
      mandate.mandate.total_price,
      mandate.mandate.merchant.merchant_id,
      mandate.mandate.merchant.name,
      JSON.stringify(mandate.mandate.merchant),
      mandate.mandate.payment_method_id || null,
      mandate.mandate.shipping_address ? JSON.stringify(mandate.mandate.shipping_address) : null,
      mandate.mandate.status,
      mandate.signature,
      mandate.public_key,
      mandate.algorithm,
      mandate.signed_at,
      mandate.mandate.metadata ? JSON.stringify(mandate.mandate.metadata) : null,
    ];

    await this.pool.query(query, values);
  }

  private async getIntentMandateById(
    mandateId: string
  ): Promise<SignedMandate<IntentMandate> | null> {
    const query = 'SELECT * FROM intent_mandates WHERE mandate_id = $1';
    const result = await this.pool.query(query, [mandateId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      mandate: {
        mandate_id: row.mandate_id,
        mandate_type: 'intent',
        user_id: row.user_id,
        request: row.request,
        constraints: {
          max_price: parseFloat(row.max_price),
          min_price: row.min_price ? parseFloat(row.min_price) : undefined,
          valid_until: row.valid_until,
          approved_merchants: row.approved_merchants,
          blocked_merchants: row.blocked_merchants,
          categories: row.categories,
          shipping_constraints: row.shipping_constraints,
        },
        created_at: row.created_at,
        status: row.status,
        metadata: row.metadata,
      },
      signature: row.signature,
      public_key: row.public_key,
      algorithm: row.algorithm,
      signed_at: row.signed_at,
    };
  }

  private async getCartMandateById(
    mandateId: string
  ): Promise<SignedMandate<CartMandate> | null> {
    const query = 'SELECT * FROM cart_mandates WHERE mandate_id = $1';
    const result = await this.pool.query(query, [mandateId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      mandate: {
        mandate_id: row.mandate_id,
        mandate_type: 'cart',
        user_id: row.user_id,
        intent_mandate_id: row.intent_mandate_id,
        items: row.items,
        total_price: parseFloat(row.total_price),
        merchant: row.merchant_info,
        payment_method_id: row.payment_method_id,
        shipping_address: row.shipping_address,
        created_at: row.created_at,
        status: row.status,
        metadata: row.metadata,
      },
      signature: row.signature,
      public_key: row.public_key,
      algorithm: row.algorithm,
      signed_at: row.signed_at,
    };
  }

  private async saveAP2Transaction(result: any): Promise<void> {
    const query = `
      INSERT INTO ap2_transactions (
        transaction_id, mandate_id, user_id, status, amount, currency,
        merchant_id, merchant_name, receipt_url, error_code, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      result.transaction_id,
      result.mandate_id,
      result.merchant.merchant_id, // Using merchant_id as user_id placeholder
      result.status,
      result.amount,
      result.currency,
      result.merchant.merchant_id,
      result.merchant.name,
      result.receipt_url || null,
      result.error?.code || null,
      result.error?.message || null,
    ];

    await this.pool.query(query, values);
  }

  private async updateMandateStatus(
    mandateId: string,
    status: string
  ): Promise<void> {
    // Try updating intent mandate first
    let query = 'UPDATE intent_mandates SET status = $1 WHERE mandate_id = $2';
    let result = await this.pool.query(query, [status, mandateId]);

    // If no rows affected, try cart mandate
    if (result.rowCount === 0) {
      query = 'UPDATE cart_mandates SET status = $1 WHERE mandate_id = $2';
      await this.pool.query(query, [status, mandateId]);
    }
  }
}
