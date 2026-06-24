-- Migration 011: Add disputes table for chargebacks & evidence management

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  mandate_id UUID REFERENCES agent_mandates(id),
  user_id TEXT NOT NULL,
  agent_id TEXT,
  merchant_id TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','investigating','evidence_submitted','won','lost','closed')),
  reason TEXT NOT NULL,
  dispute_amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  external_case_id TEXT,
  evidence_pack JSONB DEFAULT '{}',
  bau_push_status TEXT DEFAULT 'pending'
    CHECK (bau_push_status IN ('pending','pushed','failed','not_required')),
  bau_push_response JSONB,
  bau_pushed_at TIMESTAMPTZ,
  notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_disputes_transaction ON disputes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_merchant ON disputes(merchant_id);
