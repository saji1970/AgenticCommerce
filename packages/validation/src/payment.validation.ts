import { z } from 'zod';

const cardDetailsSchema = z.object({
  cardNumber: z.string().regex(/^\d{13,19}$/, 'Invalid card number'),
  cardHolderName: z.string().min(1),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Invalid month (use MM format)'),
  expiryYear: z.string().regex(/^\d{2}$/, 'Invalid year (use YY format)'),
  cvv: z.string().regex(/^\d{3,4}$/, 'Invalid CVV'),
});

const paypalDetailsSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const billingAddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  country: z.string().min(1),
});

export const paymentRequestSchema = z.object({
  cartId: z.string().uuid(),
  paymentMethod: z.enum(['card', 'paypal']),
  cardDetails: cardDetailsSchema.optional(),
  paypalDetails: paypalDetailsSchema.optional(),
  billingAddress: billingAddressSchema.optional(),
}).refine(
  (data) => {
    if (data.paymentMethod === 'card') {
      return !!data.cardDetails;
    }
    if (data.paymentMethod === 'paypal') {
      return !!data.paypalDetails;
    }
    return false;
  },
  {
    message: 'Payment details must match the selected payment method',
  }
);
