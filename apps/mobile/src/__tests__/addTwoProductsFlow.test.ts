/**
 * Test: Adding 2 products differently - verify correct product flows to Mandate app
 *
 * Ensures that when adding Product A then Product B (via Buy Now or Intent),
 * each deep link contains the correct product data (no stale/old product).
 */
import { buildMandateAppUrl, type CartData } from '../utils/mandateUrlBuilder';

const MANDATE_ID = 'test-mandate-123';
const USER_ID = 'user-456';

describe('Add Two Products Flow', () => {
  const productA = {
    id: 'prod-a-001',
    name: 'Product A - Paper Towels',
    price: 12,
    quantity: 1,
    imageUrl: 'https://example.com/a.png',
  };

  const productB = {
    id: 'prod-b-002',
    name: 'Product B - Leather Bag',
    price: 89,
    quantity: 1,
    imageUrl: 'https://example.com/b.png',
  };

  function cartDataForProduct(product: typeof productA): CartData {
    return {
      items: [
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: product.quantity,
          imageUrl: product.imageUrl,
        },
      ],
      total: product.price * product.quantity,
      agentName: 'Shopping Assistant',
    };
  }

  function intentDataForProduct(product: typeof productA) {
    return {
      type: 'intent',
      product: {
        id: product.id,
        name: product.name,
        image: product.imageUrl,
        price: product.price,
        quantity: product.quantity,
      },
      maxPrice: product.price,
      agentName: 'Shopping Assistant',
    };
  }

  describe('Buy Now flow - Product A then Product B', () => {
    it('builds URL with Product A cartData when adding Product A', () => {
      const cartDataA = cartDataForProduct(productA);
      const url = buildMandateAppUrl(MANDATE_ID, {
        cartData: cartDataA,
        userId: USER_ID,
      });

      expect(url).toContain('mandate://mandate/' + MANDATE_ID);
      expect(url).toContain('userId=' + USER_ID);

      const queryStart = url.indexOf('?');
      const cartDataParam = queryStart >= 0
        ? new URLSearchParams(url.slice(queryStart + 1)).get('cartData')
        : null;
      expect(cartDataParam).toBeTruthy();

      const parsed = JSON.parse(decodeURIComponent(cartDataParam!));
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].id).toBe(productA.id);
      expect(parsed.items[0].name).toBe(productA.name);
      expect(parsed.items[0].price).toBe(productA.price);
      expect(parsed.total).toBe(productA.price * productA.quantity);
    });

    it('builds URL with Product B cartData when adding Product B (not Product A)', () => {
      const cartDataB = cartDataForProduct(productB);
      const url = buildMandateAppUrl(MANDATE_ID, {
        cartData: cartDataB,
        userId: USER_ID,
      });

      const queryStart = url.indexOf('?');
      const cartDataParam = queryStart >= 0
        ? new URLSearchParams(url.slice(queryStart + 1)).get('cartData')
        : null;
      const parsed = JSON.parse(decodeURIComponent(cartDataParam!));

      expect(parsed.items[0].id).toBe(productB.id);
      expect(parsed.items[0].name).toBe(productB.name);
      expect(parsed.items[0].price).toBe(productB.price);
      expect(parsed.items[0].name).not.toBe(productA.name);
      expect(parsed.total).toBe(89);
    });

    it('each product uses a different mandate ID (no mandate reuse across purchases)', () => {
      // Each Buy Now creates a new mandate - Product A and Product B get separate mandate IDs.
      const MANDATE_ID_A = 'mandate-for-product-a-001';
      const MANDATE_ID_B = 'mandate-for-product-b-002';

      const urlForA = buildMandateAppUrl(MANDATE_ID_A, {
        cartData: cartDataForProduct(productA),
        userId: USER_ID,
      });
      const urlForB = buildMandateAppUrl(MANDATE_ID_B, {
        cartData: cartDataForProduct(productB),
        userId: USER_ID,
      });

      expect(urlForA).toContain(MANDATE_ID_A);
      expect(urlForB).toContain(MANDATE_ID_B);
      expect(urlForA).not.toContain(MANDATE_ID_B);
      expect(urlForB).not.toContain(MANDATE_ID_A);

      const parseCart = (u: string) => {
        const idx = u.indexOf('?');
        const p = idx >= 0 ? new URLSearchParams(u.slice(idx + 1)).get('cartData') : null;
        return p ? JSON.parse(decodeURIComponent(p)) : null;
      };

      const cartA = parseCart(urlForA);
      const cartB = parseCart(urlForB);

      expect(cartA.items[0].id).toBe(productA.id);
      expect(cartB.items[0].id).toBe(productB.id);
    });

    it('Product A and Product B URLs contain different product data', () => {
      const urlA = buildMandateAppUrl(MANDATE_ID, {
        cartData: cartDataForProduct(productA),
        userId: USER_ID,
      });
      const urlB = buildMandateAppUrl(MANDATE_ID, {
        cartData: cartDataForProduct(productB),
        userId: USER_ID,
      });

      const parseCartFromUrl = (u: string) => {
        const idx = u.indexOf('?');
        const param = idx >= 0 ? new URLSearchParams(u.slice(idx + 1)).get('cartData') : null;
        return param ? JSON.parse(decodeURIComponent(param)) : null;
      };

      const cartA = parseCartFromUrl(urlA);
      const cartB = parseCartFromUrl(urlB);

      expect(cartA.items[0].id).not.toBe(cartB.items[0].id);
      expect(cartA.items[0].name).not.toBe(cartB.items[0].name);
      expect(cartA.total).not.toBe(cartB.total);
    });
  });

  describe('Create Intent flow - Product A then Product B', () => {
    it('builds URL with Product A intentData when creating intent for Product A', () => {
      const intentA = intentDataForProduct(productA);
      const url = buildMandateAppUrl(MANDATE_ID, {
        intentData: intentA,
        userId: USER_ID,
      });

      const queryStart = url.indexOf('?');
      const intentParam = queryStart >= 0
        ? new URLSearchParams(url.slice(queryStart + 1)).get('intentData')
        : null;
      expect(intentParam).toBeTruthy();

      const parsed = JSON.parse(decodeURIComponent(intentParam!));
      expect(parsed.type).toBe('intent');
      expect(parsed.product.id).toBe(productA.id);
      expect(parsed.product.name).toBe(productA.name);
      expect(parsed.product.price).toBe(productA.price);
    });

    it('builds URL with Product B intentData when creating intent for Product B (not Product A)', () => {
      const intentB = intentDataForProduct(productB);
      const url = buildMandateAppUrl(MANDATE_ID, {
        intentData: intentB,
        userId: USER_ID,
      });

      const queryStart = url.indexOf('?');
      const intentParam = queryStart >= 0
        ? new URLSearchParams(url.slice(queryStart + 1)).get('intentData')
        : null;
      const parsed = JSON.parse(decodeURIComponent(intentParam!));

      expect(parsed.product.id).toBe(productB.id);
      expect(parsed.product.name).toBe(productB.name);
      expect(parsed.product.name).not.toBe(productA.name);
    });

    it('Product A and Product B intent URLs contain different product data', () => {
      const urlA = buildMandateAppUrl(MANDATE_ID, {
        intentData: intentDataForProduct(productA),
        userId: USER_ID,
      });
      const urlB = buildMandateAppUrl(MANDATE_ID, {
        intentData: intentDataForProduct(productB),
        userId: USER_ID,
      });

      const parseIntentFromUrl = (u: string) => {
        const idx = u.indexOf('?');
        const param = idx >= 0 ? new URLSearchParams(u.slice(idx + 1)).get('intentData') : null;
        return param ? JSON.parse(decodeURIComponent(param)) : null;
      };

      const intentA = parseIntentFromUrl(urlA);
      const intentB = parseIntentFromUrl(urlB);

      expect(intentA.product.id).not.toBe(intentB.product.id);
      expect(intentA.product.name).not.toBe(intentB.product.name);
    });
  });

  describe('Mixed flow - Buy A then Intent B', () => {
    it('cart URL for A and intent URL for B both contain correct products', () => {
      const urlCartA = buildMandateAppUrl(MANDATE_ID, {
        cartData: cartDataForProduct(productA),
        userId: USER_ID,
      });
      const urlIntentB = buildMandateAppUrl(MANDATE_ID, {
        intentData: intentDataForProduct(productB),
        userId: USER_ID,
      });

      const parseParam = (u: string, key: string) => {
        const idx = u.indexOf('?');
        return idx >= 0 ? new URLSearchParams(u.slice(idx + 1)).get(key) : null;
      };
      const cartParam = parseParam(urlCartA, 'cartData');
      const intentParam = parseParam(urlIntentB, 'intentData');

      const cartA = JSON.parse(decodeURIComponent(cartParam!));
      const intentB = JSON.parse(decodeURIComponent(intentParam!));

      expect(cartA.items[0].id).toBe(productA.id);
      expect(intentB.product.id).toBe(productB.id);
      expect(cartA.items[0].id).not.toBe(intentB.product.id);
    });
  });
});
