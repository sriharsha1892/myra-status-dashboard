-- =====================================================
-- FIX: Infinite Recursion in roadmap_saved_views RLS
-- =====================================================
-- Run this in Supabase SQL Editor to fix the issue
-- =====================================================

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view their own and shared views" ON roadmap_saved_views;
DROP POLICY IF EXISTS "Users can manage their own views" ON roadmap_saved_views;

-- Create simplified policies (without team_members reference that caused recursion)
CREATE POLICY "Users can view their own and shared views" ON roadmap_saved_views
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_shared = true
    OR EXISTS (
      SELECT 1 FROM roadmap_view_access
      WHERE view_id = roadmap_saved_views.id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own views" ON roadmap_saved_views
  FOR ALL USING (user_id = auth.uid());

-- Test the fix
SELECT 'RLS policies fixed successfully!' AS status;
SELECT COUNT(*) AS saved_views_count FROM roadmap_saved_views;
