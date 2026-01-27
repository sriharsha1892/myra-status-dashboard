-- Migration: Quote/MSA Deduplication and Lifecycle Tracking
-- Purpose: Add tracking fields + unique constraints to prevent duplicate entries

-- ============================================
-- QUOTES TABLE ENHANCEMENTS
-- ============================================

-- Add lifecycle tracking columns to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
  -- Values: draft, sent, downloaded, signed

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS first_sent_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Create unique index for deduplication based on content hash
-- This prevents creating duplicate quotes with identical content
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_content_hash
  ON quotes(content_hash) WHERE content_hash IS NOT NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- Index for first_sent_at filtering (for sent quotes reporting)
CREATE INDEX IF NOT EXISTS idx_quotes_first_sent_at ON quotes(first_sent_at) WHERE first_sent_at IS NOT NULL;

-- ============================================
-- MSAS TABLE ENHANCEMENTS
-- ============================================

-- Add lifecycle tracking columns to MSAs
ALTER TABLE msas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
  -- Values: draft, sent, downloaded, signed

ALTER TABLE msas ADD COLUMN IF NOT EXISTS first_sent_at TIMESTAMPTZ;
ALTER TABLE msas ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0;
ALTER TABLE msas ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Create unique index for deduplication based on content hash
CREATE UNIQUE INDEX IF NOT EXISTS idx_msas_content_hash
  ON msas(content_hash) WHERE content_hash IS NOT NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_msas_status ON msas(status);

-- Index for first_sent_at filtering
CREATE INDEX IF NOT EXISTS idx_msas_first_sent_at ON msas(first_sent_at) WHERE first_sent_at IS NOT NULL;

-- ============================================
-- VIEWS FOR UNIQUE QUOTE/MSA REPORTING
-- ============================================

-- View for unique quotes (latest version per client/company)
-- This deduplicates quotes by taking only the latest version for each contact+company combo
CREATE OR REPLACE VIEW quotes_unique AS
SELECT DISTINCT ON (contact_email, company_name) *
FROM quotes
ORDER BY contact_email, company_name, version DESC, created_at DESC;

-- View for unique MSAs (latest version per client/company)
CREATE OR REPLACE VIEW msas_unique AS
SELECT DISTINCT ON (contact_email, company_name) *
FROM msas
ORDER BY contact_email, company_name, version DESC, created_at DESC;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate content hash for quotes
-- This creates a deterministic hash based on key quote fields
CREATE OR REPLACE FUNCTION generate_quote_content_hash(
  p_company_name TEXT,
  p_contact_email TEXT,
  p_line_items JSONB,
  p_total_value NUMERIC,
  p_currency TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    sha256(
      convert_to(
        COALESCE(p_company_name, '') || '|' ||
        COALESCE(p_contact_email, '') || '|' ||
        COALESCE(p_line_items::TEXT, '[]') || '|' ||
        COALESCE(p_total_value::TEXT, '0') || '|' ||
        COALESCE(p_currency, 'USD'),
        'UTF8'
      )
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate content hash for MSAs
CREATE OR REPLACE FUNCTION generate_msa_content_hash(
  p_company_name TEXT,
  p_contact_email TEXT,
  p_line_items JSONB,
  p_total_value NUMERIC,
  p_currency TEXT,
  p_effective_date DATE
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    sha256(
      convert_to(
        COALESCE(p_company_name, '') || '|' ||
        COALESCE(p_contact_email, '') || '|' ||
        COALESCE(p_line_items::TEXT, '[]') || '|' ||
        COALESCE(p_total_value::TEXT, '0') || '|' ||
        COALESCE(p_currency, 'USD') || '|' ||
        COALESCE(p_effective_date::TEXT, ''),
        'UTF8'
      )
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- UPSERT FUNCTIONS FOR QUOTE/MSA CREATION
-- ============================================

-- Function to upsert a quote (insert or update existing based on content hash)
CREATE OR REPLACE FUNCTION upsert_quote(
  p_quote_reference TEXT,
  p_company_name TEXT,
  p_contact_name TEXT,
  p_contact_email TEXT,
  p_contact_title TEXT,
  p_quote_date DATE,
  p_valid_until DATE,
  p_currency TEXT,
  p_total_value NUMERIC,
  p_line_items JSONB,
  p_prepared_by TEXT,
  p_deal_context JSONB
) RETURNS TABLE(
  id UUID,
  quote_reference TEXT,
  version INT,
  is_new BOOLEAN,
  download_count INT
) AS $$
DECLARE
  v_content_hash TEXT;
  v_existing_id UUID;
  v_existing_version INT;
  v_existing_download_count INT;
  v_new_version INT;
  v_result_id UUID;
  v_result_reference TEXT;
  v_result_version INT;
  v_result_is_new BOOLEAN;
  v_result_download_count INT;
BEGIN
  -- Generate content hash
  v_content_hash := generate_quote_content_hash(
    p_company_name,
    p_contact_email,
    p_line_items,
    p_total_value,
    p_currency
  );

  -- Check if quote with this content hash already exists
  SELECT q.id, q.version, q.download_count
  INTO v_existing_id, v_existing_version, v_existing_download_count
  FROM quotes q
  WHERE q.content_hash = v_content_hash
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Quote already exists - increment download count and update status
    UPDATE quotes
    SET
      download_count = COALESCE(download_count, 0) + 1,
      status = CASE
        WHEN status = 'draft' THEN 'downloaded'
        ELSE status
      END,
      first_sent_at = COALESCE(first_sent_at, NOW())
    WHERE quotes.id = v_existing_id
    RETURNING quotes.id, quotes.quote_reference, quotes.version, quotes.download_count
    INTO v_result_id, v_result_reference, v_result_version, v_result_download_count;

    v_result_is_new := FALSE;
  ELSE
    -- New quote - determine version number
    SELECT COALESCE(MAX(q.version), 0) + 1
    INTO v_new_version
    FROM quotes q
    WHERE q.contact_email = p_contact_email
      AND q.company_name = p_company_name;

    -- Insert new quote
    INSERT INTO quotes (
      quote_reference,
      version,
      company_name,
      contact_name,
      contact_email,
      contact_title,
      quote_date,
      valid_until,
      currency,
      total_value,
      line_items,
      prepared_by,
      deal_context,
      content_hash,
      status,
      download_count,
      first_sent_at
    ) VALUES (
      p_quote_reference,
      v_new_version,
      p_company_name,
      p_contact_name,
      p_contact_email,
      p_contact_title,
      p_quote_date,
      p_valid_until,
      p_currency,
      p_total_value,
      p_line_items,
      p_prepared_by,
      p_deal_context,
      v_content_hash,
      'downloaded',
      1,
      NOW()
    )
    RETURNING quotes.id, quotes.quote_reference, quotes.version, quotes.download_count
    INTO v_result_id, v_result_reference, v_result_version, v_result_download_count;

    v_result_is_new := TRUE;
  END IF;

  -- Return result
  RETURN QUERY SELECT v_result_id, v_result_reference, v_result_version, v_result_is_new, v_result_download_count;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert an MSA
CREATE OR REPLACE FUNCTION upsert_msa(
  p_msa_reference TEXT,
  p_company_name TEXT,
  p_contact_name TEXT,
  p_contact_email TEXT,
  p_effective_date DATE,
  p_jurisdiction TEXT,
  p_currency TEXT,
  p_total_value NUMERIC,
  p_line_items JSONB,
  p_consulting_hours INT,
  p_additional_hour_rate NUMERIC,
  p_prepared_by TEXT,
  p_pipeline_id UUID
) RETURNS TABLE(
  id UUID,
  msa_reference TEXT,
  version INT,
  is_new BOOLEAN,
  download_count INT
) AS $$
DECLARE
  v_content_hash TEXT;
  v_existing_id UUID;
  v_existing_version INT;
  v_existing_download_count INT;
  v_new_version INT;
  v_result_id UUID;
  v_result_reference TEXT;
  v_result_version INT;
  v_result_is_new BOOLEAN;
  v_result_download_count INT;
BEGIN
  -- Generate content hash
  v_content_hash := generate_msa_content_hash(
    p_company_name,
    p_contact_email,
    p_line_items,
    p_total_value,
    p_currency,
    p_effective_date
  );

  -- Check if MSA with this content hash already exists
  SELECT m.id, m.version, m.download_count
  INTO v_existing_id, v_existing_version, v_existing_download_count
  FROM msas m
  WHERE m.content_hash = v_content_hash
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- MSA already exists - increment download count
    UPDATE msas
    SET
      download_count = COALESCE(download_count, 0) + 1,
      status = CASE
        WHEN status = 'draft' THEN 'downloaded'
        ELSE status
      END,
      first_sent_at = COALESCE(first_sent_at, NOW())
    WHERE msas.id = v_existing_id
    RETURNING msas.id, msas.msa_reference, msas.version, msas.download_count
    INTO v_result_id, v_result_reference, v_result_version, v_result_download_count;

    v_result_is_new := FALSE;
  ELSE
    -- New MSA - determine version number
    SELECT COALESCE(MAX(m.version), 0) + 1
    INTO v_new_version
    FROM msas m
    WHERE m.contact_email = p_contact_email
      AND m.company_name = p_company_name;

    -- Insert new MSA
    INSERT INTO msas (
      msa_reference,
      version,
      company_name,
      contact_name,
      contact_email,
      effective_date,
      jurisdiction,
      currency,
      total_value,
      line_items,
      consulting_hours,
      additional_hour_rate,
      prepared_by,
      pipeline_id,
      content_hash,
      status,
      download_count,
      first_sent_at
    ) VALUES (
      p_msa_reference,
      v_new_version,
      p_company_name,
      p_contact_name,
      p_contact_email,
      p_effective_date,
      p_jurisdiction,
      p_currency,
      p_total_value,
      p_line_items,
      p_consulting_hours,
      p_additional_hour_rate,
      p_prepared_by,
      p_pipeline_id,
      v_content_hash,
      'downloaded',
      1,
      NOW()
    )
    RETURNING msas.id, msas.msa_reference, msas.version, msas.download_count
    INTO v_result_id, v_result_reference, v_result_version, v_result_download_count;

    v_result_is_new := TRUE;
  END IF;

  -- Return result
  RETURN QUERY SELECT v_result_id, v_result_reference, v_result_version, v_result_is_new, v_result_download_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- BACKFILL EXISTING DATA (Optional - Run Manually)
-- ============================================

-- Uncomment and run this to backfill content_hash for existing quotes
-- UPDATE quotes
-- SET content_hash = generate_quote_content_hash(
--   company_name,
--   contact_email,
--   line_items,
--   total_value,
--   currency
-- )
-- WHERE content_hash IS NULL;

-- Uncomment and run this to backfill content_hash for existing MSAs
-- UPDATE msas
-- SET content_hash = generate_msa_content_hash(
--   company_name,
--   contact_email,
--   line_items,
--   total_value,
--   currency,
--   effective_date
-- )
-- WHERE content_hash IS NULL;

-- Set download_count to 1 for existing records (they were downloaded at least once)
-- UPDATE quotes SET download_count = 1 WHERE download_count IS NULL OR download_count = 0;
-- UPDATE msas SET download_count = 1 WHERE download_count IS NULL OR download_count = 0;

-- Set status to 'downloaded' for existing records
-- UPDATE quotes SET status = 'downloaded' WHERE status IS NULL OR status = 'draft';
-- UPDATE msas SET status = 'downloaded' WHERE status IS NULL OR status = 'draft';
