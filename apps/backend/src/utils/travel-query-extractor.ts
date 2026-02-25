/**
 * Extract origin and destination from natural language flight/travel queries.
 * Used as a fallback when NLP parsing returns incorrect or missing values.
 * Handles patterns like "flights from New York to Las Vegas", "New York to Las Vegas flights".
 */
export function extractOriginDestinationFromQuery(
  query: string
): { origin?: string; destination?: string } {
  const q = query.trim();
  const toIndex = q.toLowerCase().indexOf(' to ');
  if (toIndex === -1) return {};

  const beforeTo = q.slice(0, toIndex).trim();
  const afterTo = q.slice(toIndex + 4).trim();

  // Extract origin: remove "flights from", "from", "flight from" prefix
  const origin = beforeTo
    .replace(/^(?:flights?\s+)?(?:from\s+)?/i, '')
    .replace(/^(?:search\s+)?(?:for\s+)?/i, '')
    .trim();

  // Extract destination: remove trailing "flights", "flight", etc.
  const destination = afterTo
    .replace(/\s+flights?\.?$/i, '')
    .replace(/\s+please\.?$/i, '')
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
  return {};
}
