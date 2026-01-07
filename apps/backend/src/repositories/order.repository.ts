import { Order } from '@agentic-commerce/shared-types';
import { query } from '../config/database';

export class OrderRepository {

  async createOrder(
    userId: string,
    items: any[],
    subtotal: number,
    tax: number,
    total: number
  ): Promise<Order> {
    const result = await query(
      `INSERT INTO orders (user_id, items, subtotal, tax, total, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [userId, JSON.stringify(items), subtotal, tax, total]
    );

    return this.mapRowToOrder(result.rows[0]);
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    const result = await query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToOrder(result.rows[0]);
  }

  async getUserOrders(userId: string, limit: number = 10, offset: number = 0): Promise<Order[]> {
    const result = await query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    return result.rows.map(row => this.mapRowToOrder(row));
  }

  async getUserOrdersCount(userId: string): Promise<number> {
    const result = await query(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = $1',
      [userId]
    );

    return parseInt(result.rows[0].count);
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    const result = await query(
      `UPDATE orders SET status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [orderId, status]
    );

    return this.mapRowToOrder(result.rows[0]);
  }

  async updateOrderPaymentId(orderId: string, paymentId: string): Promise<Order> {
    const result = await query(
      `UPDATE orders SET payment_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [orderId, paymentId]
    );

    return this.mapRowToOrder(result.rows[0]);
  }

  private mapRowToOrder(row: any): Order {
    return {
      id: row.id,
      userId: row.user_id,
      items: row.items,
      subtotal: parseFloat(row.subtotal),
      tax: parseFloat(row.tax),
      total: parseFloat(row.total),
      paymentId: row.payment_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
