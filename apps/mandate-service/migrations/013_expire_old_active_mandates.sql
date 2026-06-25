-- Migration 013: Expire active mandates older than 20 days
-- Stale mandates that have been sitting active for too long should be expired.

UPDATE agent_mandates
SET status = 'expired',
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'active'
  AND created_at < CURRENT_TIMESTAMP - interval '20 days';
