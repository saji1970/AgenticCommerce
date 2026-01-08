import { Request, Response, NextFunction } from 'express';
import { MerchantRepository } from '../repositories/merchant.repository';
import { AP2ErrorCode } from '@agentic-commerce/shared-types';
import crypto from 'crypto';

// Extend Request type to include merchant
export interface AP2Request extends Request {
  merchant?: any;
  merchantId?: string;
}

export class AP2AuthMiddleware {
  private merchantRepository: MerchantRepository;

  constructor() {
    this.merchantRepository = new MerchantRepository();
  }

  /**
   * Authenticate merchant using API key
   */
  authenticateApiKey = async (
    req: AP2Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const apiKey = req.headers['x-ap2-api-key'] as string;

      if (!apiKey) {
        res.status(401).json({
          error: {
            code: AP2ErrorCode.INVALID_API_KEY,
            message: 'API key is required',
          },
        });
        return;
      }

      // Get merchant by API key
      const merchant = await this.merchantRepository.getByApiKey(apiKey);

      if (!merchant) {
        res.status(401).json({
          error: {
            code: AP2ErrorCode.INVALID_API_KEY,
            message: 'Invalid API key',
          },
        });
        return;
      }

      // Check merchant status
      if (merchant.status !== 'active') {
        res.status(403).json({
          error: {
            code: AP2ErrorCode.MERCHANT_SUSPENDED,
            message: `Merchant is ${merchant.status}`,
          },
        });
        return;
      }

      // Attach merchant to request
      req.merchant = merchant;
      req.merchantId = merchant.id;

      next();
    } catch (error) {
      console.error('Error authenticating API key:', error);
      res.status(500).json({
        error: {
          code: AP2ErrorCode.INVALID_API_KEY,
          message: 'Authentication failed',
        },
      });
    }
  };

  /**
   * Verify HMAC signature for request
   */
  verifySignature = async (
    req: AP2Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const signature = req.headers['x-ap2-signature'] as string;
      const timestamp = req.headers['x-ap2-timestamp'] as string;

      if (!signature || !timestamp) {
        res.status(401).json({
          error: {
            code: AP2ErrorCode.INVALID_SIGNATURE,
            message: 'Signature and timestamp headers are required',
          },
        });
        return;
      }

      // Check timestamp for replay protection (within 5 minutes)
      const now = Date.now();
      const requestTime = parseInt(timestamp);
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (Math.abs(now - requestTime) > maxAge) {
        res.status(401).json({
          error: {
            code: AP2ErrorCode.EXPIRED_REQUEST,
            message: 'Request timestamp expired',
          },
        });
        return;
      }

      // Verify signature
      const merchant = req.merchant;
      if (!merchant) {
        res.status(401).json({
          error: {
            code: AP2ErrorCode.INVALID_API_KEY,
            message: 'Merchant not authenticated',
          },
        });
        return;
      }

      const payload = `${timestamp}.${JSON.stringify(req.body)}`;
      const expectedSignature = crypto
        .createHmac('sha256', merchant.apiSecret)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature) {
        res.status(401).json({
          error: {
            code: AP2ErrorCode.INVALID_SIGNATURE,
            message: 'Invalid signature',
          },
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error verifying signature:', error);
      res.status(500).json({
        error: {
          code: AP2ErrorCode.INVALID_SIGNATURE,
          message: 'Signature verification failed',
        },
      });
    }
  };

  /**
   * Combined middleware: API key + signature verification
   */
  authenticate = async (
    req: AP2Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.authenticateApiKey(req, res, async () => {
      if (!res.headersSent) {
        await this.verifySignature(req, res, next);
      }
    });
  };
}

// Create singleton instance
const ap2AuthMiddleware = new AP2AuthMiddleware();

export const authenticateAP2 = ap2AuthMiddleware.authenticate;
export const authenticateAP2ApiKey = ap2AuthMiddleware.authenticateApiKey;
export const verifyAP2Signature = ap2AuthMiddleware.verifySignature;
