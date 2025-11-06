-- Migration: Fix RLS Policies for Trial Users
-- Description: Allow unauthenticated access to trial_users table for custom admin login system

-- Drop existing restrictive policy on trial_users
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON trial_users;

-- Create new policy that allows all operations (unauthenticated)
CREATE POLICY "Allow all operations" ON trial_users
  FOR ALL USING (true) WITH CHECK (true);
