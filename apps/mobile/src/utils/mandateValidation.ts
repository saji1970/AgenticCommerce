/**
 * Mandate Validation Utilities
 * Validates operations against mandate constraints
 */

import {
  Mandate,
  CartMandateConstraints,
  IntentMandateConstraints,
  PaymentMandateConstraints,
  MandateUsageStats,
} from '@agentic-commerce/shared-types';
import { Product } from '@agentic-commerce/shared-types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate product against cart mandate constraints
 */
export function validateAgainstCartMandate(
  product: Product,
  mandate: Mandate
): ValidationResult {
  const errors: string[] = [];
  const constraints = mandate.constraints as CartMandateConstraints;

  // Check max item value
  if (constraints.maxItemValue && product.price != null && product.price > constraints.maxItemValue) {
    errors.push(
      `Product price ($${product.price.toFixed(2)}) exceeds maximum allowed value ($${constraints.maxItemValue.toFixed(2)})`
    );
  } else if (constraints.maxItemValue && product.price == null) {
    // If product has no price, we can't validate against max value
    // Allow it but maybe warn the user
    // For now, we'll allow it
  }

  // Check allowed categories
  if (constraints.allowedCategories && constraints.allowedCategories.length > 0) {
    const productCategory = product.rawData?.category || '';
    const isAllowed = constraints.allowedCategories.some(
      cat => productCategory.toLowerCase().includes(cat.toLowerCase())
    );
    if (!isAllowed) {
      errors.push(
        `Product category "${productCategory}" is not in allowed categories: ${constraints.allowedCategories.join(', ')}`
      );
    }
  }

  // Check blocked categories
  if (constraints.blockedCategories && constraints.blockedCategories.length > 0) {
    const productCategory = product.rawData?.category || '';
    const isBlocked = constraints.blockedCategories.some(
      cat => productCategory.toLowerCase().includes(cat.toLowerCase())
    );
    if (isBlocked) {
      errors.push(
        `Product category "${productCategory}" is blocked by this mandate`
      );
    }
  }

  // Check allowed merchants
  if (constraints.allowedMerchants && constraints.allowedMerchants.length > 0) {
    const productSource = product.source || '';
    const isAllowed = constraints.allowedMerchants.some(
      merchant => productSource.toLowerCase().includes(merchant.toLowerCase())
    );
    if (!isAllowed) {
      errors.push(
        `Product merchant is not in allowed merchants: ${constraints.allowedMerchants.join(', ')}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate intent total against intent mandate constraints
 */
export function validateAgainstIntentMandate(
  intentTotal: number,
  mandate: Mandate
): ValidationResult {
  const errors: string[] = [];
  const constraints = mandate.constraints as IntentMandateConstraints;

  // Check max intent value
  if (constraints.maxIntentValue && intentTotal > constraints.maxIntentValue) {
    errors.push(
      `Intent total ($${intentTotal.toFixed(2)}) exceeds maximum allowed value ($${constraints.maxIntentValue.toFixed(2)})`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if intent should be auto-approved based on constraints
 */
export function shouldAutoApproveIntent(
  intentTotal: number,
  mandate: Mandate
): boolean {
  const constraints = mandate.constraints as IntentMandateConstraints;

  if (constraints.autoApproveUnder && intentTotal < constraints.autoApproveUnder) {
    return true;
  }

  return false;
}

/**
 * Check mandate usage limits (daily limits, etc.)
 */
export function checkMandateUsageLimits(
  mandate: Mandate,
  usageStats: MandateUsageStats
): ValidationResult {
  const errors: string[] = [];

  if (mandate.type === 'cart') {
    const constraints = mandate.constraints as CartMandateConstraints;

    // Check daily item limit
    if (constraints.maxItemsPerDay && usageStats.actionsToday >= constraints.maxItemsPerDay) {
      errors.push(
        `Daily limit reached: ${usageStats.actionsToday}/${constraints.maxItemsPerDay} items added today`
      );
    }
  } else if (mandate.type === 'intent') {
    const constraints = mandate.constraints as IntentMandateConstraints;

    // Check daily intent limit
    if (constraints.maxIntentsPerDay && usageStats.actionsToday >= constraints.maxIntentsPerDay) {
      errors.push(
        `Daily limit reached: ${usageStats.actionsToday}/${constraints.maxIntentsPerDay} intents created today`
      );
    }
  } else if (mandate.type === 'payment') {
    const constraints = mandate.constraints as PaymentMandateConstraints;

    // Check daily spending limit
    if (constraints.dailySpendingLimit && usageStats.spentToday >= constraints.dailySpendingLimit) {
      errors.push(
        `Daily spending limit reached: $${usageStats.spentToday.toFixed(2)}/$${constraints.dailySpendingLimit.toFixed(2)}`
      );
    }

    // Check monthly spending limit
    if (constraints.monthlySpendingLimit && usageStats.spentThisMonth >= constraints.monthlySpendingLimit) {
      errors.push(
        `Monthly spending limit reached: $${usageStats.spentThisMonth.toFixed(2)}/$${constraints.monthlySpendingLimit.toFixed(2)}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if mandate is still valid (not expired, status is active)
 */
export function isMandateValid(mandate: Mandate): ValidationResult {
  const errors: string[] = [];

  // Check status
  if (mandate.status !== 'active') {
    errors.push(`Mandate is ${mandate.status}, not active`);
  }

  // Check expiration
  if (mandate.validUntil) {
    const now = new Date();
    const validUntil = new Date(mandate.validUntil);
    if (now > validUntil) {
      errors.push(`Mandate expired on ${validUntil.toLocaleDateString()}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get constraint summary for display
 */
export function getConstraintSummary(mandate: Mandate): string[] {
  const summaries: string[] = [];

  if (mandate.type === 'cart') {
    const constraints = mandate.constraints as CartMandateConstraints;
    if (constraints.maxItemValue) {
      summaries.push(`Max item value: $${constraints.maxItemValue.toFixed(2)}`);
    }
    if (constraints.maxItemsPerDay) {
      summaries.push(`Daily limit: ${constraints.maxItemsPerDay} items`);
    }
    if (constraints.allowedCategories && constraints.allowedCategories.length > 0) {
      summaries.push(`Allowed categories: ${constraints.allowedCategories.join(', ')}`);
    }
    if (constraints.blockedCategories && constraints.blockedCategories.length > 0) {
      summaries.push(`Blocked categories: ${constraints.blockedCategories.join(', ')}`);
    }
  } else if (mandate.type === 'intent') {
    const constraints = mandate.constraints as IntentMandateConstraints;
    if (constraints.maxIntentValue) {
      summaries.push(`Max intent value: $${constraints.maxIntentValue.toFixed(2)}`);
    }
    if (constraints.maxIntentsPerDay) {
      summaries.push(`Daily limit: ${constraints.maxIntentsPerDay} intents`);
    }
    if (constraints.autoApproveUnder) {
      summaries.push(`Auto-approve under: $${constraints.autoApproveUnder.toFixed(2)}`);
    }
    if (constraints.expiryHours) {
      const days = Math.floor(constraints.expiryHours / 24);
      summaries.push(`Intent expiry: ${days} days`);
    }
  } else if (mandate.type === 'payment') {
    const constraints = mandate.constraints as PaymentMandateConstraints;
    if (constraints.maxTransactionAmount) {
      summaries.push(`Max transaction: $${constraints.maxTransactionAmount.toFixed(2)}`);
    }
    if (constraints.dailySpendingLimit) {
      summaries.push(`Daily limit: $${constraints.dailySpendingLimit.toFixed(2)}`);
    }
    if (constraints.monthlySpendingLimit) {
      summaries.push(`Monthly limit: $${constraints.monthlySpendingLimit.toFixed(2)}`);
    }
  }

  return summaries;
}
