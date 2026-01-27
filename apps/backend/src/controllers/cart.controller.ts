import { Request, Response } from 'express';
import { CartService } from '../services/cart.service';
import { MandateService } from '../services/mandate.service';
import { MandateType, MandateStatus } from '@agentic-commerce/shared-types';

export class CartController {
  private cartService: CartService;
  private mandateService: MandateService;

  constructor() {
    this.cartService = new CartService();
    this.mandateService = new MandateService();
  }

  addToCart = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { productId, productName, productImage, quantity, price, variants, agentId, agentName } = req.body;

      // Validate required fields
      if (!productId || !productName || quantity === undefined || price === undefined) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Missing required fields: productId, productName, quantity, and price are required',
          },
        });
      }

      // Normalize productImage (handle empty strings)
      const normalizedProductImage = productImage && productImage.trim() !== '' ? productImage : undefined;

      // If agentId is provided, check/create cart mandate
      let mandateId: string | undefined;
      if (agentId) {
        try {
          // Check for existing active cart mandate for this agent
          const existingMandates = await this.mandateService.getUserMandates(
            userId,
            MandateStatus.ACTIVE,
            MandateType.CART
          );
          let cartMandate = existingMandates.find(m => m.agentId === agentId);

          // If no mandate exists, create one
          if (!cartMandate) {
            cartMandate = await this.mandateService.createMandate(userId, {
              agentId,
              agentName: agentName || agentId,
              type: MandateType.CART,
              constraints: {
                maxItemValue: 1000, // Default limit
                maxItemsPerDay: 50, // Default limit
              },
            });
          }

          mandateId = cartMandate.id;
          
          // Validate mandate constraints
          await this.mandateService.validateCartConstraints(cartMandate, price);
        } catch (mandateError) {
          // If mandate creation/validation fails, return error with mandate info
          console.error('Mandate validation error:', mandateError);
          return res.status(400).json({
            success: false,
            error: {
              message: mandateError instanceof Error ? mandateError.message : 'Mandate validation failed',
            },
            requiresMandateApproval: true,
          });
        }
      }

      const cartItem = await this.cartService.addToCart(
        userId,
        productId,
        productName,
        normalizedProductImage,
        quantity,
        price,
        variants
      );

      res.status(201).json({
        success: true,
        data: cartItem,
        mandate: mandateId ? {
          id: mandateId,
          requiresApproval: true, // Signal to mobile app to open Mandate app
        } : undefined,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to add item to cart',
        },
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
