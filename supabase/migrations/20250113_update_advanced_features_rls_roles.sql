-- Migration: Update advanced features RLS policies to use new normalized roles
-- Priority: MEDIUM - Updates ticket_templates and calendar_events policies
-- Date: 2025-01-13

-- Drop old policies that reference deprecated 'Team' role in user_profiles
DROP POLICY IF EXISTS "Admins can manage templates" ON ticket_templates;
DROP POLICY IF EXISTS "Users can manage calendar events" ON calendar_events;

-- Create new policy for ticket_templates (Admin-only management)
CREATE POLICY "Admins can manage templates" ON ticket_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'Admin')
);

-- Create new policy for calendar_events (Admin-only management)
CREATE POLICY "Users can manage calendar events" ON calendar_events FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'Admin')
);

-- Note: These policies assume user_profiles table exists and has role column
-- If user_profiles table is deprecated/unused, these policies can be updated
-- to reference the main users table instead
