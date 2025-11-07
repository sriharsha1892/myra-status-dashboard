-- =====================================================
-- CREATE RPC FUNCTION FOR PENDING TOKENS
-- This bypasses RLS completely
-- =====================================================

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
    t.token,
    t.email,
    t.user_role,
    t.expires_at,
    t.used_at,
    t.created_at,
    t.created_by
  FROM public.signup_tokens t
  WHERE t.used_at IS NULL
    AND t.expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_pending_tokens() TO authenticated, service_role;
