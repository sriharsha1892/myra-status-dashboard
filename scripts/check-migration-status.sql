-- Run this in Supabase SQL Editor to check migration status

-- Check which tables exist
SELECT 
  'ticket_templates' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ticket_templates'
  ) as exists
UNION ALL
SELECT 'ticket_links', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_links')
UNION ALL
SELECT 'ticket_watchers', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_watchers')
UNION ALL
SELECT 'comment_mentions', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comment_mentions')
UNION ALL
SELECT 'ticket_activities', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_activities')
UNION ALL
SELECT 'calendar_events', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_events')
UNION ALL
SELECT 'teams_integration', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams_integration')
UNION ALL
SELECT 'teams_messages', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams_messages')
UNION ALL
SELECT 'email_threads', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_threads')
UNION ALL
SELECT 'user_invites', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_invites')
UNION ALL
SELECT 'user_profiles', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
UNION ALL
SELECT 'notifications', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications');
