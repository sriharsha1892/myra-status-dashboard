-- =====================================================
-- FIX RPC FUNCTION - Correct column types to match table schema
-- token is TEXT not UUID, used is BOOLEAN not TIMESTAMPTZ
-- =====================================================

DROP FUNCTION IF EXISTS get_pending_tokens();

CREATE OR REPLACE FUNCTION get_pending_tokens()
RETURNS TABLE (
  token TEXT,
  email TEXT,
  user_role TEXT,
  expires_at TIMESTAMPTZ,
  used BOOLEAN,
  created_at TIMESTAMPTZ,
  created_by TEXT
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    signup_tokens.token,
    signup_tokens.email,
    signup_tokens.user_role,
    signup_tokens.expires_at,
    signup_tokens.used,
    signup_tokens.created_at,
    signup_tokens.created_by
  FROM public.signup_tokens
  WHERE signup_tokens.used = false
    AND signup_tokens.expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_pending_tokens() TO authenticated, service_role;
