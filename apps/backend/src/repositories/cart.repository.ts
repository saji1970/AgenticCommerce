import { CartItem, ProductVariant } from '@agentic-commerce/shared-types';
import { query } from '../config/database';

export class CartRepository {

  async addItem(
    userId: string,
    productId: string,
    productName: string,
    productImage: string | undefined,
    quantity: number,
    price: number,
    variants?: ProductVariant[]
  ): Promise<CartItem> {
    const result = await query(
      `INSERT INTO cart_items (user_id, product_id, product_name, product_image, quantity, price, variants)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, productId, productName, productImage, quantity, price, JSON.stringify(variants || [])]
    );

    return this.mapRowToCartItem(result.rows[0]);
  }

  async getItemById(itemId: string): Promise<CartItem | null> {
    const result = await query(
      'SELECT * FROM cart_items WHERE id = $1',
      [itemId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCartItem(result.rows[0]);
  }

  async getUserCart(userId: string): Promise<CartItem[]> {
    const result = await query(
      'SELECT * FROM cart_items WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows.map(row => this.mapRowToCartItem(row));
  }

  async getItemByProductId(userId: string, productId: string): Promise<CartItem | null> {
    const result = await query(
      'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCartItem(result.rows[0]);
  }

  async updateItemQuantity(itemId: string, quantity: number, variants?: ProductVariant[]): Promise<CartItem> {
    const updateFields = ['quantity = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [itemId, quantity];

    if (variants !== undefined) {
      updateFields.push('variants = $3');
      params.push(JSON.stringify(variants));
    }

    const result = await query(
      `UPDATE cart_items SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`,
      params
    );

    return this.mapRowToCartItem(result.rows[0]);
  }

  async deleteItem(itemId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM cart_items WHERE id = $1',
      [itemId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  async clearUserCart(userId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM cart_items WHERE user_id = $1',
      [userId]
    );

    return result.rowCount !== null && result.rowCount >= 0;
  }

  private mapRowToCartItem(row: any): CartItem {
    return {
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      productImage: row.product_image,
      quantity: row.quantity,
      price: parseFloat(row.price),
      variants: row.variants || [],
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
