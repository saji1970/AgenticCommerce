import React, { createContext, useState, useContext, useCallback } from 'react';
import {
  Cart,
  CartItem,
  AddToCartRequest,
  UpdateCartItemRequest,
} from '@agentic-commerce/shared-types';
import { cartService } from '../services/cart.service';

interface CartContextType {
  cart: Cart | null;
  itemCount: number;
  loading: boolean;
  error: string | null;
  addToCart: (request: AddToCartRequest) => Promise<void>;
  updateCartItem: (itemId: string, request: UpdateCartItemRequest) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await cartService.getCart();
      setCart(response.cart);
      setItemCount(response.itemCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
      console.error('Error loading cart:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = useCallback(async (request: AddToCartRequest) => {
    try {
      setLoading(true);
      setError(null);
      await cartService.addToCart(request);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item to cart');
      console.error('Error adding to cart:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshCart]);

  const updateCartItem = useCallback(async (itemId: string, request: UpdateCartItemRequest) => {
    try {
      setLoading(true);
      setError(null);
      await cartService.updateCartItem(itemId, request);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cart item');
      console.error('Error updating cart item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshCart]);

  const removeFromCart = useCallback(async (itemId: string) => {
    try {
      setLoading(true);
      setError(null);
      await cartService.removeFromCart(itemId);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item from cart');
      console.error('Error removing from cart:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshCart]);

  const clearCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await cartService.clearCart();
      setCart(null);
      setItemCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cart');
      console.error('Error clearing cart:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        loading,
        error,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
