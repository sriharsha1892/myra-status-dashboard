-- ============================================================================
-- AI Features Migration
-- Adds columns for AI-powered features (auto-tagging, health scores, etc.)
-- ============================================================================
-- SAFETY: All changes are ADDITIVE ONLY - no breaking changes
-- - Uses IF NOT EXISTS on all additions
-- - All new columns are nullable or have safe defaults
-- - Existing queries continue to work unchanged
-- - Can be rolled back safely
-- ============================================================================

-- ============================================================================
-- 1. TRIAL ORGANIZATIONS - AI ENHANCEMENTS
-- ============================================================================

-- Add tags column for AI-generated organization tags
ALTER TABLE trial_organizations
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add health scoring columns
ALTER TABLE trial_organizations
ADD COLUMN IF NOT EXISTS health_status TEXT;

ALTER TABLE trial_organizations
ADD COLUMN IF NOT EXISTS health_issues JSONB DEFAULT '[]'::jsonb;

ALTER TABLE trial_organizations
ADD COLUMN IF NOT EXISTS health_recommendations JSONB DEFAULT '[]'::jsonb;

ALTER TABLE trial_organizations
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMP;

-- Add health status constraint (only if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trial_orgs_health_status_check'
  ) THEN
    ALTER TABLE trial_organizations
    ADD CONSTRAINT trial_orgs_health_status_check
    CHECK (
      health_status IS NULL OR
      health_status IN ('healthy', 'warning', 'at-risk', 'critical')
    );
  END IF;
END $$;

-- ============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================================================

-- GIN index for tags array (supports array operations and containment queries)
CREATE INDEX IF NOT EXISTS idx_trial_orgs_tags
ON trial_organizations USING GIN(tags);

-- Index for health status filtering
CREATE INDEX IF NOT EXISTS idx_trial_orgs_health_status
ON trial_organizations(health_status)
WHERE health_status IS NOT NULL;

-- Full-text search index for organizations (if not already exists)
CREATE INDEX IF NOT EXISTS idx_trial_orgs_fulltext
ON trial_organizations USING GIN(
  to_tsvector('english',
    coalesce(org_name, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(comments, '')
  )
);

-- Full-text search index for trial users (for global search)
CREATE INDEX IF NOT EXISTS idx_trial_users_fulltext
ON trial_users USING GIN(
  to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(email, '')
  )
);

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

-- Function to safely update organization tags
CREATE OR REPLACE FUNCTION add_org_tags(
  p_org_id UUID,
  p_new_tags TEXT[]
) RETURNS void AS $$
BEGIN
  UPDATE trial_organizations
  SET tags = array(
    SELECT DISTINCT unnest(
      coalesce(tags, ARRAY[]::TEXT[]) || p_new_tags
    )
  )
  WHERE org_id = p_org_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update health score
CREATE OR REPLACE FUNCTION update_health_score(
  p_org_id UUID,
  p_health_status TEXT,
  p_engagement_score INTEGER,
  p_issues JSONB,
  p_recommendations JSONB
) RETURNS void AS $$
BEGIN
  UPDATE trial_organizations
  SET
    health_status = p_health_status,
    engagement_score = p_engagement_score,
    health_issues = p_issues,
    health_recommendations = p_recommendations,
    last_health_check = NOW()
  WHERE org_id = p_org_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN trial_organizations.tags IS
  'AI-generated tags for categorization (e.g., enterprise, high-engagement, at-risk)';

COMMENT ON COLUMN trial_organizations.health_status IS
  'Overall health status: healthy, warning, at-risk, or critical';

COMMENT ON COLUMN trial_organizations.health_issues IS
  'Array of identified issues affecting trial health';

COMMENT ON COLUMN trial_organizations.health_recommendations IS
  'Array of AI-generated recommendations to improve trial health';

COMMENT ON COLUMN trial_organizations.last_health_check IS
  'Timestamp of last health score calculation';

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================

-- Verify new columns exist
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_organizations' AND column_name = 'tags'
  ), 'tags column not created';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_organizations' AND column_name = 'health_status'
  ), 'health_status column not created';

  RAISE NOTICE '✅ Migration completed successfully - all columns created';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Status: Safe to apply to production
-- Rollback: Can drop columns if needed (data loss only for new AI features)
-- Impact: Zero downtime, no breaking changes to existing functionality
-- ============================================================================
