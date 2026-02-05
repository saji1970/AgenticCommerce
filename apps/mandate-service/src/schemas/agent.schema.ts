import { z } from 'zod';

export const AgentStatusEnum = z.enum(['active', 'inactive', 'suspended', 'revoked']);

export const RegisterAgentSchema = z.object({
  merchantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  agentName: z.string().min(1).max(255),
  publicKeyPem: z.string().min(1),   // PEM-encoded public key
  keyAlgorithm: z.enum(['Ed25519', 'RSA-SHA256']).default('Ed25519'),
  apiEndpoint: z.string().url().optional(),
  capabilities: z.array(z.string()).min(1),
});

export const RotateAgentKeySchema = z.object({
  agentId: z.string().min(1),
  newPublicKeyPem: z.string().min(1),
  keyAlgorithm: z.enum(['Ed25519', 'RSA-SHA256']).default('Ed25519'),
});

export const SuspendAgentSchema = z.object({
  agentId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

export const RevokeAgentSchema = z.object({
  agentId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

export type RegisterAgentInput = z.infer<typeof RegisterAgentSchema>;
export type RotateAgentKeyInput = z.infer<typeof RotateAgentKeySchema>;
