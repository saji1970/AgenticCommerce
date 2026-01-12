import { Product } from '@agentic-commerce/shared-types';

/**
 * Intent Types
 */
export enum IntentType {
  PRICE_DROP = 'price_drop',
  AVAILABILITY = 'availability',
  TIME_BASED = 'time_based',
  GENERAL = 'general',
}

/**
 * Intent Conditions
 * Type-specific conditions for purchase intents
 */
export interface IntentConditions {
  type: IntentType;

  // Price Drop conditions
  targetPrice?: number;
  priceDropPercentage?: number;

  // Availability conditions
  notifyOnAvailable?: boolean;

  // Time-Based conditions
  scheduledDate?: Date;
  scheduledTime?: string;

  // General conditions
  customReasoning?: string;
}

/**
 * Intent Form Data
 * Data collected from intent creation form
 */
export interface IntentFormData {
  type: IntentType;
  conditions: IntentConditions;
  reasoning: string; // AI-generated or user-provided
}

/**
 * Intent Validation Result
 */
export interface IntentValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Intent Form Props
 * Common props for all intent form components
 */
export interface IntentFormProps {
  product: Product;
  conditions: IntentConditions;
  onConditionsChange: (conditions: IntentConditions) => void;
  errors?: Record<string, string>;
}

/**
 * Intent Type Config
 * Configuration for displaying intent types
 */
export interface IntentTypeConfig {
  id: string;
  label: string;
  icon: string;
  description: string;
}
