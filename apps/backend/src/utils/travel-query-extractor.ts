/**
 * Extract origin and destination from natural language flight/travel queries.
 * Used as a fallback when NLP parsing returns incorrect or missing values.
 * Handles patterns like:
 *   "flights from New York to Las Vegas"
 *   "New York to Las Vegas flights"
 *   "round trip flights Atlanta" (single-destination)
 *   "flights to Paris" (single-destination)
 */
export function extractOriginDestinationFromQuery(
  query: string
): { origin?: string; destination?: string } {
  const q = query.trim();
  const toIndex = q.toLowerCase().indexOf(' to ');

  // Pattern 1: "X to Y" — both origin and destination
  if (toIndex !== -1) {
    const beforeTo = q.slice(0, toIndex).trim();
    const afterTo = q.slice(toIndex + 4).trim();

    // Extract origin: remove "flights from", "from", "flight from" prefix
    const origin = beforeTo
      .replace(/^(?:round\s*trip\s+)?(?:flights?\s+)?(?:from\s+)?/i, '')
      .replace(/^(?:search\s+)?(?:for\s+)?/i, '')
      .replace(/^(?:book\s+)?(?:a\s+)?/i, '')
      .trim();

    // Extract destination: remove trailing "flights", "flight", etc.
    const destination = afterTo
      .replace(/\s+flights?\.?$/i, '')
      .replace(/\s+please\.?$/i, '')
      .replace(/\s+round\s*trip\.?$/i, '')
      .trim();

    // Require both to be non-empty and look like city names (at least 2 chars)
    if (
      origin &&
      destination &&
      origin.length >= 2 &&
      destination.length >= 2 &&
      origin !== destination
    ) {
      return { origin, destination };
    }
  }

  // Pattern 2: Single-destination queries (no " to " in the query)
  // e.g. "round trip flights Atlanta", "flights Atlanta", "book flights to Paris"
  const singleDestMatch = q.match(
    /(?:round\s*trip\s+)?(?:flights?\s+)(?:to\s+)?(.+?)(?:\s+flights?)?(?:\s+please)?$/i
  );
  if (singleDestMatch) {
    const destination = singleDestMatch[1]
      .replace(/\s+(?:round\s*trip|one\s*way|nonstop|direct)$/i, '')
      .trim();
    if (destination && destination.length >= 2) {
      return { destination };
    }
  }

  return {};
}
