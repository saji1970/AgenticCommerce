// Stub types to allow build without monorepo dependencies
// Replace these with actual types later

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export type Product = any;
export type ProductFilter = any;
export type SearchQuery = any;
export type CartItem = any;
export type PaymentMethod = any;
export type Order = any;
export type UserProfile = any;
export type UpdateUserDTO = any;
export type LoginCredentials = any;
export type RegisterData = any;
export type AuthResponse = any;
export type Mandate = any;
export type MandateStatus = any;
export type MandateType = any;
export type PurchaseIntent = any;
export type CartMandateConstraints = any;
export type IntentMandateConstraints = any;
export type PaymentMandateConstraints = any;






