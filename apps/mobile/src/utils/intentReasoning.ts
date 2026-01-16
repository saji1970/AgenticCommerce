/**
 * Intent Reasoning Generator
 * Generates human-readable reasoning text for purchase intents
 */

import { Product } from '@agentic-commerce/shared-types';
import { IntentType, IntentConditions } from '../types/intent.types';

/**
 * Generate reasoning text based on intent type and conditions
 */
export function generateIntentReasoning(
  type: IntentType,
  product: Product,
  conditions: IntentConditions
): string {
  const productName = product.name;
  const currentPrice = product.price != null 
    ? `$${product.price.toFixed(2)}`
    : 'price not available';

  switch (type) {
    case IntentType.PRICE_DROP:
      if (conditions.targetPrice) {
        const targetPrice = `$${conditions.targetPrice.toFixed(2)}`;
        if (product.price != null) {
          const dropAmount = product.price - conditions.targetPrice;
          const dropPercentage = ((dropAmount / product.price) * 100).toFixed(1);
          return `Monitor price for "${productName}" and notify when it drops to ${targetPrice} or below (currently ${currentPrice}, ${dropPercentage}% drop required)`;
        } else {
          return `Monitor price for "${productName}" and notify when it drops to ${targetPrice} or below`;
        }
      }
      return `Monitor price for "${productName}" and notify when a price drop occurs (currently ${currentPrice})`;

    case IntentType.AVAILABILITY:
      const availability = product.rawData?.availability || 'Unknown';
      if (availability.toLowerCase().includes('out of stock') || availability.toLowerCase().includes('unavailable')) {
        return `Notify when "${productName}" becomes available for purchase (currently out of stock)`;
      }
      return `Monitor availability of "${productName}" and notify when stock status changes`;

    case IntentType.TIME_BASED:
      if (conditions.scheduledDate) {
        const date = new Date(conditions.scheduledDate);
        const dateStr = date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        const timeStr = conditions.scheduledTime || 'at the scheduled time';
        return `Schedule purchase of "${productName}" for ${dateStr} ${timeStr}`;
      }
      return `Schedule purchase of "${productName}" for a future date`;

    case IntentType.GENERAL:
      if (conditions.customReasoning && conditions.customReasoning.trim()) {
        return conditions.customReasoning;
      }
      return `Interested in purchasing "${productName}" when conditions are favorable${product.price != null ? ` (current price: ${currentPrice})` : ''}`;

    default:
      return `Expressed interest in "${productName}"`;
  }
}

/**
 * Get a short summary of intent conditions
 * Used for displaying intent details in lists
 */
export function getIntentConditionsSummary(
  type: IntentType,
  conditions: IntentConditions
): string {
  switch (type) {
    case IntentType.PRICE_DROP:
      if (conditions.targetPrice) {
        return `Target: $${conditions.targetPrice.toFixed(2)}`;
      }
      return 'Price drop alert';

    case IntentType.AVAILABILITY:
      return 'Back in stock alert';

    case IntentType.TIME_BASED:
      if (conditions.scheduledDate) {
        const date = new Date(conditions.scheduledDate);
        return `Scheduled for ${date.toLocaleDateString()}`;
      }
      return 'Scheduled purchase';

    case IntentType.GENERAL:
      return 'General interest';

    default:
      return 'Unknown';
  }
}

/**
 * Validate intent conditions based on type
 */
export function validateIntentConditions(
  type: IntentType,
  conditions: IntentConditions,
  product: Product
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  switch (type) {
    case IntentType.PRICE_DROP:
      if (!conditions.targetPrice) {
        errors.targetPrice = 'Target price is required';
      } else if (product.price != null && conditions.targetPrice >= product.price) {
        errors.targetPrice = 'Target price must be lower than current price';
      } else if (conditions.targetPrice <= 0) {
        errors.targetPrice = 'Target price must be greater than zero';
      } else if (product.price == null) {
        // Allow target price even if current price is not available
        // Just validate it's positive
      }
      break;

    case IntentType.AVAILABILITY:
      // No specific validation needed
      break;

    case IntentType.TIME_BASED:
      if (!conditions.scheduledDate) {
        errors.scheduledDate = 'Scheduled date is required';
      } else {
        const scheduledDate = new Date(conditions.scheduledDate);
        const tomorrow = new Date();
        tomorrow.setHours(0, 0, 0, 0);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (scheduledDate < tomorrow) {
          errors.scheduledDate = 'Scheduled date must be at least tomorrow';
        }
      }
      break;

    case IntentType.GENERAL:
      // No specific validation needed
      break;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
