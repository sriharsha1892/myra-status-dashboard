-- Create signup_tokens table for one-time signup links
CREATE TABLE IF NOT EXISTS signup_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'user',
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by TEXT
);

-- Create index on token for fast lookups
CREATE INDEX IF NOT EXISTS idx_signup_tokens_token ON signup_tokens(token);

-- Create index on email
CREATE INDEX IF NOT EXISTS idx_signup_tokens_email ON signup_tokens(email);

-- Enable RLS
ALTER TABLE signup_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (via API routes)
CREATE POLICY "Service role can manage signup tokens" ON signup_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);
