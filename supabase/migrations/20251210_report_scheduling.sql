-- ============================================
-- Report Scheduling Schema
-- Automated report generation and delivery
-- ============================================

-- Scheduled Reports Table
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Report identity
  name TEXT NOT NULL,
  description TEXT,

  -- Report type and configuration
  report_type TEXT NOT NULL CHECK (report_type IN (
    'trial_summary',      -- Summary of all trials
    'engagement',         -- Engagement metrics
    'pipeline',           -- Pipeline/funnel report
    'at_risk',            -- At-risk trials
    'activity',           -- Activity summary
    'follow_ups',         -- Follow-up status
    'team_performance',   -- AM performance metrics
    'custom'              -- Custom query-based report
  )),

  -- Schedule configuration
  schedule_type TEXT NOT NULL CHECK (schedule_type IN (
    'daily', 'weekly', 'monthly', 'custom'
  )),
  schedule_config JSONB NOT NULL DEFAULT '{}',
  -- For daily: { "time": "09:00", "timezone": "America/New_York" }
  -- For weekly: { "day": "monday", "time": "09:00" }
  -- For monthly: { "day_of_month": 1, "time": "09:00" }
  -- For custom: { "cron": "0 9 * * 1" }

  -- Delivery configuration
  delivery_method TEXT NOT NULL DEFAULT 'teams' CHECK (delivery_method IN (
    'teams', 'email', 'both'
  )),
  recipients JSONB NOT NULL DEFAULT '[]',
  -- Structure: [{ "type": "user", "id": "uuid" }, { "type": "channel", "id": "channel_id" }]

  teams_webhook_url TEXT,
  teams_channel_id TEXT,

  -- Report filters
  filters JSONB DEFAULT '{}',
  -- Structure: { "stage": ["trial_active"], "account_manager_id": "uuid", "date_range": "last_7_days" }

  -- Display options
  format TEXT DEFAULT 'adaptive_card' CHECK (format IN (
    'adaptive_card', 'summary_text', 'detailed'
  )),
  include_charts BOOLEAN DEFAULT false,
  max_items INTEGER DEFAULT 10,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT CHECK (last_run_status IN ('success', 'failed', 'partial')),
  last_error TEXT,
  next_run_at TIMESTAMPTZ,

  -- Stats
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,

  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report Execution History
CREATE TABLE IF NOT EXISTS report_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  scheduled_report_id UUID NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,

  -- Execution details
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Results
  report_data JSONB,  -- The generated report content
  recipients_notified INTEGER DEFAULT 0,
  error_message TEXT,

  -- Metrics
  execution_time_ms INTEGER,
  data_rows_processed INTEGER
);

-- Alert Configurations Table
CREATE TABLE IF NOT EXISTS alert_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert identity
  name TEXT NOT NULL,
  description TEXT,

  -- Alert type
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'trial_expiring',       -- Trial expiring in X days
    'no_activity',          -- No activity for X days
    'engagement_drop',      -- Engagement score dropped
    'at_risk',              -- Deal marked at-risk
    'follow_up_overdue',    -- Overdue follow-up
    'stage_change',         -- Stage changed to specific value
    'health_critical',      -- Health status critical
    'custom'                -- Custom condition
  )),

  -- Trigger configuration
  trigger_config JSONB NOT NULL DEFAULT '{}',
  -- Examples:
  -- trial_expiring: { "days_before": 7 }
  -- no_activity: { "days": 7 }
  -- engagement_drop: { "threshold": 30, "drop_percent": 20 }
  -- stage_change: { "from": "any", "to": "at_risk" }

  -- Notification configuration
  notification_channels JSONB NOT NULL DEFAULT '["teams"]',
  recipients JSONB NOT NULL DEFAULT '[]',
  teams_webhook_url TEXT,

  -- Message template
  message_template TEXT,  -- Supports {{org_name}}, {{days}}, etc.
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Throttling
  cooldown_minutes INTEGER DEFAULT 60,  -- Don't re-alert within X minutes
  max_alerts_per_day INTEGER DEFAULT 10,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  total_alerts_sent INTEGER DEFAULT 0,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert History
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  alert_config_id UUID NOT NULL REFERENCES alert_configurations(id) ON DELETE CASCADE,

  -- What triggered it
  entity_type TEXT NOT NULL,  -- trial_organizations, trial_users, follow_ups
  entity_id UUID NOT NULL,
  trigger_reason TEXT NOT NULL,

  -- Notification status
  notification_sent BOOLEAN DEFAULT false,
  notification_channel TEXT,
  notification_error TEXT,

  -- Acknowledgment
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Model Tuning Tables
CREATE TABLE IF NOT EXISTS ai_accuracy_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  model_name TEXT NOT NULL DEFAULT 'default',
  action_type TEXT,  -- LOG_ACTIVITY, UPDATE_STAGE, etc. (NULL for overall)

  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Metrics
  total_extractions INTEGER DEFAULT 0,
  correct_extractions INTEGER DEFAULT 0,
  accuracy_rate NUMERIC(5,4),

  -- Field-level accuracy
  field_accuracy JSONB DEFAULT '{}',
  -- Structure: { "org_name": 0.95, "activity_type": 0.88, "sentiment": 0.72 }

  -- Common errors
  common_errors JSONB DEFAULT '[]',
  -- Structure: [{ "error_type": "wrong_org", "count": 15, "examples": [...] }]

  -- Confidence calibration
  avg_confidence NUMERIC(4,3),
  confidence_accuracy_correlation NUMERIC(4,3),

  computed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(model_name, action_type, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS ai_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  action_type TEXT NOT NULL,
  category TEXT,  -- positive, edge_case, common_error

  -- Example content
  input_text TEXT NOT NULL,
  expected_output JSONB NOT NULL,
  explanation TEXT,

  -- Quality
  quality_score NUMERIC(3,2) DEFAULT 1.0,
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN (
    'pending', 'validated', 'rejected'
  )),

  -- Source
  source TEXT NOT NULL CHECK (source IN (
    'manual',           -- Manually created by admin
    'feedback',         -- Derived from user feedback
    'high_confidence',  -- Auto-captured high-confidence extraction
    'correction'        -- From user correction
  )),
  source_feedback_id UUID,

  -- Usage
  times_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_report_executions_report ON report_executions(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(status);

CREATE INDEX IF NOT EXISTS idx_alert_configs_active ON alert_configurations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_alert_configs_type ON alert_configurations(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_history_config ON alert_history(alert_config_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_entity ON alert_history(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_ai_accuracy_period ON ai_accuracy_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_ai_accuracy_action ON ai_accuracy_metrics(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_training_action ON ai_training_examples(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_training_active ON ai_training_examples(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_accuracy_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_examples ENABLE ROW LEVEL SECURITY;

-- Admins can manage scheduled reports
CREATE POLICY "Admins can manage scheduled reports"
  ON scheduled_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- All authenticated users can view reports
CREATE POLICY "Users can view scheduled reports"
  ON scheduled_reports FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Report executions follow report permissions
CREATE POLICY "Users can view report executions"
  ON report_executions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages report executions"
  ON report_executions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Admins can manage alerts
CREATE POLICY "Admins can manage alert configurations"
  ON alert_configurations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

CREATE POLICY "Users can view alert configurations"
  ON alert_configurations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view alert history"
  ON alert_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages alert history"
  ON alert_history FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- AI tables - admins only
CREATE POLICY "Admins can manage ai_accuracy_metrics"
  ON ai_accuracy_metrics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

CREATE POLICY "Admins can manage ai_training_examples"
  ON ai_training_examples FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- Service role full access
CREATE POLICY "Service role full access scheduled_reports"
  ON scheduled_reports FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access alert_configurations"
  ON alert_configurations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access ai_accuracy_metrics"
  ON ai_accuracy_metrics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access ai_training_examples"
  ON ai_training_examples FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Update triggers
CREATE TRIGGER update_scheduled_reports_updated_at
  BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_configurations_updated_at
  BEFORE UPDATE ON alert_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_training_examples_updated_at
  BEFORE UPDATE ON ai_training_examples
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next run time
CREATE OR REPLACE FUNCTION calculate_next_run_at(
  p_schedule_type TEXT,
  p_schedule_config JSONB
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next_run TIMESTAMPTZ;
  v_time TIME;
  v_day TEXT;
  v_day_of_month INTEGER;
BEGIN
  v_time := COALESCE((p_schedule_config->>'time')::TIME, '09:00'::TIME);

  CASE p_schedule_type
    WHEN 'daily' THEN
      v_next_run := (CURRENT_DATE + 1)::TIMESTAMP + v_time;
    WHEN 'weekly' THEN
      v_day := COALESCE(p_schedule_config->>'day', 'monday');
      -- Find next occurrence of this day
      v_next_run := (CURRENT_DATE + ((7 + EXTRACT(DOW FROM (
        CASE v_day
          WHEN 'sunday' THEN 0
          WHEN 'monday' THEN 1
          WHEN 'tuesday' THEN 2
          WHEN 'wednesday' THEN 3
          WHEN 'thursday' THEN 4
          WHEN 'friday' THEN 5
          WHEN 'saturday' THEN 6
        END
      )::INTEGER) - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER) % 7) * INTERVAL '1 day')::TIMESTAMP + v_time;
    WHEN 'monthly' THEN
      v_day_of_month := COALESCE((p_schedule_config->>'day_of_month')::INTEGER, 1);
      IF EXTRACT(DAY FROM CURRENT_DATE) < v_day_of_month THEN
        v_next_run := (DATE_TRUNC('month', CURRENT_DATE) + (v_day_of_month - 1) * INTERVAL '1 day')::TIMESTAMP + v_time;
      ELSE
        v_next_run := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + (v_day_of_month - 1) * INTERVAL '1 day')::TIMESTAMP + v_time;
      END IF;
    ELSE
      v_next_run := NOW() + INTERVAL '1 day';
  END CASE;

  RETURN v_next_run;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE scheduled_reports IS 'Scheduled report configurations for automated delivery';
COMMENT ON TABLE report_executions IS 'History of report executions';
COMMENT ON TABLE alert_configurations IS 'Alert rule configurations';
COMMENT ON TABLE alert_history IS 'History of triggered alerts';
COMMENT ON TABLE ai_accuracy_metrics IS 'AI extraction accuracy metrics over time';
COMMENT ON TABLE ai_training_examples IS 'Training examples for AI model improvement';
