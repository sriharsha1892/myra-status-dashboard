-- Migration: Import Staging Tables
-- Enables reliable bulk imports with checkpointing and resume capability

-- ============================================================================
-- CLEANUP: Drop existing tables if they exist (from failed migrations)
-- ============================================================================

DROP TABLE IF EXISTS import_staging CASCADE;
DROP TABLE IF EXISTS import_batches CASCADE;
DROP FUNCTION IF EXISTS update_import_staging_updated_at CASCADE;

-- ============================================================================
-- Import Batches Table (MUST BE CREATED FIRST - referenced by import_staging)
-- ============================================================================

CREATE TABLE import_batches (
  batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  batch_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,

  -- Source info
  source_type TEXT CHECK (source_type IN ('csv', 'json', 'text', 'ai')),
  source_filename TEXT,

  -- Processing config
  config JSONB DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'preparing' CHECK (status IN (
    'preparing',
    'ready',
    'validating',
    'validated',
    'importing',
    'completed',
    'cancelled'
  )),

  -- Stats
  total_rows INTEGER DEFAULT 0,
  parsed_count INTEGER DEFAULT 0,
  validated_count INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Import Staging Table
-- ============================================================================

CREATE TABLE import_staging (
  staging_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Batch identification
  batch_id UUID NOT NULL,
  batch_name TEXT,
  row_number INTEGER NOT NULL,

  -- Source data
  raw_data JSONB NOT NULL,
  parsed_data JSONB,

  -- Entity type
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'organization',
    'status_update',
    'activity',
    'user'
  )),

  -- Processing state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'parsed',
    'parse_failed',
    'validated',
    'validation_failed',
    'importing',
    'imported',
    'import_failed',
    'skipped'
  )),

  -- Result tracking
  imported_id UUID,
  imported_id_secondary UUID,
  error_message TEXT,
  error_details JSONB,

  -- Retry tracking
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Foreign key constraint
  CONSTRAINT fk_staging_batch FOREIGN KEY (batch_id)
    REFERENCES import_batches(batch_id) ON DELETE CASCADE
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_staging_batch_id ON import_staging(batch_id);
CREATE INDEX idx_staging_status ON import_staging(status);
CREATE INDEX idx_staging_batch_status ON import_staging(batch_id, status);
CREATE INDEX idx_staging_entity_type ON import_staging(entity_type);
CREATE INDEX idx_staging_importing ON import_staging(batch_id) WHERE status = 'importing';

-- ============================================================================
-- Updated_at trigger
-- ============================================================================

CREATE FUNCTION update_import_staging_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER import_staging_updated_at
  BEFORE UPDATE ON import_staging
  FOR EACH ROW
  EXECUTE FUNCTION update_import_staging_updated_at();

CREATE TRIGGER import_batches_updated_at
  BEFORE UPDATE ON import_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_import_staging_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE import_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_staging_all" ON import_staging
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "import_batches_all" ON import_batches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE import_staging IS 'Tracks individual rows through the bulk import pipeline';
COMMENT ON TABLE import_batches IS 'Groups import rows into batches for processing';
