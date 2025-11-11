-- Cleanup Script for Resources Platform Test Data
-- Run this after testing is complete to remove all test/seed data

-- ============================================================================
-- 1. Remove test announcements
-- ============================================================================

-- Delete announcements with 'test' in title or message (case-insensitive)
DELETE FROM announcements
WHERE LOWER(title) LIKE '%test%'
   OR LOWER(message) LIKE '%test%';

-- Delete announcements with 'demo' or 'example' in title
DELETE FROM announcements
WHERE LOWER(title) LIKE '%demo%'
   OR LOWER(title) LIKE '%example%';

-- ============================================================================
-- 2. Remove test resources from document_library
-- ============================================================================

-- Delete resources with 'test' or 'sample' in title
DELETE FROM document_library
WHERE LOWER(title) LIKE '%test%'
   OR LOWER(title) LIKE '%sample%'
   OR LOWER(title) LIKE '%demo%';

-- ============================================================================
-- 3. Remove test discussions and reactions
-- ============================================================================

-- Delete reactions on test discussions (cascades will handle this, but being explicit)
DELETE FROM resource_discussion_reactions
WHERE discussion_id IN (
  SELECT id FROM resource_discussions
  WHERE LOWER(content) LIKE '%test%'
);

-- Delete test discussions
DELETE FROM resource_discussions
WHERE LOWER(content) LIKE '%test%'
   OR LOWER(content) LIKE '%demo%'
   OR LOWER(content) LIKE '%sample%';

-- ============================================================================
-- 4. Remove empty folders (folders with no resources)
-- ============================================================================

-- Delete folders that have no resources
DELETE FROM resource_folders
WHERE id NOT IN (
  SELECT DISTINCT folder_id
  FROM document_library
  WHERE folder_id IS NOT NULL
);

-- ============================================================================
-- 5. Verification Queries (run these to check cleanup)
-- ============================================================================

-- Count remaining announcements
SELECT COUNT(*) as remaining_announcements FROM announcements;

-- Count remaining resources by visibility
SELECT visibility, COUNT(*) as count
FROM document_library
GROUP BY visibility;

-- Count remaining discussions
SELECT COUNT(*) as remaining_discussions FROM resource_discussions;

-- Count remaining folders
SELECT COUNT(*) as remaining_folders FROM resource_folders;

-- Show remaining announcements
SELECT id, type, priority, title, created_at
FROM announcements
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- Cleanup Complete
-- ============================================================================
