/**
 * Robust price extraction utility for Google Shopping and other sources
 * Handles various price formats, currencies, and edge cases
 */

export interface ExtractedPrice {
  value: number | null;
  currency: string;
  original: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Extract price from various Google Shopping pagemap structures
 */
export function extractPriceFromPagemap(pagemap: any): ExtractedPrice | null {
  if (!pagemap) return null;

  // Try multiple pagemap structures in order of reliability
  const priceSources = [
    // Structured offer data (most reliable)
    pagemap.offer?.[0]?.price,
    pagemap.offer?.[0]?.priceCurrency,
    
    // Product structured data
    pagemap.product?.[0]?.offers?.price,
    pagemap.product?.[0]?.offers?.priceCurrency,
    pagemap.product?.[0]?.price,
    pagemap.product?.[0]?.priceCurrency,
    
    // Aggregate rating (sometimes contains price)
    pagemap.aggregaterating?.[0]?.price,
    
    // Generic price field
    pagemap.price,
    
    // Schema.org Offer
    pagemap['http://schema.org/offer']?.[0]?.price,
    pagemap['http://schema.org/product']?.[0]?.offers?.price,
    
    // Try nested structures
    pagemap.product?.[0]?.aggregateoffer?.lowprice,
    pagemap.product?.[0]?.aggregateoffer?.highprice,
    pagemap.product?.[0]?.aggregateoffer?.pricecurrency,
  ];

  let priceValue: any = null;
  let currency: string = 'USD';
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // Find first non-null price value
  for (let i = 0; i < priceSources.length; i++) {
    const source = priceSources[i];
    if (source != null && source !== '') {
      // Check if this is a currency field
      if (typeof source === 'string' && source.length === 3 && /^[A-Z]{3}$/.test(source)) {
        currency = source;
        continue;
      }
      
      // Check if this is a price value
      if (typeof source === 'number' || (typeof source === 'string' && /[\d.,]/.test(source))) {
        priceValue = source;
        // Higher confidence for structured data (first few sources)
        confidence = i < 4 ? 'high' : i < 8 ? 'medium' : 'low';
        break;
      }
    }
  }

  // Also extract currency from pagemap if not found
  if (!currency || currency === 'USD') {
    const currencySources = [
      pagemap.offer?.[0]?.pricecurrency,
      pagemap.product?.[0]?.offers?.pricecurrency,
      pagemap.product?.[0]?.pricecurrency,
      pagemap.pricecurrency,
      pagemap.product?.[0]?.aggregateoffer?.pricecurrency,
    ];
    
    for (const curr of currencySources) {
      if (curr && typeof curr === 'string' && /^[A-Z]{3}$/.test(curr)) {
        currency = curr;
        break;
      }
    }
  }

  if (!priceValue) return null;

  return parsePrice(priceValue, currency, confidence);
}

/**
 * Extract price from text snippet using multiple patterns
 */
export function extractPriceFromText(text: string, defaultCurrency: string = 'USD'): ExtractedPrice | null {
  if (!text || typeof text !== 'string') return null;

  // Multiple price patterns to try (in order of specificity)
  const pricePatterns = [
    // Standard formats: $1,299.99, $1299.99, $1,299, $1299
    /\$[\s]*([\d,]+\.?\d*)/,
    // Currency codes: USD 1299.99, EUR 1,299.99, 1299.99 USD
    /(?:USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY|INR|BRL|MXN|KRW|SGD|HKD|NZD|SEK|NOK|DKK|PLN|ZAR|RUB)[\s]*([\d,]+\.?\d*)/i,
    /([\d,]+\.?\d*)[\s]*(?:USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY|INR|BRL|MXN|KRW|SGD|HKD|NZD|SEK|NOK|DKK|PLN|ZAR|RUB)/i,
    // Generic number with currency symbol: €1,299.99, £1,299.99, ¥1299.99, ₹1,299.99
    /[€£¥₹₽₩₨₪₫₦₨₩][\s]*([\d,]+\.?\d*)/,
    // Price range: $100-$200, $100 to $200
    /\$[\s]*([\d,]+\.?\d*)[\s]*(?:-|to|–)[\s]*\$/,
    // "From $X" or "Starting at $X"
    /(?:from|starting\s+at|as\s+low\s+as)[\s]*\$[\s]*([\d,]+\.?\d*)/i,
    // "Only $X" or "Just $X"
    /(?:only|just)[\s]*\$[\s]*([\d,]+\.?\d*)/i,
    // Generic number (last resort, lower confidence)
    /\b([\d,]{2,}\.?\d*)\b/,
  ];

  let bestMatch: ExtractedPrice | null = null;
  let bestConfidence: 'high' | 'medium' | 'low' = 'low';

  for (let i = 0; i < pricePatterns.length; i++) {
    const pattern = pricePatterns[i];
    const match = text.match(pattern);
    
    if (match && match[1]) {
      const priceStr = match[1];
      const confidence: 'high' | 'medium' | 'low' = i < 3 ? 'high' : i < 6 ? 'medium' : 'low';
      
      // Extract currency if found in pattern
      let currency = defaultCurrency;
      if (match[0]) {
        const currencyMatch = match[0].match(/(USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY|INR|BRL|MXN|KRW|SGD|HKD|NZD|SEK|NOK|DKK|PLN|ZAR|RUB)/i);
        if (currencyMatch) {
          currency = currencyMatch[1].toUpperCase();
        } else if (match[0].includes('€')) currency = 'EUR';
        else if (match[0].includes('£')) currency = 'GBP';
        else if (match[0].includes('¥')) currency = 'JPY';
        else if (match[0].includes('₹')) currency = 'INR';
        else if (match[0].includes('₽')) currency = 'RUB';
        else if (match[0].includes('₩')) currency = 'KRW';
      }

      const parsed = parsePrice(priceStr, currency, confidence);
      
      // Prefer higher confidence matches
      if (!bestMatch || (
        (confidence === 'high' && bestConfidence !== 'high') ||
        (confidence === 'medium' && bestConfidence === 'low')
      )) {
        bestMatch = parsed;
        bestConfidence = confidence;
        
        // If we found a high confidence match, use it
        if (confidence === 'high') break;
      }
    }
  }

  return bestMatch;
}

/**
 * Parse price string/number into normalized format
 */
export function parsePrice(
  priceValue: string | number,
  currency: string = 'USD',
  confidence: 'high' | 'medium' | 'low' = 'medium'
): ExtractedPrice {
  let priceStr: string;
  let original: string | null = null;

  if (typeof priceValue === 'number') {
    priceStr = String(priceValue);
    original = priceStr;
  } else if (typeof priceValue === 'string') {
    priceStr = priceValue.trim();
    original = priceStr;
  } else {
    return {
      value: null,
      currency,
      original: String(priceValue),
      confidence: 'low',
    };
  }

  // Remove currency symbols, commas, and whitespace
  priceStr = priceStr.replace(/[$€£¥₹₽₩₨₪₫₦₨₩,\s]/g, '');

  // Extract number (handle cases like "1299.99 USD" or "From $1299")
  const priceMatch = priceStr.match(/(\d+\.?\d*)/);
  if (!priceMatch) {
    return {
      value: null,
      currency,
      original,
      confidence: 'low',
    };
  }

  const numericValue = parseFloat(priceMatch[1]);
  
  // Validate price range (reasonable bounds)
  if (isNaN(numericValue) || numericValue < 0) {
    return {
      value: null,
      currency,
      original,
      confidence: 'low',
    };
  }

  // Flag suspicious prices but don't reject them (might be valid for expensive items)
  if (numericValue > 1000000) {
    console.warn(`⚠️  Very high price detected: ${original} (${numericValue})`);
    confidence = confidence === 'high' ? 'medium' : 'low';
  }

  if (numericValue < 0.01 && numericValue > 0) {
    console.warn(`⚠️  Very low price detected: ${original} (${numericValue})`);
    confidence = 'low';
  }

  return {
    value: numericValue,
    currency,
    original,
    confidence,
  };
}

/**
 * Comprehensive price extraction from Google Shopping result
 * Tries multiple sources and returns the best match
 */
export function extractPriceFromGoogleShoppingResult(result: any): ExtractedPrice | null {
  // Priority order: pagemap structured data > snippet text > title text
  
  // 1. Try pagemap first (most reliable)
  if (result.rawData || result.pagemap) {
    const pagemapPrice = extractPriceFromPagemap(result.rawData || result.pagemap);
    if (pagemapPrice && pagemapPrice.value != null && pagemapPrice.confidence === 'high') {
      return pagemapPrice;
    }
  }

  // 2. Try direct price field
  if (result.price) {
    const directPrice = parsePrice(result.price, result.currency || 'USD', 'medium');
    if (directPrice.value != null) {
      return directPrice;
    }
  }

  // 3. Try snippet text
  if (result.snippet) {
    const snippetPrice = extractPriceFromText(result.snippet, result.currency || 'USD');
    if (snippetPrice && snippetPrice.value != null && snippetPrice.confidence !== 'low') {
      return snippetPrice;
    }
  }

  // 4. Try title text (sometimes contains price)
  if (result.title) {
    const titlePrice = extractPriceFromText(result.title, result.currency || 'USD');
    if (titlePrice && titlePrice.value != null) {
      return titlePrice;
    }
  }

  // 5. Fallback to pagemap even if low confidence
  if (result.rawData || result.pagemap) {
    const pagemapPrice = extractPriceFromPagemap(result.rawData || result.pagemap);
    if (pagemapPrice && pagemapPrice.value != null) {
      return pagemapPrice;
    }
  }

  // 6. Last resort: snippet with low confidence
  if (result.snippet) {
    const snippetPrice = extractPriceFromText(result.snippet, result.currency || 'USD');
    if (snippetPrice && snippetPrice.value != null) {
      return snippetPrice;
    }
  }

  return null;
}
