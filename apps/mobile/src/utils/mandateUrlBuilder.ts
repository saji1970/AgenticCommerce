/**
 * Pure URL builder for Mandate app deep links.
 * No React Native dependencies - safe for unit testing.
 */

export interface CartItemData {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface CartData {
  items: CartItemData[];
  total: number;
  agentName: string;
}

export interface OpenMandateAppOptions {
  cartData?: CartData;
  intentData?: { type: string; product: any; maxPrice: number; reasoning?: string; agentName: string };
  userId?: string;
  userName?: string;
}

const MANDATE_APP_SCHEME = 'mandate://mandate';

/**
 * Build the Mandate app deep link URL (pure function, for testing)
 */
export function buildMandateAppUrl(
  mandateId: string,
  options?: OpenMandateAppOptions | CartData
): string {
  const opts: OpenMandateAppOptions =
    options && 'items' in options && Array.isArray((options as CartData).items)
      ? { cartData: options as CartData }
      : (options as OpenMandateAppOptions) || {};

  const { cartData, intentData, userId, userName } = opts;

  const params = new URLSearchParams();
  if (cartData) {
    params.set('cartData', JSON.stringify(cartData));
  }
  if (intentData) {
    params.set('intentData', encodeURIComponent(JSON.stringify(intentData)));
  }
  if (userId) {
    params.set('userId', userId);
  }
  if (userName) {
    params.set('userName', encodeURIComponent(userName));
  }
  const query = params.toString();
  return `${MANDATE_APP_SCHEME}/${mandateId}${query ? `?${query}` : ''}`;
}
