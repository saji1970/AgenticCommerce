/**
 * ISO8583 Message Builder for Card-on-File (CoF) CIT/MIT transactions.
 *
 * Builds ISO8583-style authorization messages. The actual network transport
 * is handled by a pluggable NetworkAdapter (see ../network/).
 */

export interface ISO8583Message {
  mti: string;
  fields: Record<number, string | number>;
  rawFields: Record<string, string>;
}

export interface CITInput {
  pan: string;
  amount: number;
  currency?: string;
  terminalId?: string;
  merchantId?: string;
  mandateId: string;
}

export interface MITInput {
  networkToken: string;
  amount: number;
  currency?: string;
  originalCitTransactionId: string;
  mandateId: string;
}

let stanCounter = 0;

/** Generate a 6-digit System Trace Audit Number (DE11). */
export function generateSTAN(): string {
  stanCounter = (stanCounter + 1) % 1_000_000;
  return String(stanCounter).padStart(6, '0');
}

/** Format current timestamp as MMDDHHmmss for DE7 (Transmission Date & Time). */
export function formatDE7(date: Date = new Date()): string {
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${mm}${dd}${hh}${min}${ss}`;
}

/** Mask a PAN for logging: first 6 + last 4, middle replaced with *. */
export function maskPAN(pan: string): string {
  if (pan.length <= 10) return '****' + pan.slice(-4);
  return pan.slice(0, 6) + '*'.repeat(pan.length - 10) + pan.slice(-4);
}

/** Format amount in minor units (cents) for DE4 — 12-digit numeric string. */
function formatAmount(amount: number): string {
  const cents = Math.round(amount * 100);
  return String(cents).padStart(12, '0');
}

/** Map 3-letter currency code to ISO4217 numeric code for DE49. */
function currencyNumeric(code: string): string {
  const map: Record<string, string> = { USD: '840', EUR: '978', GBP: '826' };
  return map[code.toUpperCase()] || '840';
}

/**
 * Build a CIT (Customer-Initiated Transaction) authorization message.
 * MTI 0100 — initial credential-on-file storage authorization.
 */
export function buildCITAuthorization(input: CITInput): ISO8583Message {
  const stan = generateSTAN();
  const de7 = formatDE7();

  const fields: Record<number, string | number> = {
    2: input.pan,                                  // Primary Account Number
    3: '000000',                                   // Processing Code (purchase)
    4: formatAmount(input.amount),                 // Amount
    7: de7,                                        // Transmission Date & Time
    11: stan,                                      // STAN
    22: '051',                                     // POS Entry Mode (e-commerce)
    41: input.terminalId || 'AGENTIC1',            // Terminal ID
    42: input.merchantId || 'AGENTICCOMM001',      // Merchant ID
    48: 'CIT_INITIAL',                             // Additional Data — CoF indicator
    49: currencyNumeric(input.currency || 'USD'),  // Currency Code
  };

  const rawFields: Record<string, string> = {
    MTI: '0100',
    DE2_PAN: maskPAN(input.pan),
    DE3_ProcessingCode: '000000',
    DE4_Amount: formatAmount(input.amount),
    DE7_TransmissionDateTime: de7,
    DE11_STAN: stan,
    DE22_POSEntryMode: '051',
    DE41_TerminalId: fields[41] as string,
    DE42_MerchantId: fields[42] as string,
    DE48_CoFIndicator: 'CIT_INITIAL',
    DE49_Currency: fields[49] as string,
    MandateId: input.mandateId,
  };

  return { mti: '0100', fields, rawFields };
}

/**
 * Build an MIT (Merchant-Initiated Transaction) authorization message.
 * MTI 0100 — subsequent credential-on-file transaction using network token.
 */
export function buildMITAuthorization(input: MITInput): ISO8583Message {
  const stan = generateSTAN();
  const de7 = formatDE7();

  const fields: Record<number, string | number> = {
    2: input.networkToken,                            // Network Token (replaces PAN)
    4: formatAmount(input.amount),                    // Amount
    7: de7,                                           // Transmission Date & Time
    11: stan,                                         // STAN
    25: '08',                                         // POS Condition Code (recurring/MIT)
    48: 'MIT_SUBSEQUENT',                             // Additional Data — CoF indicator
    49: currencyNumeric(input.currency || 'USD'),     // Currency Code
    63: input.originalCitTransactionId,               // Original CIT reference
  };

  const rawFields: Record<string, string> = {
    MTI: '0100',
    DE2_NetworkToken: maskPAN(input.networkToken),
    DE4_Amount: formatAmount(input.amount),
    DE7_TransmissionDateTime: de7,
    DE11_STAN: stan,
    DE25_POSConditionCode: '08',
    DE48_CoFIndicator: 'MIT_SUBSEQUENT',
    DE49_Currency: fields[49] as string,
    DE63_OriginalCitRef: input.originalCitTransactionId,
    MandateId: input.mandateId,
  };

  return { mti: '0100', fields, rawFields };
}
