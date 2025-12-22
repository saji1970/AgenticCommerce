export interface Payment {
  id: string;
  userId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  stripePaymentIntentId: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethodType;
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  stripePaymentMethodId: string;
}

export enum PaymentMethodType {
  CARD = 'card',
  BANK_ACCOUNT = 'bank_account',
  DIGITAL_WALLET = 'digital_wallet',
}

export interface Order {
  id: string;
  userId: string;
  products: OrderProduct[];
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  shippingAddress: string;
  paymentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderProduct {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  retailerId: string;
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}
