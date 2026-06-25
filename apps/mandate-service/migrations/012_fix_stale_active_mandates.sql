-- Migration 012: Fix stale active cart/intent mandates
-- These mandates had transactions completed but were never marked as completed
-- because mandateId was not being passed to cart items (fixed in commit 65569e3).

-- Mark all active cart/intent mandates as completed where updated_at != created_at
-- (indicating activity occurred after creation, e.g. the item was purchased)
UPDATE agent_mandates
SET status = 'completed',
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'active'
  AND type IN ('cart', 'intent')
  AND updated_at > created_at + interval '1 second';

-- Also complete any cart/intent mandates that have linked transactions
UPDATE agent_mandates
SET status = 'completed',
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'active'
  AND type IN ('cart', 'intent')
  AND id IN (SELECT DISTINCT mandate_id FROM transactions WHERE mandate_id IS NOT NULL);
