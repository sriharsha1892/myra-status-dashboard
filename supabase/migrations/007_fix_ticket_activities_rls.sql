-- Fix RLS policy for ticket_activities to allow inserts from triggers

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view activities" ON ticket_activities;
DROP POLICY IF EXISTS "Allow trigger to insert activities" ON ticket_activities;

-- Recreate SELECT policy
CREATE POLICY "Anyone can view activities"
  ON ticket_activities
  FOR SELECT
  USING (true);

-- Add INSERT policy to allow the trigger to insert activities
-- The trigger runs in the context of the user performing the action
CREATE POLICY "Allow trigger to insert activities"
  ON ticket_activities
  FOR INSERT
  WITH CHECK (true);

-- Verify completion
SELECT 'RLS policy fixed for ticket_activities' as status;
