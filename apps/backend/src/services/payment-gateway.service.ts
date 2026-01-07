import { PaymentMethod, CardDetails, PayPalDetails } from '@agentic-commerce/shared-types';

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
}

/**
 * Mock Payment Gateway Service
 * Simulates payment processing for card and PayPal payments
 */
export class PaymentGatewayService {
  /**
   * Process a payment through the mock gateway
   */
  async processPayment(
    amount: number,
    paymentMethod: PaymentMethod,
    cardDetails?: CardDetails,
    paypalDetails?: PayPalDetails
  ): Promise<PaymentResult> {
    // Simulate network delay
    await this.delay(1000 + Math.random() * 1000);

    if (paymentMethod === PaymentMethod.CARD && cardDetails) {
      return this.processCardPayment(amount, cardDetails);
    } else if (paymentMethod === PaymentMethod.PAYPAL && paypalDetails) {
      return this.processPayPalPayment(amount, paypalDetails);
    }

    return {
      success: false,
      errorMessage: 'Invalid payment method or missing payment details',
    };
  }

  /**
   * Process card payment
   */
  private async processCardPayment(amount: number, cardDetails: CardDetails): Promise<PaymentResult> {
    // Validate card number using Luhn algorithm
    if (!this.validateCardNumber(cardDetails.cardNumber)) {
      return {
        success: false,
        errorMessage: 'Invalid card number',
      };
    }

    // Validate expiry date
    const currentDate = new Date();
    const expiryYear = parseInt('20' + cardDetails.expiryYear);
    const expiryMonth = parseInt(cardDetails.expiryMonth);
    const expiryDate = new Date(expiryYear, expiryMonth - 1);

    if (expiryDate < currentDate) {
      return {
        success: false,
        errorMessage: 'Card has expired',
      };
    }

    // Mock: Simulate random failures (10% failure rate)
    if (Math.random() < 0.1) {
      return {
        success: false,
        errorMessage: 'Payment declined by card issuer',
      };
    }

    // Mock: Simulate specific test cards
    const lastFourDigits = cardDetails.cardNumber.slice(-4);
    if (lastFourDigits === '0000') {
      return {
        success: false,
        errorMessage: 'Insufficient funds',
      };
    }

    // Generate mock transaction ID
    const transactionId = `TXN_CARD_${Date.now()}_${this.generateRandomString(8)}`;

    return {
      success: true,
      transactionId,
    };
  }

  /**
   * Process PayPal payment
   */
  private async processPayPalPayment(amount: number, paypalDetails: PayPalDetails): Promise<PaymentResult> {
    // Validate email format (already validated by Zod, but double-check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(paypalDetails.email)) {
      return {
        success: false,
        errorMessage: 'Invalid PayPal email address',
      };
    }

    // Mock: Simulate random failures (5% failure rate for PayPal)
    if (Math.random() < 0.05) {
      return {
        success: false,
        errorMessage: 'PayPal payment declined',
      };
    }

    // Generate mock transaction ID
    const transactionId = `TXN_PAYPAL_${Date.now()}_${this.generateRandomString(8)}`;

    return {
      success: true,
      transactionId,
    };
  }

  /**
   * Validate card number using Luhn algorithm
   */
  private validateCardNumber(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');

    if (digits.length < 13 || digits.length > 19) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Generate random alphanumeric string
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Simulate network delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
