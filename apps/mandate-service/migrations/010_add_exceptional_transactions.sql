-- Migration 010: Add exceptional transaction support for hierarchical limit overrides
-- When APP/User limits exceed merchant default limits, the transaction is allowed
-- but flagged as "exceptional" for admin review.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_exceptional BOOLEAN DEFAULT false;

-- Partial index: only index exceptional rows for efficient admin filtering
CREATE INDEX IF NOT EXISTS idx_transactions_exceptional
  ON transactions(is_exceptional) WHERE is_exceptional = true;
