export interface ProductVariant {
  id: string;
  name: string;
  value: string;
  priceModifier?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  variants?: ProductVariant[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddToCartRequest {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  variants?: ProductVariant[];
}

export interface UpdateCartItemRequest {
  quantity: number;
  variants?: ProductVariant[];
}

export interface CartResponse {
  cart: Cart;
  itemCount: number;
}
