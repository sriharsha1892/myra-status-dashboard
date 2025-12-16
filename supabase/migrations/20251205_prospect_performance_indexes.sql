-- Migration: Performance Indexes for Prospect Queries
-- Adds composite indexes for common query patterns

-- ============================================================================
-- Composite index for ProspectActivityTimeline queries
-- Covers: WHERE org_id = ? ORDER BY activity_date DESC
-- More efficient than separate indexes on each column
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_prospect_activities_org_date
  ON prospect_activities(org_id, activity_date DESC);

-- ============================================================================
-- Index for prospect filtering in trial_organizations
-- Covers: WHERE is_prospect = true ORDER BY created_at DESC
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trial_orgs_prospects_created
  ON trial_organizations(created_at DESC) WHERE is_prospect = true;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON INDEX idx_prospect_activities_org_date IS
  'Composite index for activity timeline queries - (org_id, activity_date DESC)';

COMMENT ON INDEX idx_trial_orgs_prospects_created IS
  'Partial index for listing prospects sorted by creation date';
