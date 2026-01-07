import { Request, Response } from 'express';
import { CartService } from '../services/cart.service';

export class CartController {
  private cartService: CartService;

  constructor() {
    this.cartService = new CartService();
  }

  addToCart = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { productId, productName, productImage, quantity, price, variants } = req.body;

      const cartItem = await this.cartService.addToCart(
        userId,
        productId,
        productName,
        productImage,
        quantity,
        price,
        variants
      );

      res.status(201).json({
        success: true,
        data: cartItem,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add item to cart',
      });
    }
  };

  getCart = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const result = await this.cartService.getCart(userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error getting cart:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cart',
      });
    }
  };

  updateCartItem = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { itemId } = req.params;
      const { quantity, variants } = req.body;

      const cartItem = await this.cartService.updateCartItem(itemId, userId, quantity, variants);

      res.json({
        success: true,
        data: cartItem,
      });
    } catch (error) {
      console.error('Error updating cart item:', error);
      res.status(error instanceof Error && error.message === 'Cart item not found' ? 404 : 500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update cart item',
      });
    }
  };

  removeFromCart = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { itemId } = req.params;

      await this.cartService.removeFromCart(itemId, userId);

      res.json({
        success: true,
        message: 'Item removed from cart',
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(error instanceof Error && error.message === 'Cart item not found' ? 404 : 500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove item from cart',
      });
    }
  };

  clearCart = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      await this.cartService.clearCart(userId);

      res.json({
        success: true,
        message: 'Cart cleared',
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear cart',
      });
    }
  };
}
