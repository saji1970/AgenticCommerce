import { z } from 'zod';

const cartMandateConstraintsSchema = z.object({
  maxItemsPerDay: z.number().positive().optional(),
  maxItemValue: z.number().positive().optional(),
  allowedCategories: z.array(z.string()).optional(),
  blockedCategories: z.array(z.string()).optional(),
  allowedMerchants: z.array(z.string()).optional(),
  requiresApproval: z.boolean().optional(),
});

const intentMandateConstraintsSchema = z.object({
  maxIntentsPerDay: z.number().positive().optional(),
  maxIntentValue: z.number().positive().optional(),
  autoApproveUnder: z.number().positive().optional(),
  expiryHours: z.number().positive().optional(),
});

const paymentMandateConstraintsSchema = z.object({
  maxTransactionAmount: z.number().positive().optional(),
  dailySpendingLimit: z.number().positive().optional(),
  monthlySpendingLimit: z.number().positive().optional(),
  allowedPaymentMethods: z.array(z.string()).optional(),
  requiresTwoFactor: z.boolean().optional(),
  allowedMerchants: z.array(z.string()).optional(),
});

export const createMandateSchema = z.object({
  agentId: z.string().min(1),
  agentName: z.string().min(1),
  type: z.enum(['cart', 'intent', 'payment']),
  constraints: z.union([
    cartMandateConstraintsSchema,
    intentMandateConstraintsSchema,
    paymentMandateConstraintsSchema,
  ]),
  validUntil: z.string().datetime().optional(),
});

export const updateMandateSchema = z.object({
  status: z.enum(['active', 'suspended', 'revoked']).optional(),
  constraints: z.union([
    cartMandateConstraintsSchema,
    intentMandateConstraintsSchema,
    paymentMandateConstraintsSchema,
  ]).optional(),
  validUntil: z.string().datetime().optional(),
});

export const agentCartRequestSchema = z.object({
  mandateId: z.string().uuid(),
  agentId: z.string().min(1),
  productId: z.string().uuid(),
  productName: z.string().min(1),
  productImage: z.string().url().optional(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    value: z.string(),
    priceModifier: z.number().optional(),
  })).optional(),
  reasoning: z.string().min(10).max(500),
});

export const createIntentRequestSchema = z.object({
  mandateId: z.string().uuid(),
  agentId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().uuid(),
    productName: z.string().min(1),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
    variants: z.array(z.object({
      name: z.string(),
      value: z.string(),
    })).optional(),
  })).min(1),
  reasoning: z.string().min(10).max(1000),
});

export const agentPaymentRequestSchema = z.object({
  mandateId: z.string().uuid(),
  agentId: z.string().min(1),
  intentId: z.string().uuid().optional(),
  paymentMethod: z.enum(['card', 'paypal']),
  cardDetails: z.object({
    cardNumber: z.string().regex(/^\d{13,19}$/),
    cardHolderName: z.string().min(1),
    expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
    expiryYear: z.string().regex(/^\d{2}$/),
    cvv: z.string().regex(/^\d{3,4}$/),
  }).optional(),
  paypalDetails: z.object({
    email: z.string().email(),
  }).optional(),
  reasoning: z.string().min(10).max(500),
}).refine(
  (data) => {
    if (data.paymentMethod === 'card') return !!data.cardDetails;
    if (data.paymentMethod === 'paypal') return !!data.paypalDetails;
    return false;
  },
  { message: 'Payment details must match payment method' }
);
