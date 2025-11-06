-- Add role and password fields to trial_users table for admin/org user management
-- This migration adds support for user roles and encrypted passwords

-- Add new columns if they don't exist
ALTER TABLE trial_users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'analyst', 'viewer')),
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS last_password_changed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP;

-- Create an index on password_reset_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_trial_users_password_reset_token ON trial_users(password_reset_token);

-- Create an index on email for user lookups during authentication
CREATE INDEX IF NOT EXISTS idx_trial_users_email ON trial_users(email);

-- Create a comment documenting the role permissions
COMMENT ON COLUMN trial_users.role IS 'User role: admin (full access), manager (edit orgs/users), analyst (view reports), viewer (read-only)';
COMMENT ON COLUMN trial_users.password_hash IS 'Bcrypt hashed password - never expose in queries or API responses';
COMMENT ON COLUMN trial_users.password_reset_token IS 'Temporary token for password reset flow - expires after 24 hours';
