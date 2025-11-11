-- Cleanup Script for Resources Platform Test Data
-- Purpose: Remove test discussions, reactions, and notifications
-- Usage: Run this after testing to clean up test data

-- Safety check: Print counts before deletion
DO $$
DECLARE
  v_discussions_count INTEGER;
  v_reactions_count INTEGER;
  v_notifications_count INTEGER;
BEGIN
  -- Count test discussions
  SELECT COUNT(*) INTO v_discussions_count
  FROM resource_discussions
  WHERE LOWER(content::text) LIKE '%test%'
     OR LOWER(content::text) LIKE '%demo%'
     OR LOWER(content::text) LIKE '%sample%';

  -- Count reactions on test discussions
  SELECT COUNT(*) INTO v_reactions_count
  FROM resource_discussion_reactions
  WHERE discussion_id IN (
    SELECT id FROM resource_discussions
    WHERE LOWER(content::text) LIKE '%test%'
       OR LOWER(content::text) LIKE '%demo%'
       OR LOWER(content::text) LIKE '%sample%'
  );

  -- Count resource discussion notifications
  SELECT COUNT(*) INTO v_notifications_count
  FROM notifications
  WHERE entity_type = 'resource_discussion'
    AND (
      LOWER(title) LIKE '%test%'
      OR LOWER(message) LIKE '%test%'
      OR LOWER(entity_title) LIKE '%test%'
    );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANUP PREVIEW';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Discussions to delete: %', v_discussions_count;
  RAISE NOTICE 'Reactions to delete: %', v_reactions_count;
  RAISE NOTICE 'Notifications to delete: %', v_notifications_count;
  RAISE NOTICE '========================================';
END $$;

-- 1. Delete reactions on test discussions (must delete first due to foreign key)
DELETE FROM resource_discussion_reactions
WHERE discussion_id IN (
  SELECT id FROM resource_discussions
  WHERE LOWER(content::text) LIKE '%test%'
     OR LOWER(content::text) LIKE '%demo%'
     OR LOWER(content::text) LIKE '%sample%'
);

-- 2. Delete test notifications
DELETE FROM notifications
WHERE entity_type = 'resource_discussion'
  AND (
    LOWER(title) LIKE '%test%'
    OR LOWER(message) LIKE '%test%'
    OR LOWER(entity_title) LIKE '%test%'
  );

-- 3. Delete test discussions (cascade will handle child discussions)
DELETE FROM resource_discussions
WHERE LOWER(content::text) LIKE '%test%'
   OR LOWER(content::text) LIKE '%demo%'
   OR LOWER(content::text) LIKE '%sample%';

-- Print final counts
DO $$
DECLARE
  v_discussions_count INTEGER;
  v_reactions_count INTEGER;
  v_notifications_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_discussions_count FROM resource_discussions;
  SELECT COUNT(*) INTO v_reactions_count FROM resource_discussion_reactions;
  SELECT COUNT(*) INTO v_notifications_count
  FROM notifications
  WHERE entity_type = 'resource_discussion';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Remaining discussions: %', v_discussions_count;
  RAISE NOTICE 'Remaining reactions: %', v_reactions_count;
  RAISE NOTICE 'Remaining notifications: %', v_notifications_count;
  RAISE NOTICE '========================================';
END $$;
