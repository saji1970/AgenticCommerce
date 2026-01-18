import mandateServiceClient, { AgentMandate } from '../services/mandate-service.client';
import { AppConfig } from '../config/app.config';
import { storageService } from '../services/storage.service';

export interface MandateCheckResult {
  hasMandate: boolean;
  mandate?: AgentMandate;
  needsRegistration: boolean;
}

/**
 * Check if user has an active payment mandate for an agent
 * Returns mandate info if exists, or indicates if registration is needed
 */
export async function checkPaymentMandate(
  agentId: string,
  agentName?: string
): Promise<MandateCheckResult> {
  try {
    const user = await storageService.getUser();
    if (!user || !user.id) {
      throw new Error('User not logged in');
    }
    const userId = user.id;

    // Check for active payment mandate
    const mandates = await mandateServiceClient.getUserMandates(userId, 'active', 'payment');
    const activeMandate = mandates.find(
      m => m.agentId === agentId && m.status === 'active'
    );

    if (activeMandate) {
      // Check if mandate is expired
      if (activeMandate.validUntil) {
        const now = new Date();
        const validUntil = new Date(activeMandate.validUntil);
        if (now > validUntil) {
          return {
            hasMandate: false,
            needsRegistration: true,
          };
        }
      }

      return {
        hasMandate: true,
        mandate: activeMandate,
        needsRegistration: false,
      };
    }

    // No active mandate found
    return {
      hasMandate: false,
      needsRegistration: true,
    };
  } catch (error) {
    console.error('Error checking payment mandate:', error);
    // If error, assume no mandate and show registration UI
    return {
      hasMandate: false,
      needsRegistration: true,
    };
  }
}

/**
 * Register a payment mandate with the mandate-service
 */
export async function registerPaymentMandate(
  agentId: string,
  agentName: string,
  constraints?: Record<string, any>
): Promise<AgentMandate> {
  const user = await storageService.getUser();
  if (!user || !user.id) {
    throw new Error('User not logged in');
  }
  const userId = user.id;

  const defaultConstraints = AppConfig.getDefaultConstraints('payment');
  const finalConstraints = constraints || defaultConstraints;

  return await mandateServiceClient.registerMandate({
    userId,
    agentId,
    agentName,
    type: 'payment',
    constraints: finalConstraints,
  });
}

/**
 * Approve a pending mandate
 */
export async function approveMandate(mandateId: string): Promise<AgentMandate> {
  const user = await storageService.getUser();
  if (!user || !user.id) {
    throw new Error('User not logged in');
  }
  const userId = user.id;

  return await mandateServiceClient.approveMandate(mandateId, userId);
}

/**
 * Validate mandate before transaction (called by agents)
 */
export async function validateMandateForTransaction(
  agentId: string,
  transactionAmount?: number
): Promise<boolean> {
  try {
    const user = await storageService.getUser();
    if (!user || !user.id) {
      return false;
    }
    const userId = user.id;

    const result = await mandateServiceClient.validateMandate({
      userId,
      agentId,
      mandateType: 'payment',
      transactionAmount,
    });

    return result.valid;
  } catch (error) {
    console.error('Error validating mandate:', error);
    return false;
  }
}
