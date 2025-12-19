-- Pipeline Snapshots Table
-- Stores daily snapshots of pipeline counts and values by stage for trend analysis

CREATE TABLE IF NOT EXISTS pipeline_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  stage TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  total_value DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one snapshot per stage per day
  UNIQUE(snapshot_date, stage)
);

-- Index for efficient date-range queries
CREATE INDEX IF NOT EXISTS idx_pipeline_snapshots_date ON pipeline_snapshots(snapshot_date);

-- Function to capture a daily snapshot
CREATE OR REPLACE FUNCTION capture_pipeline_snapshot()
RETURNS void AS $$
DECLARE
  today DATE := CURRENT_DATE;
BEGIN
  -- Delete any existing snapshot for today (in case we're re-running)
  DELETE FROM pipeline_snapshots WHERE snapshot_date = today;

  -- Insert snapshot for each stage
  INSERT INTO pipeline_snapshots (snapshot_date, stage, count, total_value)
  SELECT
    today,
    stage,
    COUNT(*)::INTEGER,
    COALESCE(SUM(deal_value), 0)
  FROM sales_pipeline
  GROUP BY stage;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
ALTER TABLE pipeline_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/write
CREATE POLICY "Service role can manage snapshots"
  ON pipeline_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE pipeline_snapshots IS 'Daily snapshots of pipeline stage counts and values for trend analysis';
COMMENT ON FUNCTION capture_pipeline_snapshot() IS 'Captures current pipeline state into snapshot table';
