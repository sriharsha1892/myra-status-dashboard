-- Performance Optimization: Essential Database Indexes (Final Version)
-- Created: 2025-11-21
-- Purpose: Add indexes to frequently queried columns based on actual schema
-- Expected Impact: 30-50% reduction in query time

-- =============================================================================
-- TRIAL_ORGANIZATIONS TABLE - Core Indexes
-- =============================================================================

-- Index for created_at sorting (most common operation)
CREATE INDEX IF NOT EXISTS idx_trial_orgs_created_at_desc
ON trial_organizations(created_at DESC);

-- Index for org_name search
CREATE INDEX IF NOT EXISTS idx_trial_orgs_org_name
ON trial_organizations(org_name);

-- Index for account_manager_id filtering
CREATE INDEX IF NOT EXISTS idx_trial_orgs_account_manager_id
ON trial_organizations(account_manager_id)
WHERE account_manager_id IS NOT NULL;

-- Index for org_lifecycle_stage filtering
CREATE INDEX IF NOT EXISTS idx_trial_orgs_lifecycle_stage
ON trial_organizations(org_lifecycle_stage);

-- Composite index for stage + created_at (common query pattern)
CREATE INDEX IF NOT EXISTS idx_trial_orgs_stage_created
ON trial_organizations(org_lifecycle_stage, created_at DESC);

-- =============================================================================
-- ORG_ACTIVITY_NOTES TABLE - Core Indexes
-- =============================================================================

-- Index for org_id lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_org_activity_notes_org_id
ON org_activity_notes(org_id)
WHERE org_id IS NOT NULL;

-- Index for created_at sorting
CREATE INDEX IF NOT EXISTS idx_org_activity_notes_created_at_desc
ON org_activity_notes(created_at DESC);

-- Composite index for org + created_at (activity timeline queries)
CREATE INDEX IF NOT EXISTS idx_org_activity_notes_org_created
ON org_activity_notes(org_id, created_at DESC)
WHERE org_id IS NOT NULL;

-- =============================================================================
-- ANALYZE TABLES
-- =============================================================================
-- Update query planner statistics for optimal query execution

ANALYZE trial_organizations;
ANALYZE org_activity_notes;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Essential performance indexes created successfully!';
  RAISE NOTICE '✓ Indexes added to: trial_organizations, org_activity_notes';
  RAISE NOTICE '✓ Expected improvement: 30-50%% reduction in query time';
  RAISE NOTICE '✓ Table statistics updated for query planner optimization';
END $$;
