-- Quote tracking table for admin visibility
-- Stores metadata when PDFs are generated (PDF itself not stored)

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quote identification
  quote_reference TEXT NOT NULL UNIQUE,  -- MQ-20251216-XXXX
  version INT NOT NULL DEFAULT 1,        -- Version number for revisions

  -- Client details
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_title TEXT,

  -- Quote details
  quote_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'EUR', 'GBP', 'INR')),
  total_value DECIMAL(15, 2) NOT NULL,

  -- Line items (stored as JSONB for flexibility)
  line_items JSONB NOT NULL DEFAULT '[]',

  -- AM tracking
  prepared_by TEXT NOT NULL,

  -- Deal context (internal notes)
  deal_context JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_quotes_prepared_by ON quotes(prepared_by);
CREATE INDEX idx_quotes_company_name ON quotes(company_name);
CREATE INDEX idx_quotes_contact_email ON quotes(contact_email);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX idx_quotes_quote_date ON quotes(quote_date DESC);

-- Composite index for versioning (find latest version for a client)
CREATE INDEX idx_quotes_client_version ON quotes(contact_email, company_name, version DESC);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quotes_updated_at();

-- RLS policies (allow all for now since this is internal tool)
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (internal tool, password-protected)
CREATE POLICY "Allow all quote operations" ON quotes
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE quotes IS 'Tracks all generated quotes for admin visibility';
COMMENT ON COLUMN quotes.version IS 'Increments when a revised quote is sent to same client';
COMMENT ON COLUMN quotes.line_items IS 'Array of {term, users, consultingHours, investment}';
COMMENT ON COLUMN quotes.deal_context IS 'Internal notes: discountReason, specialTerms, urgency, decisionDate';
