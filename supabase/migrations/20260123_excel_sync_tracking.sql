-- Excel Sync Tracking
-- Created: 2026-01-23
-- Purpose: Track Excel/JSON data imports for demos and pipeline data

-- ============================================
-- TABLE: excel_sync_logs
-- Track import operations and their results
-- ============================================
CREATE TABLE IF NOT EXISTS excel_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sync type
  sync_type TEXT NOT NULL,            -- 'demos', 'pipeline', 'combined'
  source_type TEXT NOT NULL,          -- 'excel_upload', 'json_webhook'

  -- Stats
  rows_received INTEGER NOT NULL DEFAULT 0,
  rows_created INTEGER NOT NULL DEFAULT 0,
  rows_updated INTEGER NOT NULL DEFAULT 0,
  rows_failed INTEGER NOT NULL DEFAULT 0,

  -- Error details
  error_details JSONB DEFAULT '[]',   -- Array of { row: n, error: "..." }

  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  synced_by TEXT,
  source_filename TEXT,

  -- Duration tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_excel_sync_logs_synced_at ON excel_sync_logs(synced_at DESC);
CREATE INDEX idx_excel_sync_logs_sync_type ON excel_sync_logs(sync_type);

-- ============================================
-- Add external_id to sales_pipeline for dedup
-- ============================================
ALTER TABLE sales_pipeline
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Create unique index (allow NULLs, but unique non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_pipeline_external_id
ON sales_pipeline(external_id)
WHERE external_id IS NOT NULL;

-- ============================================
-- TABLE: demo_events (if not exists)
-- Track demo scheduling and completion
-- ============================================
CREATE TABLE IF NOT EXISTS demo_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_id TEXT UNIQUE,                -- External reference like DEMO-2025-01

  -- Organization link
  org_id UUID REFERENCES trial_organizations(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,

  -- Contact info
  contact_email TEXT,
  contact_name TEXT,
  contact_title TEXT,

  -- Demo details
  demo_date DATE NOT NULL,
  demo_time TIME,
  demo_status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled

  -- Sales team
  sales_poc TEXT NOT NULL,

  -- Post-demo info
  demo_rating INTEGER CHECK (demo_rating >= 1 AND demo_rating <= 5),
  observations TEXT,
  pain_points TEXT,
  next_steps TEXT,

  -- Sync tracking
  external_id TEXT,                   -- ID from Excel for dedup

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add external_id column if table already exists without it
ALTER TABLE demo_events ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE INDEX IF NOT EXISTS idx_demo_events_date ON demo_events(demo_date DESC);
CREATE INDEX IF NOT EXISTS idx_demo_events_status ON demo_events(demo_status);
CREATE INDEX IF NOT EXISTS idx_demo_events_sales_poc ON demo_events(sales_poc);
CREATE INDEX IF NOT EXISTS idx_demo_events_external_id ON demo_events(external_id) WHERE external_id IS NOT NULL;

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE excel_sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations (internal tool)
CREATE POLICY "excel_sync_logs_all" ON excel_sync_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Demo events RLS (if table was just created)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'demo_events' AND policyname = 'demo_events_all'
  ) THEN
    ALTER TABLE demo_events ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "demo_events_all" ON demo_events
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- Trigger for demo_events updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_demo_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS demo_events_updated_at_trigger ON demo_events;
CREATE TRIGGER demo_events_updated_at_trigger
  BEFORE UPDATE ON demo_events
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_events_updated_at();

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE excel_sync_logs IS 'Tracks Excel/JSON data imports for audit and debugging';
COMMENT ON TABLE demo_events IS 'Scheduled and completed demo sessions';
COMMENT ON COLUMN sales_pipeline.external_id IS 'External ID from Excel for deduplication during imports';
