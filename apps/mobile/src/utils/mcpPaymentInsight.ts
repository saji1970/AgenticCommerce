import type { Product } from '@agentic-commerce/shared-types';
import { formatMcpPaymentOptionSummary } from '../services/mcp-payment-options.client';

const TAX_RATE = 0.08;

/**
 * Resolve a positive price from Product (API may send number, string, or only rawData for flights).
 */
export function resolveProductPrice(p: Product): number | null {
  const raw = (p.rawData || {}) as Record<string, unknown>;
  const candidates: unknown[] = [
    p.price,
    raw.price,
    raw.total_price,
    raw.totalPrice,
    raw.fare,
    raw.lowest_price,
    (raw as any)?.flight?.price,
  ];
  for (const c of candidates) {
    const n = coercePositiveNumber(c);
    if (n != null) return n;
  }
  return null;
}

function coercePositiveNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && !Number.isNaN(v) && v > 0) return v;
  if (typeof v === 'string') {
    const x = parseFloat(v.replace(/[^0-9.]/g, ''));
    if (!Number.isNaN(x) && x > 0) return x;
  }
  return null;
}

/**
 * Build a representative basket from search results for MCP (top priced items with known price).
 */
export function buildBasketFromSearchProducts(products: Product[], maxItems = 3): {
  items: Array<{
    productId?: string;
    productName?: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
} | null {
  const priced = products
    .map((p) => ({ p, price: resolveProductPrice(p) }))
    .filter((x): x is { p: Product; price: number } => x.price != null)
    .slice(0, maxItems);
  if (priced.length === 0) return null;

  const items = priced.map(({ p, price }) => ({
    productId: p.id,
    productName: p.name,
    quantity: 1,
    price,
  }));
  const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { items, subtotal, tax, total };
}

/**
 * Prefer structured MCP output when present; otherwise show formatted tool text.
 */
export function formatChatPaymentRecommendation(mcpResult: unknown): string {
  const structured = extractStructuredRecommendation(mcpResult);
  if (structured?.line) {
    return structured.line;
  }
  const body = formatMcpPaymentOptionSummary(mcpResult).trim();
  if (!body || body === 'No recommendation returned.') {
    return '';
  }
  return `💳 Best card for this purchase\n\n${body}`;
}

interface Extracted {
  line?: string;
}

function extractStructuredRecommendation(result: unknown): Extracted {
  if (result == null) return {};
  const r = result as Record<string, unknown>;

  const tryObj = (o: Record<string, unknown>): string | undefined => {
    const best =
      (o.best_card as string) ||
      (o.bestCard as string) ||
      (o.recommended_card as string) ||
      (o.recommendedCard as string) ||
      (o.card as string) ||
      (o.label as string);
    const why =
      (o.reason as string) ||
      (o.why as string) ||
      (o.explanation as string) ||
      (o.rationale as string);
    if (best && why) {
      return `💳 Best card for this purchase: ${best}\n\nWhy: ${why}`;
    }
    if (best && !why) {
      return `💳 Best card for this purchase: ${best}`;
    }
    return undefined;
  };

  const direct = tryObj(r);
  if (direct) return { line: direct };

  const content = r.content;
  if (Array.isArray(content)) {
    for (const block of content) {
      const b = block as Record<string, unknown>;
      if (typeof b?.text === 'string') {
        const json = tryParseJsonFromText(b.text);
        if (json && typeof json === 'object') {
          const line = tryObj(json as Record<string, unknown>);
          if (line) return { line };
        }
      }
    }
  }

  const maybeJson = typeof r.result === 'string' ? tryParseJsonFromText(r.result) : null;
  if (maybeJson && typeof maybeJson === 'object') {
    const line = tryObj(maybeJson as Record<string, unknown>);
    if (line) return { line };
  }

  return {};
}

function tryParseJsonFromText(s: string): unknown {
  const t = s.trim();
  if (!t.startsWith('{') && !t.startsWith('[')) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
