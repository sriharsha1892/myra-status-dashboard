-- Migration: Extend Unified Notifications for Resources Platform
-- Date: 2025-11-12
-- Purpose: Add 'resource_discussion' entity type to support @mention notifications in Resources

-- 1. Update the CHECK constraint on notifications table to include new entity_type
-- (PostgreSQL doesn't allow modifying CHECK constraints, so we drop and recreate)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_entity_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_entity_type_check
  CHECK (entity_type IN ('note', 'ticket', 'roadmap_item', 'meeting', 'trial_org', 'resource_discussion'));

-- 2. Create index for resource discussion notifications (performance optimization)
CREATE INDEX IF NOT EXISTS idx_notifications_resource_discussions
  ON notifications(entity_type, entity_id)
  WHERE entity_type = 'resource_discussion';

-- 3. Add comment for documentation
COMMENT ON CONSTRAINT notifications_entity_type_check ON notifications IS
  'Allows notifications for notes, tickets, roadmap items, meetings, trial orgs, and resource discussions';
