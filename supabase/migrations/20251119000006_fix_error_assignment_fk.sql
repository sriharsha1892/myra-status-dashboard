-- Fix error_reports assigned_to FK to reference users table instead of auth.users
-- The assigned_to should reference internal users (admins/account managers), not auth users

-- Drop the existing FK constraint
ALTER TABLE error_reports
DROP CONSTRAINT IF EXISTS error_reports_assigned_to_fkey;

-- Add new FK constraint pointing to users table
ALTER TABLE error_reports
ADD CONSTRAINT error_reports_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- Also fix assigned_by constraint (added by notifications migration)
ALTER TABLE error_reports
DROP CONSTRAINT IF EXISTS error_reports_assigned_by_fkey;

ALTER TABLE error_reports
ADD CONSTRAINT error_reports_assigned_by_fkey
FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT error_reports_assigned_to_fkey ON error_reports
IS 'References internal users table (admins/account managers), not auth.users';

COMMENT ON CONSTRAINT error_reports_assigned_by_fkey ON error_reports
IS 'References internal users table (admins/account managers), not auth.users';
