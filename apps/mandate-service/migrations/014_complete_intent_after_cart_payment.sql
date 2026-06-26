-- Migration 014: Complete intent mandate ce014f24 that was paid via cart ccc073df
-- The intent mandate was not automatically completed because the completion flow
-- only marked cart mandates (linked to cart items) and did not resolve matching
-- intent mandates by productId. This is now fixed in the code.

UPDATE agent_mandates
SET status = 'completed',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'ce014f24-95df-4980-af71-03386760fe13'
  AND status = 'active'
  AND type = 'intent';
