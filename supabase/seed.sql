-- Seed data for myRA AI Support Ticketing System
-- Run this after migration to populate test data

-- Insert 20 trial organizations
INSERT INTO organizations (name, trial_start_date, trial_end_date, status) VALUES
  ('Acme Research Corp', '2025-01-01', '2025-01-31', 'Active'),
  ('Global Insights Ltd', '2024-12-15', '2025-01-14', 'Active'),
  ('Market Dynamics Inc', '2025-01-05', '2025-02-04', 'Active'),
  ('TechVision Analytics', '2024-12-01', '2024-12-31', 'Expired'),
  ('Strategic Data Group', '2025-01-10', '2025-02-09', 'Active'),
  ('Innovation Partners', '2024-12-20', '2025-01-19', 'Active'),
  ('Future Trends LLC', '2025-01-03', '2025-02-02', 'Active'),
  ('Intelligence Hub Co', '2024-11-15', '2024-12-15', 'Expired'),
  ('Analysis Pro Ltd', '2025-01-08', '2025-02-07', 'Active'),
  ('Research Nexus Inc', '2024-12-28', '2025-01-27', 'Active'),
  ('Data Horizon Group', '2025-01-02', '2025-02-01', 'Active'),
  ('Insight Dynamics', '2024-12-10', '2025-01-09', 'Active'),
  ('Market Leaders Co', '2025-01-12', '2025-02-11', 'Active'),
  ('Analytics First Ltd', '2024-11-20', '2024-12-20', 'Expired'),
  ('Strategic Minds Inc', '2025-01-06', '2025-02-05', 'Active'),
  ('Venture Insights', '2024-12-25', '2025-01-24', 'Active'),
  ('Precision Research', '2025-01-04', '2025-02-03', 'Active'),
  ('Growth Analytics', '2024-12-18', '2025-01-17', 'Active'),
  ('Market Intelligence Pro', '2025-01-09', '2025-02-08', 'Active'),
  ('Trend Watchers LLC', '2024-12-22', '2025-01-21', 'Active');

-- Note: Test users must be created through Supabase Auth Dashboard or API
-- After creating users in Supabase Auth, you can insert sample tickets
-- Replace the UUIDs below with actual user IDs from auth.users

-- Sample tickets with different statuses and priorities
INSERT INTO tickets (organization, user_name, user_email, category, priority, status, description, created_at) VALUES
  ('Acme Research Corp', 'John Smith', 'john@acme-research.com', 'Security', 'High', 'New',
   'We need clarification on data encryption standards for our research outputs. Can you provide documentation on how sensitive data is handled?',
   NOW() - INTERVAL '2 hours'),

  ('Global Insights Ltd', 'Sarah Johnson', 'sarah@globalinsights.com', 'Tool Functioning', 'Critical', 'In Progress',
   'The export functionality is not working. When we try to export reports to PDF, we get a timeout error.',
   NOW() - INTERVAL '1 day'),

  ('Market Dynamics Inc', 'Michael Chen', 'mchen@marketdynamics.com', 'Feature Set', 'Medium', 'New',
   'Is there a way to customize the research templates? We would like to add our own company branding.',
   NOW() - INTERVAL '3 hours'),

  ('Strategic Data Group', 'Emily Rodriguez', 'emily@strategicdata.com', 'Usage', 'Low', 'Waiting on User',
   'How do we share research outputs with external stakeholders? Looking for best practices.',
   NOW() - INTERVAL '2 days'),

  ('Innovation Partners', 'David Park', 'dpark@innovationpartners.com', 'Data Quality', 'High', 'In Progress',
   'Some of the market data seems outdated. The automotive industry report shows 2023 data but we need 2024.',
   NOW() - INTERVAL '4 hours'),

  ('Future Trends LLC', 'Lisa Wang', 'lwang@futuretrends.com', 'Performance', 'Medium', 'Resolved',
   'The platform has been slow when generating large reports. Is this expected?',
   NOW() - INTERVAL '3 days'),

  ('Analysis Pro Ltd', 'Robert Taylor', 'rtaylor@analysispro.com', 'Feature Request', 'Medium', 'New',
   'Can we get an API integration to pull research data directly into our CRM?',
   NOW() - INTERVAL '5 hours'),

  ('Research Nexus Inc', 'Amanda Martinez', 'amartinez@researchnexus.com', 'Security', 'Medium', 'New',
   'Do you support SSO integration? We use Okta for our organization.',
   NOW() - INTERVAL '6 hours'),

  ('Data Horizon Group', 'James Wilson', 'jwilson@datahorizon.com', 'Tool Functioning', 'High', 'In Progress',
   'Search functionality is returning incomplete results. When searching for "EV market" we only get 3 results.',
   NOW() - INTERVAL '8 hours'),

  ('Insight Dynamics', 'Patricia Brown', 'pbrown@insightdynamics.com', 'Usage', 'Low', 'Closed',
   'Need training on how to use the advanced filters in research queries.',
   NOW() - INTERVAL '5 days'),

  ('Market Leaders Co', 'Christopher Lee', 'clee@marketleaders.com', 'Data Quality', 'Critical', 'New',
   'Critical: The healthcare market data for Q4 2024 contains duplicate entries.',
   NOW() - INTERVAL '1 hour'),

  ('Strategic Minds Inc', 'Jennifer Kim', 'jkim@strategicminds.com', 'Feature Request', 'Low', 'New',
   'Would love to see a dark mode option for the interface.',
   NOW() - INTERVAL '7 hours'),

  ('Venture Insights', 'Daniel Garcia', 'dgarcia@ventureinsights.com', 'Performance', 'High', 'In Progress',
   'Dashboard loading times have increased significantly in the past week.',
   NOW() - INTERVAL '12 hours'),

  ('Precision Research', 'Michelle Anderson', 'manderson@precisionresearch.com', 'Other', 'Medium', 'Waiting on User',
   'We need help understanding the pricing structure for additional users.',
   NOW() - INTERVAL '1 day'),

  ('Growth Analytics', 'Kevin Thompson', 'kthompson@growthanalytics.com', 'Feature Set', 'Medium', 'Resolved',
   'Can we export data in Excel format instead of just CSV?',
   NOW() - INTERVAL '4 days');

-- Sample comments (add after creating tickets and getting their IDs)
-- You'll need to replace ticket_id and user_id with actual values

-- INSERT INTO ticket_comments (ticket_id, user_id, comment, is_internal) VALUES
--   ('[ticket_id]', '[user_id]', 'Thanks for reporting this. Our team is investigating the issue.', false),
--   ('[ticket_id]', '[user_id]', 'Internal note: This appears to be related to the recent API update.', true),
--   ('[ticket_id]', '[user_id]', 'We have identified the root cause and are working on a fix.', false);

-- Instructions for completing the seed:
-- 1. Run the migration first: supabase db push
-- 2. Create test users in Supabase Auth Dashboard:
--    - am@test.com (role: AM)
--    - team@test.com (role: Team)
--    - admin@test.com (role: Admin)
-- 3. For each user, set user_metadata: {"role": "AM"} (or "Team" or "Admin")
-- 4. Get the user IDs from auth.users table
-- 5. Uncomment and update the INSERT statements above with actual user IDs
-- 6. Run this seed file: psql -h [host] -d [database] -f supabase/seed.sql
