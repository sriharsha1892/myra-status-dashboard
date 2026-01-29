-- Migration: Remove DataViz and mark Synapse buyers
-- Description: DataViz is test data to be removed. Salic and Hausmann are Synapse buyers (not myRA commercial customers)

-- ============================================================================
-- REMOVE DATAVIZ
-- ============================================================================
-- DataViz Solutions is test/seed data that should not be in production
DELETE FROM trial_organizations
WHERE org_name = 'DataViz Solutions';

-- ============================================================================
-- MARK SYNAPSE BUYERS
-- ============================================================================
-- Salic and Hausmann Aromatic Group are buyers of Synapse (different product)
-- They have no commercial relationship with myRA and should be noted as such

-- Update Salic
UPDATE trial_organizations
SET notes = COALESCE(notes || E'\n\n', '') || '[SYNAPSE BUYER] This organization purchased Synapse, not myRA. No commercial gain for myRA pipeline.',
    org_lifecycle_stage = 'lost'
WHERE org_name = 'Salic';

-- Update Hausmann Aromatic Group
UPDATE trial_organizations
SET notes = COALESCE(notes || E'\n\n', '') || '[SYNAPSE BUYER] This organization purchased Synapse, not myRA. No commercial gain for myRA pipeline.',
    org_lifecycle_stage = 'lost'
WHERE org_name = 'Hausmann Aromatic Group';
