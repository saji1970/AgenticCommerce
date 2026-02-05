import { z } from 'zod';

export const RegisterPublicKeySchema = z.object({
  userId: z.string().uuid(),
  publicKeyPem: z.string().min(1),
  keyAlgorithm: z.enum(['Ed25519', 'RSA-SHA256']).default('Ed25519'),
  deviceId: z.string().optional(),
  attestationData: z.record(z.unknown()).optional(),
});

export const VerifySignatureSchema = z.object({
  data: z.string().min(1),                // the content that was signed
  signature: z.string().min(1),           // base64-encoded signature
  publicKeyPem: z.string().min(1),        // signer's public key
  algorithm: z.enum(['Ed25519', 'RSA-SHA256']).default('Ed25519'),
  timestamp: z.string().datetime(),
  maxAgeMs: z.number().int().positive().default(300000), // 5 minutes default
});

export type RegisterPublicKeyInput = z.infer<typeof RegisterPublicKeySchema>;
export type VerifySignatureInput = z.infer<typeof VerifySignatureSchema>;
