-- Migration: Remove phone field from trial_users
-- Description: Phone tracking is not needed per user
-- Date: 2025-01-09

ALTER TABLE trial_users DROP COLUMN IF EXISTS phone;

COMMENT ON TABLE trial_users IS 'Actual platform users at trial organizations (phone field removed - not needed)';
