-- Migration 008: Add 'completed' to agent_mandates status CHECK
-- Mandates are marked completed after successful payment

ALTER TABLE agent_mandates DROP CONSTRAINT IF EXISTS agent_mandates_status_check;
ALTER TABLE agent_mandates ADD CONSTRAINT agent_mandates_status_check
  CHECK (status IN ('pending', 'active', 'completed', 'suspended', 'revoked', 'expired'));
