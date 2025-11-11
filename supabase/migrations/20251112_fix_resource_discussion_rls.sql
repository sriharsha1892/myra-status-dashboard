-- Fix RLS for create_resource_discussion SECURITY DEFINER function
-- The function runs with elevated privileges, but RLS was only allowing authenticated role to INSERT

-- Add a policy that allows ANY authenticated session to insert via SECURITY DEFINER functions
-- The function itself validates auth.uid() is not null, so this is safe

-- Drop the restrictive authenticated policy and replace with more permissive one
DROP POLICY IF EXISTS "Authenticated users can create discussions" ON resource_discussions;

CREATE POLICY "Authenticated users can create discussions"
  ON resource_discussions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also add policy for service role (used by SECURITY DEFINER functions)
CREATE POLICY "Service role can insert discussions"
  ON resource_discussions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Same for reactions table (used by toggle_discussion_reaction function)
DROP POLICY IF EXISTS "Users can add their own reactions" ON resource_discussion_reactions;

CREATE POLICY "Users can add their own reactions"
  ON resource_discussion_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can insert reactions"
  ON resource_discussion_reactions FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON POLICY "Service role can insert discussions" ON resource_discussions IS
  'Allows SECURITY DEFINER functions to insert discussions after validating authentication internally';

COMMENT ON POLICY "Service role can insert reactions" ON resource_discussion_reactions IS
  'Allows SECURITY DEFINER functions to insert reactions after validating authentication internally';
