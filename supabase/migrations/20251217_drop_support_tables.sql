-- Drop support/ticket-related tables (no longer used)
-- These tables were part of the support ticket system that has been archived

-- Drop in order (child tables first due to foreign key constraints)
DROP TABLE IF EXISTS ticket_calendar_events CASCADE;
DROP TABLE IF EXISTS ticket_activities CASCADE;
DROP TABLE IF EXISTS ticket_watchers CASCADE;
DROP TABLE IF EXISTS ticket_links CASCADE;
DROP TABLE IF EXISTS ticket_comments CASCADE;
DROP TABLE IF EXISTS ticket_templates CASCADE;
DROP TABLE IF EXISTS trial_support_queries CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;

-- Clean up any related views or functions
DROP FUNCTION IF EXISTS get_ticket_stats CASCADE;
DROP FUNCTION IF EXISTS assign_ticket CASCADE;
