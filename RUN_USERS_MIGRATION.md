# Run Trial Users Database Migration

## ⚠️ IMPORTANT: Database Schema Update Required

The user management feature requires updating the database schema. The migration creates the `trial_users` table with proper columns.

## Quick Start

### 1. Go to Supabase Dashboard
- Visit: https://supabase.com/dashboard/project/[your-project-id]/sql/new

### 2. Copy the SQL Migration
- Open: `supabase/migrations/20250103_trial_users.sql`
- Copy entire contents (280 lines)

### 3. Paste and Run
- Paste into SQL Editor
- Click "Run" button

### 4. Done!
- The user management feature will now work
- Refresh your browser to see the new Users section

## What This Creates

### Main Table: trial_users
Columns:
- `user_id` (UUID, Primary Key)
- `org_id` (UUID, Foreign Key to trial_organizations)
- `name` (TEXT) - Full name of the user
- `email` (TEXT) - User's email
- `role` (TEXT) - Their role at the company (Product Manager, Engineer, etc.)
- `phone` (TEXT) - Contact phone number
- `current_stage` (TEXT) - Journey stage: invited, onboarding, active, engaged, inactive
- `account_manager` (TEXT) - Assigned account manager
- `sales_poc` (TEXT) - Sales point of contact
- `created_at`, `last_active_at`, `invited_at` (TIMESTAMPS)

### Supporting Tables:
- `user_stage_history` - Tracks stage progression over time
- `user_activities` - Structured activity log
- `user_topics` - Topics/use cases being explored
- `user_issues` - Issues and blockers
- `user_progress_metrics` - Quantifiable progress metrics
- `user_interactions` - All touchpoints with users

### RLS Policies
- All tables have Row Level Security enabled
- Authenticated users can perform all operations

### Indexes
- Optimized for fast queries by org_id, email, stage, etc.

## How to Use After Migration

### 1. View Users
- Go to any trial organization detail page
- See "Users" section prominently displayed in the Overview tab
- View list of all users with their info, stage, and last active date

### 2. Add New User
- Click "Add User" button
- Fill in: Name, Email, Role, Phone, Current Stage
- User is automatically linked to the organization
- User appears immediately in the list

### 3. Edit User
- Click the edit icon (pencil) next to any user
- Update their information or change their stage
- Changes saved instantly

### 4. Delete User
- Click the delete icon (trash) next to any user
- Confirm deletion
- User and all related data removed

### 5. Track User Journey
- Users progress through stages: invited → onboarding → active → engaged
- Stage history automatically tracked in `user_stage_history` table
- See last active time to monitor engagement

### 6. Add Demo Users (Optional)
Run the helper script to populate with sample users:
```bash
node scripts/add-demo-users.js
```

This adds 2-3 realistic users to your trial organizations for testing.

## Database Schema Match

The code now uses the correct schema:

**Old (broken):**
- `full_name` ❌
- `title_role` ❌
- `is_primary_contact` ❌

**New (correct):**
- `name` ✅
- `role` ✅
- `current_stage` ✅
- `phone` ✅
- `account_manager` ✅

## Features Now Available

✅ **User Management in Trial Orgs**
- Add, edit, delete users
- Track user journey stages
- Monitor last active times

✅ **Stage Tracking**
- Automatic stage history logging
- Visual stage badges with colors
- Track progression over time

✅ **User Activities**
- Link activities to specific users
- Track topics, issues, interactions
- Record progress metrics

✅ **Engagement Insights**
- See which users are active/engaged
- Identify inactive users needing attention
- Track user adoption of platform

## Troubleshooting

**Error: "column trial_users.name does not exist"**
- The migration hasn't been run yet
- Follow steps 1-3 above to run the SQL migration

**Error: "could not find account_manager column"**
- Same issue - migration not run
- Run the SQL migration to create all columns

**Users not showing up?**
- Check you're on the correct trial org detail page
- Refresh your browser (Ctrl+Shift+R)
- Verify migration ran successfully

**Can't add users?**
- Ensure name and email fields are filled in
- Check browser console for any errors
- Verify you have network connection to Supabase

## Next Steps

After running the migration and adding users:

1. **Link Users to Activities**
   - All user activities, topics, issues are now linked to specific users
   - Better tracking of individual engagement

2. **Track User Progress**
   - Update user stages as they progress
   - View stage history to see journey timeline

3. **Manage Engagement**
   - Identify users who need help (invited but not active)
   - Celebrate engaged users
   - Follow up with inactive users

4. **Integration with Other Features**
   - User activities feed into engagement scores
   - User data enriches meeting notes and demos
   - Better context for support queries
