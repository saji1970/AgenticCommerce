import { backendQuery } from '../config/backend-database';

export interface BackendPurchaseIntent {
  id: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  reasoning: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  approvedAt: string | null;
  executedAt: string | null;
}

export interface BackendCartItem {
  id: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  price: number;
  variants: any;
}

export interface BackendOrder {
  id: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  createdAt: string;
}

export const backendDataRepository = {
  async getPurchaseIntentsByMandateId(mandateId: string): Promise<BackendPurchaseIntent[]> {
    try {
      const result = await backendQuery(
        `SELECT id, items, subtotal, tax, total, reasoning, status,
                created_at, expires_at, approved_at, executed_at
         FROM purchase_intents
         WHERE mandate_id = $1
         ORDER BY created_at DESC`,
        [mandateId]
      );
      return result.rows.map((r: any) => ({
        id: r.id,
        items: r.items || [],
        subtotal: parseFloat(r.subtotal),
        tax: parseFloat(r.tax),
        total: parseFloat(r.total),
        reasoning: r.reasoning,
        status: r.status,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        approvedAt: r.approved_at,
        executedAt: r.executed_at,
      }));
    } catch {
      return [];
    }
  },

  async getCartItemsByMandateId(mandateId: string): Promise<BackendCartItem[]> {
    try {
      const result = await backendQuery(
        `SELECT id, product_name, product_image, quantity, price, variants
         FROM cart_items
         WHERE mandate_id = $1
         ORDER BY created_at DESC`,
        [mandateId]
      );
      return result.rows.map((r: any) => ({
        id: r.id,
        productName: r.product_name,
        productImage: r.product_image,
        quantity: r.quantity,
        price: parseFloat(r.price),
        variants: r.variants,
      }));
    } catch {
      return [];
    }
  },

  async getOrdersByMandateId(mandateId: string): Promise<BackendOrder[]> {
    try {
      const result = await backendQuery(
        `SELECT id, items, subtotal, tax, total, status, created_at
         FROM orders
         WHERE app_mandate_id = $1
         ORDER BY created_at DESC`,
        [mandateId]
      );
      return result.rows.map((r: any) => ({
        id: r.id,
        items: r.items || [],
        subtotal: parseFloat(r.subtotal),
        tax: parseFloat(r.tax),
        total: parseFloat(r.total),
        status: r.status,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  },
};
