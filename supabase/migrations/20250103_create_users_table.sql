-- Create users table for admin/internal user login (Account Managers, Sales POCs, Admins)
-- This is separate from trial_users which tracks platform users

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'account_manager' CHECK (role IN ('admin', 'account_manager', 'sales_poc', 'viewer')),

  -- Account Manager can manage multiple organizations
  managed_org_ids UUID[] DEFAULT '{}',

  -- Account status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Password management
  last_password_changed_at TIMESTAMP WITH TIME ZONE,
  password_reset_token TEXT,
  password_reset_expires_at TIMESTAMP WITH TIME ZONE,

  -- Audit fields
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),

  CONSTRAINT password_not_empty CHECK (password_hash IS NOT NULL AND password_hash != '')
);

-- Create indices for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();

-- Add comments for documentation
COMMENT ON TABLE users IS 'Internal users (Account Managers, Sales POCs, Admins) who can log in and manage the system';
COMMENT ON COLUMN users.role IS 'admin=full access, account_manager=manage assigned orgs, sales_poc=view only, viewer=read-only';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password (12 rounds) - NEVER expose in API responses';
COMMENT ON COLUMN users.managed_org_ids IS 'Array of organization IDs this Account Manager can access';
COMMENT ON COLUMN users.password_reset_token IS 'Temporary token for password reset (expires after 24 hours)';
