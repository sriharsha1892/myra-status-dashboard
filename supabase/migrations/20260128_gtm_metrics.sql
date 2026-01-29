-- GTM Metrics table for storing dated reporting entries
-- Supports HubSpot, Apollo, Inbound metrics and extensible to future types

CREATE TABLE IF NOT EXISTS gtm_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'admin',

  -- The date this data represents (not when it was entered)
  entry_date DATE NOT NULL,

  -- Metric type: 'hubspot' | 'apollo' | 'inbound' | future types
  metric_type TEXT NOT NULL,

  -- Flexible JSON data field for metric values
  -- HubSpot: { sent, reached, followed, qualified }
  -- Apollo: { contacted, responses, qualified }
  -- Inbound: { visitors_en, visitors_non_en, leads, active }
  data JSONB NOT NULL DEFAULT '{}',

  -- Unique constraint: one entry per date per metric type
  CONSTRAINT gtm_metrics_unique_entry UNIQUE (entry_date, metric_type)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_gtm_metrics_entry_date ON gtm_metrics(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_gtm_metrics_metric_type ON gtm_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_gtm_metrics_date_type ON gtm_metrics(entry_date DESC, metric_type);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_gtm_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gtm_metrics_updated_at ON gtm_metrics;
CREATE TRIGGER gtm_metrics_updated_at
  BEFORE UPDATE ON gtm_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_gtm_metrics_updated_at();

-- Comments for documentation
COMMENT ON TABLE gtm_metrics IS 'Stores GTM (Go-To-Market) metrics for leadership dashboard';
COMMENT ON COLUMN gtm_metrics.entry_date IS 'The date this metric data represents';
COMMENT ON COLUMN gtm_metrics.metric_type IS 'Type of metric: hubspot, apollo, inbound, etc.';
COMMENT ON COLUMN gtm_metrics.data IS 'JSON object with metric values specific to the metric_type';
