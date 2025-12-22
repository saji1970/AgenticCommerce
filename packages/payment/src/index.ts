// Export interfaces and types
export * from './interfaces/IPaymentGateway';

// Export adapters
export { StripeAdapter } from './adapters/StripeAdapter';
export { RazorpayAdapter } from './adapters/RazorpayAdapter';
export { PayPalAdapter } from './adapters/PayPalAdapter';
export { SquareAdapter } from './adapters/SquareAdapter';

// Export factory
export { PaymentGatewayFactory, PaymentGatewayType } from './PaymentGatewayFactory';

// Export main service
export { PaymentService, PaymentServiceConfig } from './PaymentService';

// Default export
export { PaymentService as default } from './PaymentService';
