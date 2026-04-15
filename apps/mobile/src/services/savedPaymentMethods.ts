import AsyncStorage from '@react-native-async-storage/async-storage';

/** Must match `PaymentMethodsScreen` storage key */
export const PAYMENT_METHODS_STORAGE_KEY = 'payment_methods';

export type SavedPaymentMethodType = 'card' | 'paypal' | 'apple_pay';

/** Local profile payment method (non-sensitive fields for MCP / display). */
export interface SavedPaymentMethodDescriptor {
  id?: string;
  type: SavedPaymentMethodType;
  label: string;
  last4?: string;
  /** e.g. Visa, Mastercard — optional hint for MCP */
  network?: string;
}

/**
 * Demo cards aligned with card MCP server examples (Chase Visa + Amex).
 * IDs are stable so we only merge once per install.
 */
export const DEMO_PROFILE_PAYMENT_METHODS = [
  {
    id: 'demo_chase_visa_mcp',
    type: 'card' as const,
    label: 'Chase Visa ••••4242',
    last4: '4242',
    cardholderName: 'Demo User',
    expiry: '12/29',
    isDefault: false,
    createdAt: '2026-01-15T00:00:00.000Z',
    network: 'Visa',
  },
  {
    id: 'demo_amex_mcp',
    type: 'card' as const,
    label: 'American Express ••••0005',
    last4: '0005',
    cardholderName: 'Demo User',
    expiry: '12/29',
    isDefault: false,
    createdAt: '2026-01-15T00:00:00.000Z',
    network: 'Amex',
  },
];

/**
 * Inserts demo Chase + Amex cards if missing (matches cardMCPServer demo configuration).
 */
export async function ensureDemoPaymentMethodsMerged(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PAYMENT_METHODS_STORAGE_KEY);
    let list = raw ? (JSON.parse(raw) as Array<{ id?: string }>) : [];
    if (!Array.isArray(list)) list = [];

    const ids = new Set(list.map((m) => m.id).filter(Boolean));
    let changed = false;
    for (const demo of DEMO_PROFILE_PAYMENT_METHODS) {
      if (!ids.has(demo.id)) {
        list.push(demo);
        ids.add(demo.id);
        changed = true;
      }
    }
    if (changed) {
      await AsyncStorage.setItem(PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('[savedPaymentMethods] ensureDemoPaymentMethodsMerged:', e);
  }
}

/**
 * Loads saved payment methods from Profile → Payment Methods (AsyncStorage).
 * Only descriptors are returned (no full card numbers).
 */
export async function loadSavedPaymentMethodsForMcp(): Promise<SavedPaymentMethodDescriptor[]> {
  await ensureDemoPaymentMethodsMerged();
  try {
    const raw = await AsyncStorage.getItem(PAYMENT_METHODS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{
      id?: string;
      type: SavedPaymentMethodType;
      label: string;
      last4?: string;
      cardholderName?: string;
      network?: string;
    }>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m) => ({
      id: m.id,
      type: m.type,
      label: m.label || m.type,
      last4: m.last4,
      network: m.network || inferNetworkFromLabel(m.label),
    }));
  } catch {
    return [];
  }
}

function inferNetworkFromLabel(label: string): string | undefined {
  const l = (label || '').toLowerCase();
  if (l.includes('visa') || l.includes('chase')) return 'Visa';
  if (l.includes('mastercard') || l.includes('master')) return 'Mastercard';
  if (l.includes('amex') || l.includes('american express')) return 'Amex';
  if (l.includes('discover')) return 'Discover';
  return undefined;
}
