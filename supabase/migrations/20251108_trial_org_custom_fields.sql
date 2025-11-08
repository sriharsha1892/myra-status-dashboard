-- Custom Fields for Trial Organizations
-- Created: 2025-11-08
-- Purpose: Add flexible custom_fields JSONB column to trial_organizations

-- Add custom_fields column to trial_organizations
ALTER TABLE trial_organizations
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Add index for better query performance on custom fields
CREATE INDEX IF NOT EXISTS idx_trial_orgs_custom_fields ON trial_organizations USING gin(custom_fields);

-- Comment
COMMENT ON COLUMN trial_organizations.custom_fields IS 'Flexible JSON storage for organization-specific custom fields (e.g., industry, company_size, use_case, etc.)';

-- Example custom fields structure:
-- {
--   "industry": "Healthcare",
--   "company_size": "50-200",
--   "use_case": "Market Research",
--   "primary_focus": "Competitive Intelligence",
--   "integration_requirements": ["API", "OneDrive"],
--   "budget_range": "$5k-$10k",
--   "decision_timeline": "Q1 2025"
-- }
