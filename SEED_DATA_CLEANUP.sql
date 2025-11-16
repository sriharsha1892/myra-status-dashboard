-- ============================================================================
-- SEED DATA CLEANUP QUERIES
-- Run these in Supabase Dashboard → SQL Editor
-- ============================================================================

-- Step 1: Preview seed organizations (DON'T DELETE YET - just view)
-- ============================================================================
SELECT
  org_id,
  org_name,
  description,
  created_at
FROM trial_organizations
WHERE
  -- Match test/seed organization names
  org_name ILIKE ANY (ARRAY[
    '%test%',
    '%seed%',
    '%demo%',
    '%sample%',
    '%techcorp%',
    '%acme%',
    '%circle k%',
    '%testco%',
    '%qa test%'
  ])
  OR
  -- Match test descriptions
  description ILIKE ANY (ARRAY[
    '%trial organization%',
    '%test description%',
    '%seed data%',
    '%demo organization%'
  ])
ORDER BY created_at DESC;

-- Step 2: Preview seed users (DON'T DELETE YET - just view)
-- ============================================================================
SELECT
  user_id,
  email,
  name,
  role,
  created_at
FROM trial_users
WHERE
  email ILIKE ANY (ARRAY[
    '%@test.com%',
    '%@seed.com%',
    '%@demo.com%',
    '%@example.com%',
    '%@techcorp.com%',
    '%@acmecorp.com%',
    'test@%',
    'seed@%',
    'demo@%'
  ])
ORDER BY created_at DESC;

-- ============================================================================
-- ACTUAL DELETION (Run only after reviewing above)
-- ============================================================================

-- Step 3: Delete seed organizations (CASCADE will delete related data)
-- ============================================================================
-- IMPORTANT: Review the preview query results first!
-- This will also delete all related:
-- - trial_users (with matching org_id)
-- - trial_timeline_events
-- - user_interactions
-- - pain_points
-- - learnings
-- - feature_requests

DELETE FROM trial_organizations
WHERE
  org_name ILIKE ANY (ARRAY[
    '%test%',
    '%seed%',
    '%demo%',
    '%sample%',
    '%techcorp%',
    '%acme%',
    '%circle k%',
    '%testco%',
    '%qa test%'
  ])
  OR
  description ILIKE ANY (ARRAY[
    '%trial organization%',
    '%test description%',
    '%seed data%',
    '%demo organization%'
  ]);

-- Step 4: Delete orphaned seed users (users not belonging to any org)
-- ============================================================================
DELETE FROM trial_users
WHERE
  org_id IS NULL
  AND email ILIKE ANY (ARRAY[
    '%@test.com%',
    '%@seed.com%',
    '%@demo.com%',
    '%@example.com%',
    '%@techcorp.com%',
    '%@acmecorp.com%',
    'test@%',
    'seed@%',
    'demo@%'
  ]);

-- Step 5: Clean up old import sessions (older than 30 days)
-- ============================================================================
DELETE FROM import_sessions
WHERE created_at < NOW() - INTERVAL '30 days';

-- ============================================================================
-- VERIFICATION QUERIES (Run after deletion)
-- ============================================================================

-- Check remaining organizations
SELECT COUNT(*) as remaining_orgs FROM trial_organizations;

-- Check remaining users
SELECT COUNT(*) as remaining_users FROM trial_users;

-- Check for any remaining test data
SELECT org_name FROM trial_organizations
WHERE org_name ILIKE '%test%' OR org_name ILIKE '%demo%'
LIMIT 10;

-- ============================================================================
-- CONSERVATIVE DELETION (If you want to be more careful)
-- ============================================================================

-- Delete only organizations with specific exact names
DELETE FROM trial_organizations
WHERE org_name IN (
  'Test Organization',
  'Seed Org',
  'Demo Company',
  'Sample Corp',
  'TechCorp Solutions',
  'Acme Corp',
  'Circle K',
  'TestCo',
  'QA Test Org'
);

-- Or delete organizations created in the last 7 days that match test patterns
DELETE FROM trial_organizations
WHERE
  created_at > NOW() - INTERVAL '7 days'
  AND (
    org_name ILIKE '%test%'
    OR org_name ILIKE '%demo%'
    OR org_name ILIKE '%seed%'
  );
