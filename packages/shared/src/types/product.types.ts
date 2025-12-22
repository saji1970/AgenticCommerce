export interface Product {
  id: string;
  externalId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrls: string[];
  retailer: Retailer;
  category: string;
  specifications: Record<string, any>;
  availability: ProductAvailability;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Retailer {
  id: string;
  name: string;
  website: string;
  trustScore: number;
  returnPolicy: string;
  shippingOptions: ShippingOption[];
}

export interface ShippingOption {
  id: string;
  name: string;
  cost: number;
  estimatedDays: number;
  carrier?: string;
}

export interface ProductAvailability {
  inStock: boolean;
  quantity?: number;
  restockDate?: Date;
}

export interface ProductReview {
  id: string;
  productId: string;
  rating: number;
  title: string;
  content: string;
  author: string;
  verifiedPurchase: boolean;
  helpful: number;
  createdAt: Date;
}

export interface PriceHistory {
  productId: string;
  price: number;
  timestamp: Date;
  retailerId: string;
}
