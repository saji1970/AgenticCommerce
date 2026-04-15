import { Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config/env';
import { evaluatePurchasePaymentOptions } from '../services/mcp-payment-options.service';

const paymentMethodSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['card', 'paypal', 'apple_pay']),
  label: z.string().min(1),
  last4: z.string().optional(),
  network: z.string().optional(),
});

const basketSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        productName: z.string().optional(),
        quantity: z.number().int().positive(),
        price: z.number().nonnegative(),
      })
    )
    .min(1),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  total: z.number().optional(),
  currency: z.string().min(1).optional(),
  paymentMethods: z.array(paymentMethodSchema).optional(),
});

export class McpProxyController {
  /**
   * POST /api/mcp/evaluate-payment-options
   * Proxies MCP tools/call evaluate_purchase_payment_options — MCP_API_TOKEN stays on server.
   */
  evaluatePaymentOptions = async (req: Request, res: Response) => {
    try {
      if (!config.mcpHttp.cardMCPServerURL) {
        return res.status(503).json({
          success: false,
          error: {
            message:
              'Card MCP is not configured. Set CARD_MCP_SERVER_URL (or MCP_HTTP_URL) and MCP_API_TOKEN on the server.',
          },
        });
      }

      const parsed = basketSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
          },
        });
      }

      const result = await evaluatePurchasePaymentOptions(parsed.data);
      return res.json({ success: true, data: result });
    } catch (e) {
      console.error('[MCP proxy] evaluate_purchase_payment_options:', e);
      return res.status(502).json({
        success: false,
        error: {
          message: e instanceof Error ? e.message : 'MCP payment options call failed',
        },
      });
    }
  };
}
