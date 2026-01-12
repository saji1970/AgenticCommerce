import { CartMandateConstraints, IntentMandateConstraints, PaymentMandateConstraints } from '@agentic-commerce/shared-types';

/**
 * Application-wide configuration
 */
export const APP_CONFIG = {
  /**
   * Default Agent Configuration
   * Used for all mandate operations
   */
  defaultAgent: {
    id: 'default-shopping-agent',
    name: 'Shopping Assistant',
  },

  /**
   * Default Mandate Constraints
   * Applied when creating new mandates
   */
  defaultMandateConstraints: {
    cart: {
      maxItemsPerDay: 10, // Conservative limit for regular shopping
      maxItemValue: 500, // Prevents large unauthorized purchases
      allowedCategories: [], // Empty = all categories allowed
      blockedCategories: [], // Could add restricted categories
      requiresApproval: false, // Direct add to cart (user still approves checkout)
    } as CartMandateConstraints,

    intent: {
      maxIntentsPerDay: 20, // Higher than cart since intents need approval
      maxIntentValue: 1000, // 2x cart limit since these are recommendations
      autoApproveUnder: 50, // Auto-approve small purchases for convenience
      expiryHours: 168, // 7 days - long enough to monitor price/availability
    } as IntentMandateConstraints,

    payment: {
      maxTransactionAmount: 500,
      dailySpendingLimit: 1000,
      monthlySpendingLimit: 5000,
      allowedPaymentMethods: ['card', 'paypal'],
      requiresTwoFactor: true,
    } as PaymentMandateConstraints,
  },

  /**
   * Intent Configuration
   * Defines available intent types and their display properties
   */
  intent: {
    types: [
      {
        id: 'price_drop',
        label: 'Price Drop Alert',
        icon: '💰',
        description: 'Get notified when the price drops below your target',
      },
      {
        id: 'availability',
        label: 'Back in Stock',
        icon: '📦',
        description: 'Get notified when the product is available again',
      },
      {
        id: 'time_based',
        label: 'Scheduled Purchase',
        icon: '⏰',
        description: 'Schedule a purchase for a specific date and time',
      },
      {
        id: 'general',
        label: "I'm Interested",
        icon: '⭐',
        description: 'Express interest and let the agent decide the best time',
      },
    ],
  },

  /**
   * UI Configuration
   */
  ui: {
    toast: {
      duration: 3000, // 3 seconds
      position: 'bottom' as const,
    },
    modal: {
      animationType: 'slide' as const,
    },
  },
} as const;

/**
 * Helper functions for configuration
 */
export const AppConfig = {
  /**
   * Get default agent configuration
   */
  getDefaultAgent() {
    return APP_CONFIG.defaultAgent;
  },

  /**
   * Get default constraints for a specific mandate type
   */
  getDefaultConstraints(type: 'cart' | 'intent' | 'payment') {
    return APP_CONFIG.defaultMandateConstraints[type];
  },

  /**
   * Get intent type configuration by ID
   */
  getIntentType(id: string) {
    return APP_CONFIG.intent.types.find(t => t.id === id);
  },

  /**
   * Get all intent types
   */
  getAllIntentTypes() {
    return APP_CONFIG.intent.types;
  },
};
