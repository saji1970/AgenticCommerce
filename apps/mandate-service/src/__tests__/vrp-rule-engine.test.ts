/**
 * VRP Rule Engine Tests
 * Tests: rule extraction, scoring, consent selection, category inference, rule summaries.
 */

// Inline types matching apps/mobile/src/utils/vrpRuleEngine.ts
// (mandate-service tests can't import from mobile, so we replicate the pure logic here)

interface VrpConsentRules {
  isDefault?: boolean;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
}

interface RuleEvaluationContext {
  cartTotal: number;
  cartCategory?: string;
}

interface MockConsent {
  id: string;
  agentId: string;
  agentName: string;
  status: string;
  constraints: Record<string, any>;
  createdAt: string;
  [key: string]: any;
}

interface RuleMatchResult {
  consent: MockConsent;
  token: string;
  matchScore: number;
  matchReasons: string[];
}

// --- Replicated rule engine logic (pure functions, no RN dependencies) ---

function extractRules(consent: MockConsent): VrpConsentRules {
  try {
    const rules = consent.constraints?.rules;
    if (rules && typeof rules === 'object') return rules as VrpConsentRules;
  } catch { /* */ }
  return {};
}

function scoreConsent(consent: MockConsent, token: string, context: RuleEvaluationContext): RuleMatchResult {
  const rules = extractRules(consent);
  let score = 0;
  const reasons: string[] = [];
  const hasCategory = !!rules.category;
  const hasMinAmount = typeof rules.minAmount === 'number';
  const hasMaxAmount = typeof rules.maxAmount === 'number';
  const hasAnySpecificRule = hasCategory || hasMinAmount || hasMaxAmount;

  if (rules.isDefault && !hasAnySpecificRule) {
    return { consent, token, matchScore: 0, matchReasons: ['Default fallback'] };
  }
  if (!hasAnySpecificRule && !rules.isDefault) {
    return { consent, token, matchScore: -1, matchReasons: [] };
  }

  if (hasCategory && context.cartCategory) {
    if (rules.category!.toUpperCase() === context.cartCategory.toUpperCase()) {
      score += 10;
      reasons.push(`Category ${rules.category!.toUpperCase()}`);
    } else {
      score -= 5;
    }
  }
  if (hasMinAmount && context.cartTotal >= rules.minAmount!) {
    score += 5;
    reasons.push(`Amount >= $${rules.minAmount}`);
  } else if (hasMinAmount) {
    score -= 3;
  }
  if (hasMaxAmount && context.cartTotal <= rules.maxAmount!) {
    score += 5;
    reasons.push(`Amount <= $${rules.maxAmount}`);
  } else if (hasMaxAmount) {
    score -= 3;
  }
  if (
    hasCategory && context.cartCategory &&
    rules.category!.toUpperCase() === context.cartCategory.toUpperCase() &&
    ((hasMinAmount && context.cartTotal >= rules.minAmount!) ||
      (hasMaxAmount && context.cartTotal <= rules.maxAmount!))
  ) {
    score += 3;
    reasons.push('Category + Amount combo');
  }

  return { consent, token, matchScore: score, matchReasons: reasons };
}

function evaluateConsentRules(
  consents: MockConsent[],
  tokens: Record<string, string>,
  context: RuleEvaluationContext
): RuleMatchResult | null {
  if (consents.length === 0) return null;
  const results = consents
    .filter((c) => !!tokens[c.id])
    .map((c) => scoreConsent(c, tokens[c.id], context));
  if (results.length === 0) return null;

  results.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return new Date(b.consent.createdAt).getTime() - new Date(a.consent.createdAt).getTime();
  });

  const bestSpecific = results.find((r) => r.matchScore > 0);
  if (bestSpecific) return bestSpecific;
  const defaultFallback = results.find((r) => r.matchScore === 0);
  if (defaultFallback) return defaultFallback;
  return { ...results[0], matchScore: -1, matchReasons: ['First active consent (no rules matched)'] };
}

function getRuleSummary(rules: VrpConsentRules): string {
  const parts: string[] = [];
  if (rules.category) parts.push(rules.category.toUpperCase());
  if (typeof rules.minAmount === 'number') parts.push(`$${rules.minAmount}+`);
  if (typeof rules.maxAmount === 'number') parts.push(`<= $${rules.maxAmount}`);
  if (parts.length > 0) {
    const label = parts.join(', ');
    return rules.isDefault ? `${label} (Default)` : label;
  }
  if (rules.isDefault) return 'Default';
  return 'No rules';
}

function inferCartCategory(
  items: Array<{ productId: string }>,
  categoryMap: Record<string, string>
): string | undefined {
  if (!items.length || !categoryMap || Object.keys(categoryMap).length === 0) return undefined;
  const counts: Record<string, number> = {};
  for (const item of items) {
    const cat = categoryMap[item.productId];
    if (cat) {
      const upper = cat.toUpperCase();
      counts[upper] = (counts[upper] || 0) + 1;
    }
  }
  let dominant: string | undefined;
  let maxCount = 0;
  for (const [cat, count] of Object.entries(counts)) {
    if (count > maxCount) { maxCount = count; dominant = cat; }
  }
  return dominant;
}

// --- Helpers ---

function makeConsent(overrides: Partial<MockConsent> = {}): MockConsent {
  return {
    id: `consent-${Math.random().toString(36).slice(2, 8)}`,
    agentId: 'default-shopping-agent',
    agentName: 'Shopping Assistant',
    status: 'active',
    constraints: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// --- Tests ---

describe('VRP Rule Engine', () => {
  describe('extractRules', () => {
    it('returns empty object for consent with no constraints', () => {
      const consent = makeConsent({ constraints: {} });
      expect(extractRules(consent)).toEqual({});
    });

    it('returns rules from constraints.rules', () => {
      const consent = makeConsent({
        constraints: { rules: { isDefault: true, category: 'TRAVEL' } },
      });
      expect(extractRules(consent)).toEqual({ isDefault: true, category: 'TRAVEL' });
    });

    it('handles malformed constraints gracefully', () => {
      const consent = makeConsent({ constraints: { rules: 'invalid' } });
      // string is typeof 'object' === false, so returns {}
      expect(extractRules(consent)).toEqual({});
    });
  });

  describe('getRuleSummary', () => {
    it('returns "No rules" for empty rules', () => {
      expect(getRuleSummary({})).toBe('No rules');
    });

    it('returns "Default" for default-only', () => {
      expect(getRuleSummary({ isDefault: true })).toBe('Default');
    });

    it('returns category label', () => {
      expect(getRuleSummary({ category: 'travel' })).toBe('TRAVEL');
    });

    it('returns combined category + amount', () => {
      expect(getRuleSummary({ category: 'TRAVEL', minAmount: 500 })).toBe('TRAVEL, $500+');
    });

    it('returns max amount label', () => {
      expect(getRuleSummary({ maxAmount: 200 })).toBe('<= $200');
    });

    it('appends (Default) when isDefault + specific rules', () => {
      expect(getRuleSummary({ isDefault: true, category: 'FOOD' })).toBe('FOOD (Default)');
    });
  });

  describe('inferCartCategory', () => {
    it('returns undefined for empty items', () => {
      expect(inferCartCategory([], { p1: 'TRAVEL' })).toBeUndefined();
    });

    it('returns undefined for empty category map', () => {
      expect(inferCartCategory([{ productId: 'p1' }], {})).toBeUndefined();
    });

    it('returns dominant category', () => {
      const items = [{ productId: 'p1' }, { productId: 'p2' }, { productId: 'p3' }];
      const map = { p1: 'TRAVEL', p2: 'TRAVEL', p3: 'FOOD' };
      expect(inferCartCategory(items, map)).toBe('TRAVEL');
    });

    it('handles single item', () => {
      expect(inferCartCategory([{ productId: 'p1' }], { p1: 'electronics' })).toBe('ELECTRONICS');
    });
  });

  describe('scoreConsent / evaluateConsentRules', () => {
    it('selects category-matched consent over default', () => {
      const defaultConsent = makeConsent({
        id: 'c-default',
        constraints: { rules: { isDefault: true } },
        createdAt: '2025-01-01T00:00:00Z',
      });
      const travelConsent = makeConsent({
        id: 'c-travel',
        constraints: { rules: { category: 'TRAVEL' } },
        createdAt: '2025-01-02T00:00:00Z',
      });
      const tokens = { 'c-default': 'tok-def', 'c-travel': 'tok-trv' };
      const result = evaluateConsentRules(
        [defaultConsent, travelConsent],
        tokens,
        { cartTotal: 300, cartCategory: 'TRAVEL' }
      );
      expect(result).not.toBeNull();
      expect(result!.consent.id).toBe('c-travel');
      expect(result!.matchScore).toBeGreaterThan(0);
      expect(result!.matchReasons).toContain('Category TRAVEL');
    });

    it('falls back to default when no category match', () => {
      const defaultConsent = makeConsent({
        id: 'c-default',
        constraints: { rules: { isDefault: true } },
      });
      const travelConsent = makeConsent({
        id: 'c-travel',
        constraints: { rules: { category: 'TRAVEL' } },
      });
      const tokens = { 'c-default': 'tok-def', 'c-travel': 'tok-trv' };
      const result = evaluateConsentRules(
        [defaultConsent, travelConsent],
        tokens,
        { cartTotal: 50, cartCategory: 'FOOD' }
      );
      expect(result).not.toBeNull();
      expect(result!.consent.id).toBe('c-default');
      expect(result!.matchReasons).toContain('Default fallback');
    });

    it('selects amount-matched consent', () => {
      const smallConsent = makeConsent({
        id: 'c-small',
        constraints: { rules: { maxAmount: 100 } },
      });
      const largeConsent = makeConsent({
        id: 'c-large',
        constraints: { rules: { minAmount: 500 } },
      });
      const tokens = { 'c-small': 'tok-sm', 'c-large': 'tok-lg' };

      const result = evaluateConsentRules(
        [smallConsent, largeConsent],
        tokens,
        { cartTotal: 750 }
      );
      expect(result).not.toBeNull();
      expect(result!.consent.id).toBe('c-large');
    });

    it('gives combo bonus for category + amount match', () => {
      const consent = makeConsent({
        id: 'c-combo',
        constraints: { rules: { category: 'TRAVEL', minAmount: 200 } },
      });
      const tokens = { 'c-combo': 'tok-combo' };
      const result = evaluateConsentRules(
        [consent],
        tokens,
        { cartTotal: 500, cartCategory: 'TRAVEL' }
      );
      expect(result).not.toBeNull();
      expect(result!.matchScore).toBe(10 + 5 + 3); // category + minAmount + combo
      expect(result!.matchReasons).toContain('Category + Amount combo');
    });

    it('returns null for empty consents array', () => {
      expect(evaluateConsentRules([], {}, { cartTotal: 100 })).toBeNull();
    });

    it('returns null when no tokens available', () => {
      const consent = makeConsent({ id: 'c1' });
      expect(evaluateConsentRules([consent], {}, { cartTotal: 100 })).toBeNull();
    });

    it('backward-compatible: selects first consent when no rules configured', () => {
      const consent = makeConsent({ id: 'c-norules', constraints: {} });
      const tokens = { 'c-norules': 'tok-nr' };
      const result = evaluateConsentRules([consent], tokens, { cartTotal: 100 });
      expect(result).not.toBeNull();
      expect(result!.consent.id).toBe('c-norules');
      expect(result!.matchScore).toBe(-1);
    });

    it('tie-breaks by most recently created', () => {
      const older = makeConsent({
        id: 'c-old',
        constraints: { rules: { category: 'TRAVEL' } },
        createdAt: '2025-01-01T00:00:00Z',
      });
      const newer = makeConsent({
        id: 'c-new',
        constraints: { rules: { category: 'TRAVEL' } },
        createdAt: '2025-06-01T00:00:00Z',
      });
      const tokens = { 'c-old': 'tok-old', 'c-new': 'tok-new' };
      const result = evaluateConsentRules(
        [older, newer],
        tokens,
        { cartTotal: 300, cartCategory: 'TRAVEL' }
      );
      expect(result!.consent.id).toBe('c-new');
    });
  });
});
