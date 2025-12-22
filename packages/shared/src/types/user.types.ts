export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  userId: string;
  preferredCategories: string[];
  preferredRetailers: string[];
  excludedRetailers: string[];
  budgetLimits: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  priceAlerts: boolean;
  favoritesBrands: string[];
  shippingPreferences: {
    maxShippingCost?: number;
    preferFreeShipping: boolean;
    maxDeliveryDays?: number;
  };
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}
