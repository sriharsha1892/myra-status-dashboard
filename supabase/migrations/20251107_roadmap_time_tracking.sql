-- Roadmap Time Tracking System
-- Adds time logging, activity tracking, and productivity metrics

-- 1. Add time tracking columns to roadmap items
ALTER TABLE org_product_roadmap
  ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0
    CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_activity_by UUID REFERENCES auth.users(id);

-- 2. Create time logs table
CREATE TABLE IF NOT EXISTS roadmap_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id UUID REFERENCES org_product_roadmap(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  hours_logged DECIMAL(5,2) NOT NULL CHECK (hours_logged > 0),
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create activity log table
CREATE TABLE IF NOT EXISTS roadmap_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id UUID REFERENCES org_product_roadmap(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL, -- 'created', 'updated', 'commented', 'status_changed', 'time_logged', 'assigned', 'estimate_changed'
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_logs_roadmap_item ON roadmap_time_logs(roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user ON roadmap_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_date ON roadmap_time_logs(work_date DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_roadmap_item ON roadmap_activity_log(roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON roadmap_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON roadmap_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON roadmap_activity_log(action_type);

CREATE INDEX IF NOT EXISTS idx_roadmap_last_activity ON org_product_roadmap(last_activity_at DESC);

-- 5. Create function to auto-calculate actual hours from time logs
CREATE OR REPLACE FUNCTION update_roadmap_actual_hours()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE org_product_roadmap
  SET
    actual_hours = (
      SELECT COALESCE(SUM(hours_logged), 0)
      FROM roadmap_time_logs
      WHERE roadmap_item_id = NEW.roadmap_item_id
    ),
    last_activity_at = NEW.created_at,
    last_activity_by = NEW.user_id
  WHERE id = NEW.roadmap_item_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to update actual hours when time is logged
DROP TRIGGER IF EXISTS trigger_update_actual_hours ON roadmap_time_logs;
CREATE TRIGGER trigger_update_actual_hours
  AFTER INSERT OR UPDATE OR DELETE ON roadmap_time_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_roadmap_actual_hours();

-- 7. Create function to log activity automatically
CREATE OR REPLACE FUNCTION log_roadmap_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO roadmap_activity_log (roadmap_item_id, user_id, action_type, new_value, metadata)
    VALUES (
      NEW.id,
      NEW.created_by::UUID,
      'created',
      NEW.title,
      jsonb_build_object('status', NEW.status, 'priority', NEW.priority)
    );

    -- Update last activity
    NEW.last_activity_at = NOW();
    NEW.last_activity_by = NEW.created_by::UUID;
  END IF;

  -- Log updates
  IF TG_OP = 'UPDATE' THEN
    -- Status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO roadmap_activity_log (roadmap_item_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, NEW.last_activity_by, 'status_changed', OLD.status, NEW.status);
    END IF;

    -- Priority change
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO roadmap_activity_log (roadmap_item_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, NEW.last_activity_by, 'priority_changed', OLD.priority, NEW.priority);
    END IF;

    -- Assignee change
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO roadmap_activity_log (roadmap_item_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, NEW.last_activity_by, 'assigned', OLD.assigned_to, NEW.assigned_to);
    END IF;

    -- Estimate change
    IF OLD.estimated_hours IS DISTINCT FROM NEW.estimated_hours THEN
      INSERT INTO roadmap_activity_log (roadmap_item_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, NEW.last_activity_by, 'estimate_changed', OLD.estimated_hours::TEXT, NEW.estimated_hours::TEXT);
    END IF;

    -- General update
    IF OLD.title IS DISTINCT FROM NEW.title OR OLD.description IS DISTINCT FROM NEW.description THEN
      INSERT INTO roadmap_activity_log (roadmap_item_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, NEW.last_activity_by, 'updated', OLD.title, NEW.title);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to auto-log roadmap activity
DROP TRIGGER IF EXISTS trigger_log_roadmap_activity ON org_product_roadmap;
CREATE TRIGGER trigger_log_roadmap_activity
  BEFORE INSERT OR UPDATE ON org_product_roadmap
  FOR EACH ROW
  EXECUTE FUNCTION log_roadmap_activity();

-- 9. Create trigger to log time entries as activity
CREATE OR REPLACE FUNCTION log_time_entry_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO roadmap_activity_log (
    roadmap_item_id,
    user_id,
    action_type,
    new_value,
    metadata
  )
  VALUES (
    NEW.roadmap_item_id,
    NEW.user_id,
    'time_logged',
    NEW.hours_logged::TEXT || 'h',
    jsonb_build_object('description', NEW.description, 'work_date', NEW.work_date)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_time_entry ON roadmap_time_logs;
CREATE TRIGGER trigger_log_time_entry
  AFTER INSERT ON roadmap_time_logs
  FOR EACH ROW
  EXECUTE FUNCTION log_time_entry_activity();

-- 10. Enable RLS
ALTER TABLE roadmap_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_activity_log ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies (all authenticated users can read/write for now)
CREATE POLICY "Anyone can view time logs" ON roadmap_time_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can insert time logs" ON roadmap_time_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view activity logs" ON roadmap_activity_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert activity logs" ON roadmap_activity_log
  FOR INSERT WITH CHECK (true);

-- 12. Create view for productivity metrics
CREATE OR REPLACE VIEW roadmap_productivity_metrics AS
SELECT
  r.id,
  r.title,
  r.status,
  r.priority,
  r.assigned_to,
  r.estimated_hours,
  r.actual_hours,
  r.progress_percentage,
  r.last_activity_at,
  r.target_date,
  r.created_at,
  -- Stale indicator (no activity in 5+ days)
  CASE
    WHEN r.last_activity_at IS NULL THEN EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 86400
    ELSE EXTRACT(EPOCH FROM (NOW() - r.last_activity_at)) / 86400
  END as days_since_activity,
  -- Over/under estimate
  CASE
    WHEN r.estimated_hours IS NOT NULL AND r.actual_hours > 0 THEN
      ROUND(((r.actual_hours - r.estimated_hours) / r.estimated_hours * 100)::numeric, 1)
    ELSE NULL
  END as estimate_variance_pct,
  -- Overdue indicator
  CASE
    WHEN r.target_date IS NOT NULL AND r.target_date < CURRENT_DATE AND r.status != 'completed' THEN true
    ELSE false
  END as is_overdue,
  -- Time logs count
  (SELECT COUNT(*) FROM roadmap_time_logs tl WHERE tl.roadmap_item_id = r.id) as time_log_count,
  -- Activity count
  (SELECT COUNT(*) FROM roadmap_activity_log al WHERE al.roadmap_item_id = r.id) as activity_count
FROM org_product_roadmap r;

COMMENT ON VIEW roadmap_productivity_metrics IS 'Provides productivity metrics for roadmap items including stale items, estimate variance, and activity counts';
