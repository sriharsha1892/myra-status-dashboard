-- =====================================================
-- FIX RPC FUNCTION - Correct column names
-- =====================================================

DROP FUNCTION IF EXISTS get_pending_tokens();

CREATE OR REPLACE FUNCTION get_pending_tokens()
RETURNS TABLE (
  token UUID,
  email TEXT,
  user_role TEXT,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  created_by UUID
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
    signup_tokens.used_at,
    signup_tokens.created_at,
    signup_tokens.created_by
  FROM public.signup_tokens
  WHERE signup_tokens.used_at IS NULL
    AND signup_tokens.expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_pending_tokens() TO authenticated, service_role;
