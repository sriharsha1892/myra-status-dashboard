-- =====================================================
-- FIX SIGNUP_TOKENS RLS - Allow service role to read all tokens
-- Copy this and run in Supabase SQL Editor
-- =====================================================

-- First, check if RLS is enabled
ALTER TABLE public.signup_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role can read all tokens" ON public.signup_tokens;
DROP POLICY IF EXISTS "Authenticated users can read tokens" ON public.signup_tokens;
DROP POLICY IF EXISTS "Anyone can read tokens" ON public.signup_tokens;

-- Create policy that allows service role (and authenticated users) to read all tokens
CREATE POLICY "Service role can read all tokens"
ON public.signup_tokens
FOR SELECT
TO authenticated, service_role
USING (true);

-- Also allow insert for token creation
DROP POLICY IF EXISTS "Service role can insert tokens" ON public.signup_tokens;
CREATE POLICY "Service role can insert tokens"
ON public.signup_tokens
FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- Allow update for marking tokens as used
DROP POLICY IF EXISTS "Service role can update tokens" ON public.signup_tokens;
CREATE POLICY "Service role can update tokens"
ON public.signup_tokens
FOR UPDATE
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- VERIFICATION QUERY - Run this after to confirm
-- =====================================================
-- SELECT COUNT(*) as total_tokens,
--        COUNT(*) FILTER (WHERE used_at IS NULL) as unused_tokens,
--        COUNT(*) FILTER (WHERE used_at IS NULL AND expires_at > NOW()) as valid_pending_tokens
-- FROM public.signup_tokens;
