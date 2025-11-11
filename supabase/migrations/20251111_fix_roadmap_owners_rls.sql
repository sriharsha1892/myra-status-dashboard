-- Fix RLS policy for roadmap_owner_assignments
-- Allow authenticated users to read owner assignments for roadmap items they can see

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view roadmap owner assignments" ON roadmap_owner_assignments;

-- Create policy to allow reading owner assignments
CREATE POLICY "Users can view roadmap owner assignments"
  ON roadmap_owner_assignments
  FOR SELECT
  TO authenticated
  USING (true);  -- Allow all authenticated users to see all owner assignments

-- Comment explaining the policy
COMMENT ON POLICY "Users can view roadmap owner assignments" ON roadmap_owner_assignments IS
  'Allow authenticated users to view all roadmap owner assignments. This is necessary for displaying owners in the UI.';
