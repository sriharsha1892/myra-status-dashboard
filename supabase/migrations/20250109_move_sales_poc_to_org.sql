-- Migration: Move sales_poc from trial_users to trial_organizations
-- Description: sales_poc is an org-level field, not user-level
-- Date: 2025-01-09

-- Step 1: Add sales_poc to trial_organizations
ALTER TABLE trial_organizations
ADD COLUMN IF NOT EXISTS sales_poc TEXT;

COMMENT ON COLUMN trial_organizations.sales_poc IS 'Sales Point of Contact for this trial organization';

-- Step 2: Migrate existing sales_poc data from users to orgs
-- Take the first non-null sales_poc from each org's users
UPDATE trial_organizations org
SET sales_poc = (
  SELECT sales_poc
  FROM trial_users
  WHERE org_id = org.org_id
    AND sales_poc IS NOT NULL
  LIMIT 1
)
WHERE sales_poc IS NULL;

-- Step 3: Drop sales_poc from trial_users
ALTER TABLE trial_users
DROP COLUMN IF EXISTS sales_poc;

COMMENT ON TABLE trial_users IS 'Actual platform users at trial organizations (sales_poc moved to org level)';
