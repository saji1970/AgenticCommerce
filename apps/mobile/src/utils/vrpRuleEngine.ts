import { VrpConsent } from '../services/payment-gateway.client';

// --- Types ---

export interface VrpConsentRules {
  isDefault?: boolean;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface RuleEvaluationContext {
  cartTotal: number;
  cartCategory?: string;
}

export interface RuleMatchResult {
  consent: VrpConsent;
  token: string;
  matchScore: number;
  matchReasons: string[];
}

// --- Rule extraction ---

export function extractRules(consent: VrpConsent): VrpConsentRules {
  try {
    const rules = consent.constraints?.rules;
    if (rules && typeof rules === 'object') {
      return rules as VrpConsentRules;
    }
  } catch {
    // malformed constraints
  }
  return {};
}

// --- Scoring ---

function scoreConsent(
  consent: VrpConsent,
  token: string,
  context: RuleEvaluationContext
): RuleMatchResult {
  const rules = extractRules(consent);
  let score = 0;
  const reasons: string[] = [];

  const hasCategory = !!rules.category;
  const hasMinAmount = typeof rules.minAmount === 'number';
  const hasMaxAmount = typeof rules.maxAmount === 'number';
  const hasAnySpecificRule = hasCategory || hasMinAmount || hasMaxAmount;

  // Default-only consent (no specific rules) => fallback score 0
  if (rules.isDefault && !hasAnySpecificRule) {
    return { consent, token, matchScore: 0, matchReasons: ['Default fallback'] };
  }

  // No rules at all => never auto-select
  if (!hasAnySpecificRule && !rules.isDefault) {
    return { consent, token, matchScore: -1, matchReasons: [] };
  }

  // Category match
  if (hasCategory && context.cartCategory) {
    if (rules.category!.toUpperCase() === context.cartCategory.toUpperCase()) {
      score += 10;
      reasons.push(`Category ${rules.category!.toUpperCase()}`);
    } else {
      // Category specified but doesn't match — penalise so it doesn't win
      score -= 5;
    }
  }

  // minAmount match
  if (hasMinAmount && context.cartTotal >= rules.minAmount!) {
    score += 5;
    reasons.push(`Amount >= $${rules.minAmount}`);
  } else if (hasMinAmount) {
    score -= 3; // cart below minimum
  }

  // maxAmount match
  if (hasMaxAmount && context.cartTotal <= rules.maxAmount!) {
    score += 5;
    reasons.push(`Amount <= $${rules.maxAmount}`);
  } else if (hasMaxAmount) {
    score -= 3; // cart above maximum
  }

  // Bonus for combined category + amount match
  if (
    hasCategory &&
    context.cartCategory &&
    rules.category!.toUpperCase() === context.cartCategory.toUpperCase() &&
    ((hasMinAmount && context.cartTotal >= rules.minAmount!) ||
      (hasMaxAmount && context.cartTotal <= rules.maxAmount!))
  ) {
    score += 3;
    reasons.push('Category + Amount combo');
  }

  return { consent, token, matchScore: score, matchReasons: reasons };
}

// --- Main evaluation ---

export function evaluateConsentRules(
  consents: VrpConsent[],
  tokens: Record<string, string>,
  context: RuleEvaluationContext
): RuleMatchResult | null {
  if (consents.length === 0) return null;

  const results: RuleMatchResult[] = consents
    .filter((c) => {
      const tok =
        typeof tokens[c.id] === 'string'
          ? tokens[c.id]
          : (tokens[c.id] as any)?.token;
      return !!tok;
    })
    .map((c) => {
      const tok =
        typeof tokens[c.id] === 'string'
          ? tokens[c.id]
          : (tokens[c.id] as any)?.token;
      return scoreConsent(c, tok, context);
    });

  if (results.length === 0) return null;

  // Sort: highest score first, then most recently created (tie-break)
  results.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    // More recent first
    return new Date(b.consent.createdAt).getTime() - new Date(a.consent.createdAt).getTime();
  });

  // 1. Best specific match (score > 0)
  const bestSpecific = results.find((r) => r.matchScore > 0);
  if (bestSpecific) return bestSpecific;

  // 2. Default fallback (score === 0)
  const defaultFallback = results.find((r) => r.matchScore === 0);
  if (defaultFallback) return defaultFallback;

  // 3. First active consent (backward-compatible)
  const first = results[0];
  return {
    ...first,
    matchScore: -1,
    matchReasons: ['First active consent (no rules matched)'],
  };
}

// --- Human-readable summary ---

export function getRuleSummary(rules: VrpConsentRules): string {
  const parts: string[] = [];

  if (rules.category) {
    parts.push(rules.category.toUpperCase());
  }
  if (typeof rules.minAmount === 'number') {
    parts.push(`$${rules.minAmount}+`);
  }
  if (typeof rules.maxAmount === 'number') {
    parts.push(`<= $${rules.maxAmount}`);
  }

  if (parts.length > 0) {
    const label = parts.join(', ');
    return rules.isDefault ? `${label} (Default)` : label;
  }

  if (rules.isDefault) return 'Default';
  return 'No rules';
}

// --- Cart category inference ---

export function inferCartCategory(
  items: Array<{ productId: string }>,
  categoryMap: Record<string, string>
): string | undefined {
  if (!items.length || !categoryMap || Object.keys(categoryMap).length === 0) {
    return undefined;
  }

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
    if (count > maxCount) {
      maxCount = count;
      dominant = cat;
    }
  }
  return dominant;
}
