-- Fix roadmap activity logging trigger
-- Split BEFORE and AFTER operations to avoid foreign key constraint issues

-- Drop the old trigger
DROP TRIGGER IF EXISTS trigger_log_roadmap_activity ON org_product_roadmap;

-- Create BEFORE trigger function (only for setting last_activity fields)
CREATE OR REPLACE FUNCTION set_roadmap_activity_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Set last activity fields on INSERT
  IF TG_OP = 'INSERT' THEN
    NEW.last_activity_at = NOW();
    NEW.last_activity_by = NEW.created_by::UUID;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create BEFORE trigger (for field updates)
CREATE TRIGGER trigger_set_roadmap_activity_fields
  BEFORE INSERT OR UPDATE ON org_product_roadmap
  FOR EACH ROW
  EXECUTE FUNCTION set_roadmap_activity_fields();

-- Create AFTER trigger function (for activity log inserts)
CREATE OR REPLACE FUNCTION log_roadmap_activity_after()
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

-- Create AFTER trigger (for activity logging)
CREATE TRIGGER trigger_log_roadmap_activity_after
  AFTER INSERT OR UPDATE ON org_product_roadmap
  FOR EACH ROW
  EXECUTE FUNCTION log_roadmap_activity_after();
