-- myRA AI Activity Integration with Graceful Smart Mapping
-- This migration creates a staging table for flexible data import with AI-powered entity resolution
-- No rigid constraints - allows maximum flexibility during import process

-- ========================================
-- PART 1: Staging Table (No Constraints)
-- ========================================

CREATE TABLE IF NOT EXISTS myra_activity_staging (
  staging_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL,

  -- Raw extracted data from screenshots (all nullable, no constraints)
  raw_org_name TEXT,
  raw_user_name TEXT,
  raw_user_email TEXT,
  raw_insight_title TEXT NOT NULL, -- Only this is required
  raw_timestamp TEXT, -- Keep as text, will parse later
  raw_cost TEXT, -- Might include currency symbols
  raw_category TEXT,

  -- AI extraction metadata
  extraction_confidence DECIMAL(5,2), -- 0-100
  ai_extraction_data JSONB, -- Full Groq API response for audit
  screenshot_url TEXT, -- Reference to original screenshot

  -- Smart mapping results (populated by intelligence engine)
  mapped_org_id UUID, -- Best match suggestion
  mapped_org_confidence DECIMAL(5,2), -- Confidence in org match
  mapped_org_alternatives JSONB, -- Array of alternative matches: [{org_id, name, score}]

  mapped_user_id UUID, -- Best match suggestion
  mapped_user_confidence DECIMAL(5,2), -- Confidence in user match
  mapped_user_alternatives JSONB, -- Array of alternative matches

  -- Parsed/normalized data
  parsed_timestamp TIMESTAMP,
  parsed_cost DECIMAL(10,4),
  parsed_category TEXT,

  -- Status tracking
  mapping_status TEXT DEFAULT 'pending' CHECK (
    mapping_status IN ('pending', 'needs_review', 'reviewed', 'approved', 'rejected', 'committed', 'failed')
  ),
  manual_overrides JSONB, -- Track what user manually corrected
  review_notes TEXT,

  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_by UUID, -- User who reviewed this mapping
  reviewed_at TIMESTAMP,
  committed_at TIMESTAMP
);

-- Indexes for performance (no foreign keys!)
CREATE INDEX idx_myra_staging_batch ON myra_activity_staging(import_batch_id);
CREATE INDEX idx_myra_staging_status ON myra_activity_staging(mapping_status);
CREATE INDEX idx_myra_staging_org_mapped ON myra_activity_staging(mapped_org_id) WHERE mapped_org_id IS NOT NULL;
CREATE INDEX idx_myra_staging_created ON myra_activity_staging(created_at DESC);

-- ========================================
-- PART 2: Import Batch Tracking
-- ========================================

CREATE TABLE IF NOT EXISTS myra_import_batches (
  batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name TEXT NOT NULL,
  description TEXT,

  -- Import statistics
  total_screenshots INT DEFAULT 0,
  total_extracted INT DEFAULT 0,
  auto_approved INT DEFAULT 0,
  needs_review INT DEFAULT 0,
  committed INT DEFAULT 0,
  failed INT DEFAULT 0,

  -- User who performed the import
  imported_by UUID NOT NULL REFERENCES users(id),

  -- Timestamps
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  committed_at TIMESTAMP,

  -- Metadata
  excluded_users TEXT[], -- Array of user names to exclude (e.g. ['Krati Agarwal', 'Sudeshana'])
  import_settings JSONB, -- Store confidence thresholds, etc.

  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (
    status IN ('in_progress', 'extracted', 'reviewed', 'committed', 'failed')
  )
);

CREATE INDEX idx_import_batches_status ON myra_import_batches(status);
CREATE INDEX idx_import_batches_imported_by ON myra_import_batches(imported_by);
CREATE INDEX idx_import_batches_started ON myra_import_batches(started_at DESC);

-- ========================================
-- PART 3: Enhance platform_queries Table
-- ========================================

-- Add fields to existing platform_queries table for import tracking
ALTER TABLE platform_queries
  ADD COLUMN IF NOT EXISTS import_batch_id UUID,
  ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT 'manual' CHECK (
    import_source IN ('manual', 'screenshot_ai', 'api', 'csv', 'bulk_import')
  ),
  ADD COLUMN IF NOT EXISTS insight_title TEXT,
  ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS ai_extracted_data JSONB;

-- Indexes for analytics and filtering
CREATE INDEX IF NOT EXISTS idx_platform_queries_import_batch
  ON platform_queries(import_batch_id) WHERE import_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_queries_import_source
  ON platform_queries(import_source);

CREATE INDEX IF NOT EXISTS idx_platform_queries_cost
  ON platform_queries(cost_usd) WHERE cost_usd IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_queries_executed_at
  ON platform_queries(executed_at DESC);

-- ========================================
-- PART 4: Helper Functions
-- ========================================

-- Function to update batch statistics
CREATE OR REPLACE FUNCTION update_batch_statistics(p_batch_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE myra_import_batches
  SET
    total_extracted = (
      SELECT COUNT(*) FROM myra_activity_staging WHERE import_batch_id = p_batch_id
    ),
    auto_approved = (
      SELECT COUNT(*) FROM myra_activity_staging
      WHERE import_batch_id = p_batch_id AND mapping_status = 'approved'
    ),
    needs_review = (
      SELECT COUNT(*) FROM myra_activity_staging
      WHERE import_batch_id = p_batch_id AND mapping_status = 'needs_review'
    ),
    committed = (
      SELECT COUNT(*) FROM myra_activity_staging
      WHERE import_batch_id = p_batch_id AND mapping_status = 'committed'
    ),
    failed = (
      SELECT COUNT(*) FROM myra_activity_staging
      WHERE import_batch_id = p_batch_id AND mapping_status = 'failed'
    )
  WHERE batch_id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get mapping suggestions for review dashboard
CREATE OR REPLACE FUNCTION get_batch_review_summary(p_batch_id UUID)
RETURNS TABLE (
  status_group TEXT,
  record_count BIGINT,
  avg_org_confidence DECIMAL,
  avg_user_confidence DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mapping_status,
    COUNT(*),
    AVG(mapped_org_confidence),
    AVG(mapped_user_confidence)
  FROM myra_activity_staging
  WHERE import_batch_id = p_batch_id
  GROUP BY mapping_status
  ORDER BY
    CASE mapping_status
      WHEN 'needs_review' THEN 1
      WHEN 'reviewed' THEN 2
      WHEN 'approved' THEN 3
      WHEN 'committed' THEN 4
      ELSE 5
    END;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 5: Row Level Security
-- ========================================

-- Enable RLS
ALTER TABLE myra_activity_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE myra_import_batches ENABLE ROW LEVEL SECURITY;

-- Policies for staging table (admin-only access)
CREATE POLICY "Admin full access to staging"
  ON myra_activity_staging
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- Policies for import batches (admin-only)
CREATE POLICY "Admin full access to import batches"
  ON myra_import_batches
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- ========================================
-- PART 6: Comments
-- ========================================

COMMENT ON TABLE myra_activity_staging IS
  'Staging table for myRA activity imports. Accepts all data without constraints, uses AI for smart entity mapping.';

COMMENT ON COLUMN myra_activity_staging.mapped_org_alternatives IS
  'JSON array of alternative organization matches: [{org_id: uuid, name: string, score: number}]';

COMMENT ON COLUMN myra_activity_staging.mapped_user_alternatives IS
  'JSON array of alternative user matches: [{user_id: uuid, name: string, score: number}]';

COMMENT ON COLUMN myra_activity_staging.mapping_status IS
  'pending: Just imported | needs_review: Low confidence, requires human | reviewed: Medium confidence | approved: High confidence, ready to commit | committed: Successfully imported to platform_queries | failed: Import error';

COMMENT ON TABLE myra_import_batches IS
  'Tracks bulk imports of myRA activity data from screenshots with AI extraction and smart mapping.';
