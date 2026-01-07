import { Payment, PaymentMethod, PaymentStatus } from '@agentic-commerce/shared-types';
import { query } from '../config/database';

export class PaymentRepository {

  async createPayment(
    orderId: string,
    userId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    billingAddress?: any,
    paymentDetails?: any
  ): Promise<Payment> {
    const result = await query(
      `INSERT INTO payments (order_id, user_id, amount, payment_method, status, billing_address, payment_details)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6)
       RETURNING *`,
      [
        orderId,
        userId,
        amount,
        paymentMethod,
        billingAddress ? JSON.stringify(billingAddress) : null,
        paymentDetails ? JSON.stringify(paymentDetails) : null,
      ]
    );

    return this.mapRowToPayment(result.rows[0]);
  }

  async getPaymentById(paymentId: string): Promise<Payment | null> {
    const result = await query(
      'SELECT * FROM payments WHERE id = $1',
      [paymentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPayment(result.rows[0]);
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    const result = await query(
      'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPayment(result.rows[0]);
  }

  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    transactionId?: string,
    errorMessage?: string
  ): Promise<Payment> {
    const result = await query(
      `UPDATE payments
       SET status = $2,
           transaction_id = COALESCE($3, transaction_id),
           error_message = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [paymentId, status, transactionId, errorMessage]
    );

    return this.mapRowToPayment(result.rows[0]);
  }

  private mapRowToPayment(row: any): Payment {
    return {
      id: row.id,
      orderId: row.order_id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      paymentMethod: row.payment_method as PaymentMethod,
      status: row.status as PaymentStatus,
      transactionId: row.transaction_id,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
