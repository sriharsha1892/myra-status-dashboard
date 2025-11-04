-- Migration: Add org_url column to trial_organizations table
-- Date: 2025-11-04
-- Description: Adds org_url TEXT column to store organization website URLs

-- Add org_url column
ALTER TABLE trial_organizations
ADD COLUMN IF NOT EXISTS org_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN trial_organizations.org_url IS 'Organization website URL';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'trial_organizations' AND column_name = 'org_url';
