import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config/env';

const router = Router();
const PAYMENT_GATEWAY_URL = config.paymentGateway.url.replace(/\/$/, '');
const TARGET_BASE = `${PAYMENT_GATEWAY_URL}/api/vrp`;

/**
 * Proxy all /api/vrp/* requests to the payment gateway.
 * This allows the mobile/mandate apps to use the backend URL for VRP
 * instead of requiring a separate payment-gateway URL (which may 404 if
 * not deployed or misconfigured).
 */
router.all('*', async (req: Request, res: Response) => {
  if (!PAYMENT_GATEWAY_URL || PAYMENT_GATEWAY_URL === 'http://localhost:3002') {
    console.warn('[VRP Proxy] PAYMENT_GATEWAY_URL not set or is localhost - VRP may not work in production');
  }
  const path = req.path === '/' ? '' : req.path;
  const targetUrl = `${TARGET_BASE}${path}`;
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const fullUrl = `${targetUrl}${query}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': req.headers['content-type'] || 'application/json',
    };
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }
    if (req.headers['x-api-key']) {
      headers['X-Api-Key'] = req.headers['x-api-key'] as string;
    }
    if (req.headers['x-agent-id']) {
      headers['X-Agent-Id'] = req.headers['x-agent-id'] as string;
    }

    const response = await axios({
      method: req.method,
      url: fullUrl,
      data: req.body,
      headers,
      validateStatus: () => true, // Don't throw on 4xx/5xx
      timeout: 30000,
    });

    res.status(response.status).json(response.data);
  } catch (err: any) {
    console.error('[VRP Proxy] Error forwarding to payment gateway:', err.message);
    const status = err.response?.status || 502;
    const message = err.response?.data?.error || err.message || 'Payment gateway unavailable';
    res.status(status).json({
      success: false,
      error: message,
    });
  }
});

export default router;
