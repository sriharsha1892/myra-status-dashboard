# Trial Management Setup

## Step 1: Run Database Schema

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `schema-trial.sql`
5. Paste into the SQL Editor
6. Click **Run** to execute

This will create:
- `trial_organizations` table
- `trial_users` table
- `user_activity_log` table
- `import_batches` table
- Add `trial_org_id` column to existing `tickets` table
- Create all necessary indexes and RLS policies

## Step 2: Verify Tables Created

In the Supabase dashboard:
1. Go to **Table Editor**
2. You should see the new tables listed
3. Click on each to verify structure

## Step 3: Test the Application

Once the schema is created:
1. The app will automatically have access to the new tables
2. Navigate to `/trials` (once built) to see the organizations list
3. Use the import wizard at `/trials/import` to bulk upload data

## Troubleshooting

**If you get "relation already exists" errors:**
- Some tables may already exist
- Modify the SQL to only create missing tables

**If RLS policies fail:**
- Check that you're running as a superuser in Supabase
- Or manually add policies through the Authentication > Policies UI
