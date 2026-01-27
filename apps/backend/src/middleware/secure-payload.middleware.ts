/**
 * Secure Payload Middleware
 * Decrypts and verifies secure payloads from the mandate app.
 *
 * When X-Secure-Payload header is present:
 * 1. Look up client certificate by fingerprint
 * 2. Verify signature
 * 3. Decrypt payload
 * 4. Replace req.body with decrypted data
 */

import { Request, Response, NextFunction } from 'express';
import { cryptoService, SecurePayload } from '../services/crypto.service';
import { certificateStoreService, StoredCertificate } from '../services/certificate-store.service';

// Extend Express Request to include certificate info
declare global {
  namespace Express {
    interface Request {
      certificateInfo?: StoredCertificate;
      isSecurePayload?: boolean;
      isTestMode?: boolean;
    }
  }
}

/**
 * Middleware to handle secure payloads
 * Automatically decrypts and verifies payloads when X-Secure-Payload header is present
 */
export const securePayloadMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check if this is a secure payload
  const isSecurePayload = req.headers['x-secure-payload'] === 'true';

  if (!isSecurePayload) {
    // Not a secure payload, continue normally
    return next();
  }

  try {
    // Get certificate fingerprint from header
    const fingerprint = req.headers['x-certificate-fingerprint'] as string;
    const isTestMode = req.headers['x-test-mode'] === 'true';

    if (!fingerprint) {
      console.warn('[SecurePayload] Missing certificate fingerprint');
      return res.status(400).json({
        success: false,
        error: { message: 'Missing certificate fingerprint' },
      });
    }

    // Validate request body is a secure payload
    const securePayload = req.body as SecurePayload;
    if (!securePayload.encryptedData || !securePayload.signature) {
      console.warn('[SecurePayload] Invalid secure payload structure');
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid secure payload structure' },
      });
    }

    // Look up client certificate by fingerprint
    const clientCert = await certificateStoreService.getCertificateByFingerprint(fingerprint);

    if (!clientCert && !cryptoService.isTestMode(fingerprint)) {
      console.warn('[SecurePayload] Certificate not found:', fingerprint);
      return res.status(401).json({
        success: false,
        error: { message: 'Certificate not found' },
      });
    }

    // Get public key for signature verification
    const publicKey = clientCert?.publicKeyPem || '';

    // Verify signature
    const verifyResult = cryptoService.verifySignature(securePayload, publicKey);

    if (!verifyResult.valid) {
      console.warn('[SecurePayload] Signature verification failed:', verifyResult.error);
      return res.status(401).json({
        success: false,
        error: { message: verifyResult.error || 'Invalid signature' },
      });
    }

    // Decrypt payload
    const decryptResult = cryptoService.decryptPayload(securePayload);

    if (!decryptResult.success) {
      console.warn('[SecurePayload] Decryption failed:', decryptResult.error);
      return res.status(400).json({
        success: false,
        error: { message: decryptResult.error || 'Decryption failed' },
      });
    }

    // Replace body with decrypted data
    req.body = decryptResult.data;

    // Attach certificate info to request
    req.certificateInfo = clientCert || undefined;
    req.isSecurePayload = true;
    req.isTestMode = isTestMode || cryptoService.isTestMode(fingerprint);

    console.log('[SecurePayload] Successfully decrypted payload from certificate:', fingerprint.substring(0, 20) + '...');

    next();
  } catch (error) {
    console.error('[SecurePayload] Error processing secure payload:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to process secure payload' },
    });
  }
};

/**
 * Optional middleware for routes that require secure payloads
 * Returns 401 if payload is not secure
 */
export const requireSecurePayload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.isSecurePayload) {
    return res.status(401).json({
      success: false,
      error: { message: 'Secure payload required' },
    });
  }
  next();
};

/**
 * Optional middleware that warns about non-secure payloads but allows them
 * Useful for gradual migration
 */
export const warnInsecurePayload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.isSecurePayload) {
    console.warn('[SecurePayload] WARNING: Received insecure payload for', req.method, req.path);
  }
  next();
};

/**
 * Middleware to reject test mode in production
 */
export const rejectTestModeInProduction = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (process.env.NODE_ENV === 'production' && req.isTestMode) {
    console.warn('[SecurePayload] Rejecting test mode certificate in production');
    return res.status(401).json({
      success: false,
      error: { message: 'Test certificates not allowed in production' },
    });
  }
  next();
};
