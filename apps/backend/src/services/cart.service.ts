import { CartRepository } from '../repositories/cart.repository';
import { Cart, CartItem, ProductVariant } from '@agentic-commerce/shared-types';

export class CartService {
  private cartRepository: CartRepository;

  constructor() {
    this.cartRepository = new CartRepository();
  }

  async addToCart(
    userId: string,
    productId: string,
    productName: string,
    productImage: string | undefined,
    quantity: number,
    price: number,
    variants?: ProductVariant[]
  ): Promise<CartItem> {
    // Check if item already exists in cart
    const existingItem = await this.cartRepository.getItemByProductId(userId, productId);

    if (existingItem) {
      // Update quantity if item already exists
      const newQuantity = existingItem.quantity + quantity;
      return await this.cartRepository.updateItemQuantity(existingItem.id, newQuantity, variants);
    }

    // Add new item to cart
    return await this.cartRepository.addItem(
      userId,
      productId,
      productName,
      productImage,
      quantity,
      price,
      variants
    );
  }

  async getCart(userId: string): Promise<{ cart: Cart; itemCount: number }> {
    const items = await this.cartRepository.getUserCart(userId);

    const subtotal = items.reduce((sum, item) => {
      const variantPrice = item.variants?.reduce((vSum, v) => vSum + (v.priceModifier || 0), 0) || 0;
      return sum + (item.price + variantPrice) * item.quantity;
    }, 0);

    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    const cart: Cart = {
      id: userId, // Using userId as cart ID
      userId,
      items,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      createdAt: items.length > 0 ? items[items.length - 1].createdAt : new Date(),
      updatedAt: items.length > 0 ? items[0].updatedAt : new Date(),
    };

    return { cart, itemCount };
  }

  async updateCartItem(
    itemId: string,
    userId: string,
    quantity: number,
    variants?: ProductVariant[]
  ): Promise<CartItem> {
    const item = await this.cartRepository.getItemById(itemId);

    if (!item || item.userId !== userId) {
      throw new Error('Cart item not found');
    }

    return await this.cartRepository.updateItemQuantity(itemId, quantity, variants);
  }

  async removeFromCart(itemId: string, userId: string): Promise<boolean> {
    const item = await this.cartRepository.getItemById(itemId);

    if (!item || item.userId !== userId) {
      throw new Error('Cart item not found');
    }

    return await this.cartRepository.deleteItem(itemId);
  }

  async clearCart(userId: string): Promise<boolean> {
    return await this.cartRepository.clearUserCart(userId);
  }
}
