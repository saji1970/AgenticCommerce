-- Migration 009: Add App Mandate support
-- Adds 'app' mandate type, parent-child mandate relationships,
-- payment methods, and mandate audit trail on cart/orders/payments

-- 1. Add 'app' to agent_mandates type CHECK
ALTER TABLE agent_mandates DROP CONSTRAINT IF EXISTS agent_mandates_type_check;
ALTER TABLE agent_mandates ADD CONSTRAINT agent_mandates_type_check
  CHECK (type IN ('cart', 'intent', 'payment', 'app'));

-- 2. Add parent_mandate_id + payment_methods to agent_mandates
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS parent_mandate_id UUID REFERENCES agent_mandates(id) ON DELETE SET NULL;
ALTER TABLE agent_mandates ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_agent_mandates_parent ON agent_mandates(parent_mandate_id);

-- 3. Add mandate tracking to cart_items
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS mandate_id UUID REFERENCES agent_mandates(id) ON DELETE SET NULL;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS mandate_token TEXT;
CREATE INDEX IF NOT EXISTS idx_cart_items_mandate ON cart_items(mandate_id);

-- 4. Add mandate audit trail to orders and payments
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mandate_tokens JSONB DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS app_mandate_id UUID REFERENCES agent_mandates(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mandate_tokens JSONB DEFAULT '[]'::jsonb;

-- 5. Add 'app' to agent_actions resource_type
ALTER TABLE agent_actions DROP CONSTRAINT IF EXISTS agent_actions_resource_type_check;
ALTER TABLE agent_actions ADD CONSTRAINT agent_actions_resource_type_check
  CHECK (resource_type IN ('cart', 'intent', 'payment', 'app'));
