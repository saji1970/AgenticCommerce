import { z } from 'zod';

export const AuditActorTypeEnum = z.enum(['user', 'agent', 'merchant', 'system']);
export const AuditEventCategoryEnum = z.enum(['mandate', 'payment', 'agent', 'merchant', 'security', 'auth']);
export const AuditSeverityEnum = z.enum(['info', 'warning', 'critical']);

export const CreateAuditEntrySchema = z.object({
  actorType: AuditActorTypeEnum,
  actorId: z.string().min(1),
  actorIdentity: z.string().optional(),

  eventType: z.string().min(1),
  eventCategory: AuditEventCategoryEnum,
  severity: AuditSeverityEnum.default('info'),

  mandateId: z.string().uuid().optional(),
  artifactId: z.string().uuid().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),

  description: z.string().min(1),
  oldState: z.record(z.unknown()).optional(),
  newState: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),

  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),
});

export const QueryAuditLogSchema = z.object({
  actorType: AuditActorTypeEnum.optional(),
  actorId: z.string().optional(),
  eventType: z.string().optional(),
  eventCategory: AuditEventCategoryEnum.optional(),
  severity: AuditSeverityEnum.optional(),
  mandateId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(500).default(50),
  offset: z.number().int().min(0).default(0),
});

export type CreateAuditEntryInput = z.infer<typeof CreateAuditEntrySchema>;
export type QueryAuditLogInput = z.infer<typeof QueryAuditLogSchema>;
