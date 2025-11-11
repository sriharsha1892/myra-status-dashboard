-- Migration: Add "Unassigned" to domain constraint
-- Date: 2025-01-10
-- Purpose: Allow "Unassigned" as a valid domain value for trial_organizations

-- Drop the existing constraint
ALTER TABLE trial_organizations DROP CONSTRAINT IF EXISTS trial_organizations_domain_check;

-- Add new constraint that includes "Unassigned"
ALTER TABLE trial_organizations
ADD CONSTRAINT trial_organizations_domain_check
CHECK (domain IN ('TMT', 'NEO', 'AF&B', 'E&C', 'HC', 'AAD', 'Unassigned'));
