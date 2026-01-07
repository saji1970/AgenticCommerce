export enum PaymentMethod {
  CARD = 'card',
  PAYPAL = 'paypal',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface CardDetails {
  cardNumber: string;
  cardHolderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface PayPalDetails {
  email: string;
}

export interface PaymentRequest {
  cartId: string;
  paymentMethod: PaymentMethod;
  cardDetails?: CardDetails;
  paypalDetails?: PayPalDetails;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  items: Array<{
    productId: string;
    productName: string;
    productImage?: string;
    quantity: number;
    price: number;
    variants?: Array<{
      name: string;
      value: string;
    }>;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentId?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentResponse {
  payment: Payment;
  order: Order;
}

export interface OrderHistoryResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}
