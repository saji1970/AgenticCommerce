import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config/env';

const router = Router();
const PAYMENT_GATEWAY_URL = config.paymentGateway.url.replace(/\/$/, '');
const TARGET_BASE = `${PAYMENT_GATEWAY_URL}/api/vrp`;

console.log(`[VRP Proxy] Configured to forward to: ${PAYMENT_GATEWAY_URL}`);
console.log(`[VRP Proxy] VRP target base: ${TARGET_BASE}`);

/**
 * Health check: test connectivity to payment gateway
 */
router.get('/_health', async (_req: Request, res: Response) => {
  try {
    const healthUrl = `${PAYMENT_GATEWAY_URL}/health`;
    console.log(`[VRP Proxy] Health check -> ${healthUrl}`);
    const response = await axios.get(healthUrl, { timeout: 5000, validateStatus: () => true });
    res.json({
      success: true,
      paymentGatewayUrl: PAYMENT_GATEWAY_URL,
      healthStatus: response.status,
      healthData: response.data,
    });
  } catch (err: any) {
    console.error('[VRP Proxy] Health check failed:', err.code, err.message);
    res.status(502).json({
      success: false,
      paymentGatewayUrl: PAYMENT_GATEWAY_URL,
      error: err.message,
      code: err.code,
      hint: err.code === 'ENOTFOUND'
        ? 'DNS resolution failed. Check that the payment-gateway service name matches and private networking is enabled in Railway.'
        : err.code === 'ECONNREFUSED'
        ? 'Connection refused. The payment-gateway service may not be running or the port may be wrong. Check that PORT matches the URL.'
        : 'Could not reach payment gateway. Verify the service is running and the URL is correct.',
    });
  }
});

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

    // If payment gateway returns 401 "Invalid or expired token", JWT_SECRET likely doesn't match backend
    if (response.status === 401 && typeof response.data?.error === 'string' && response.data.error.includes('token')) {
      console.warn('[VRP Proxy] Payment gateway rejected token. Ensure PAYMENT_GATEWAY JWT_SECRET equals BACKEND JWT_SECRET in Railway.');
    }
    if (response.status >= 500) {
      console.error('[VRP Proxy] Payment gateway error:', response.status, response.data?.error || response.data);
    }

    res.status(response.status).json(response.data);
  } catch (err: any) {
    const errCode = err.code || 'UNKNOWN';
    const errMsg = err.message || 'No error message';
    console.error(`[VRP Proxy] ${req.method} ${fullUrl} failed: code=${errCode} message=${errMsg}`);
    if (err.cause) {
      console.error(`[VRP Proxy] Cause:`, err.cause.code || err.cause.message || err.cause);
    }

    const status = err.response?.status || 502;
    let message = err.response?.data?.error;
    if (typeof message !== 'string' || !message || message === 'Error') {
      // Build a helpful error from the network error
      if (errCode === 'ENOTFOUND') {
        message = `Payment gateway DNS resolution failed for ${PAYMENT_GATEWAY_URL}. Ensure the service name is correct and Railway private networking is enabled.`;
      } else if (errCode === 'ECONNREFUSED') {
        message = `Payment gateway refused connection at ${PAYMENT_GATEWAY_URL}. Ensure the service is running and the port matches.`;
      } else if (errCode === 'ECONNABORTED' || errCode === 'ETIMEDOUT') {
        message = `Payment gateway timed out at ${PAYMENT_GATEWAY_URL}. The service may be overloaded or unreachable.`;
      } else {
        message = `Payment gateway unavailable (${PAYMENT_GATEWAY_URL}, code=${errCode}). Ensure the service is running.`;
      }
    }
    res.status(status).json({
      success: false,
      error: message,
    });
  }
});

export default router;
