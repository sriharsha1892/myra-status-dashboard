-- Fix foreign key constraints for Timeline system
-- Make user_id columns nullable to avoid constraint errors

-- Fix trial_timeline_events
ALTER TABLE trial_timeline_events
  ALTER COLUMN logged_by DROP NOT NULL;

-- Fix import_sessions
ALTER TABLE import_sessions
  ALTER COLUMN user_id DROP NOT NULL;

-- Fix timeline_views
ALTER TABLE timeline_views
  ALTER COLUMN user_id DROP NOT NULL;

-- Add a default user_id for system imports if needed
COMMENT ON COLUMN import_sessions.user_id IS 'User who initiated import - nullable for system imports';
COMMENT ON COLUMN trial_timeline_events.logged_by IS 'User who logged the event - nullable for bulk imports';
