-- Migration: Add Performance Indexes
-- Date: 2025-11-18
-- Purpose: Optimize query performance for frequently accessed fields

-- ============================================================================
-- Add index on account_manager_id for faster filtering by account manager
-- ============================================================================

-- Create index on trial_organizations.account_manager_id
-- This speeds up queries that filter or join on account manager
CREATE INDEX IF NOT EXISTS idx_trial_organizations_account_manager_id
ON trial_organizations(account_manager_id);

-- ============================================================================
-- Verification Query (commented out - for manual testing)
-- ============================================================================

-- To verify the index was created, run:
-- SELECT indexname, tablename, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'trial_organizations'
-- AND indexname = 'idx_trial_organizations_account_manager_id';
-- Expected: 1 row with index definition

-- To test query performance improvement:
-- EXPLAIN ANALYZE
-- SELECT * FROM trial_organizations
-- WHERE account_manager_id = 'some-uuid-here';
-- Should show "Index Scan using idx_trial_organizations_account_manager_id"
