# Database Migration Guide - Roadmap Features

## Issues Fixed

### Migration 1: Saved Filter Views
- **Error:** `relation "team_members" does not exist`
- **Fix:** Removed references to non-existent team_members table
- **File:** `supabase/migrations/20250114_saved_filter_views_FIXED.sql`

### Migration 2: Voting System
- **Error 1:** `relation "idx_feature_request_votes_request_id" already exists`
- **Fix 1:** Added `IF NOT EXISTS` to all CREATE INDEX statements
- **Error 2:** `cannot change name of view column "user_voted" to "comment_count"`
- **Fix 2:** Added `DROP VIEW IF EXISTS` before creating views with new structure
- **File:** `supabase/migrations/20250114_voting_system_complete_FIXED.sql`
- **Note:** This will drop and recreate `feature_requests_with_votes` and `roadmap_items_with_votes` views

---

## Step-by-Step Application

### Step 1: Apply Saved Filter Views Migration

1. Open **Supabase Dashboard**: https://supabase.com/dashboard
2. Select project: **mkkhwiyolmowomojvtel**
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of:
   ```
   /supabase/migrations/20250114_saved_filter_views_FIXED.sql
   ```
6. Paste into SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. Wait for success message:
   ```
   ✅ Saved Filter Views System Successfully Installed!
   ```

### Step 2: Verify Saved Filter Views

Run this verification query:
```sql
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'roadmap_saved_views',
    'roadmap_user_preferences',
    'roadmap_filter_history',
    'roadmap_view_access'
  );
```

**Expected Result:** 4 rows showing all 4 tables

### Step 3: Apply Voting System Migration

1. Still in **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of:
   ```
   /supabase/migrations/20250114_voting_system_complete_FIXED.sql
   ```
4. Paste into SQL Editor
5. Click **Run**
6. Wait for success message:
   ```
   ✅ Comprehensive voting system successfully created!
   ```

### Step 4: Verify Voting System

Run this verification query:
```sql
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'roadmap_item_votes',
    'roadmap_vote_comments',
    'feature_request_votes',
    'feature_request_vote_comments'
  );
```

**Expected Result:** 4 rows showing all 4 voting tables

---

## Verification Checklist

After both migrations, verify functions were created:

```sql
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'save_filter_view',
    'apply_saved_view',
    'update_roadmap_preferences',
    'get_suggested_filters',
    'toggle_feature_vote',
    'toggle_roadmap_vote',
    'toggle_discussion_reaction_enhanced'
  )
ORDER BY routine_name;
```

**Expected Result:** 7 functions listed

---

## Testing in Browser

### Test 1: Saved Filter Views
1. Go to: https://myra-status-dashboard.vercel.app/support/admin/roadmap
2. Click on any organization
3. Look for **Saved Views** dropdown in the filter section
4. Try creating a new saved view:
   - Apply some filters (e.g., priority = "high")
   - Click "Save Current View"
   - Give it a name like "Test View"
   - Verify it appears in the dropdown

### Test 2: Roadmap Voting
1. On the roadmap page
2. Look for vote buttons (thumbs up icon) on roadmap items
3. Click to vote on an item
4. Verify vote count increases
5. Click again to remove vote
6. Verify vote count decreases

### Test 3: Feature Request Voting
1. Go to: https://myra-status-dashboard.vercel.app/support/feature-requests
2. Look for vote buttons on feature requests
3. Test voting similar to roadmap items

---

## Troubleshooting

### If Migration Fails

**Error: "duplicate key value violates unique constraint"**
- Some data already exists
- Safe to ignore - tables are using IF NOT EXISTS

**Error: "permission denied"**
- Check you're using admin/service role
- Verify you're logged into correct Supabase project

**Error: "cannot change name of view column"**
- This means views already exist with different structure
- The FIXED migration now drops views before recreating them
- Safe to run - views will be recreated with correct structure

**Error: "relation does not exist"**
- Check that `trial_organizations` table exists
- Verify `feature_requests` table exists (for voting migration)

### Rollback (if needed)

To remove tables created by migrations:

```sql
-- Remove saved filter views tables
DROP TABLE IF EXISTS roadmap_view_access CASCADE;
DROP TABLE IF EXISTS roadmap_filter_history CASCADE;
DROP TABLE IF EXISTS roadmap_user_preferences CASCADE;
DROP TABLE IF EXISTS roadmap_saved_views CASCADE;

-- Remove voting tables
DROP TABLE IF EXISTS roadmap_vote_comments CASCADE;
DROP TABLE IF EXISTS roadmap_item_votes CASCADE;
DROP TABLE IF EXISTS feature_request_vote_comments CASCADE;
DROP TABLE IF EXISTS feature_request_votes CASCADE;
```

---

## Success Indicators

After successful migration, you should see:

1. **Console Errors Gone:**
   - No more "table does not exist" errors when clicking organization toggle
   - No more "index already exists" errors

2. **New Features Working:**
   - Saved filter views dropdown appears
   - Vote buttons visible on roadmap items
   - Vote counts update correctly

3. **Database Verification:**
   - All 8 new tables created
   - All 7 new functions created
   - RLS policies applied

---

## Next Steps

After migrations complete:

1. Test all features manually in browser
2. Report any issues you encounter
3. Consider running comprehensive E2E tests
4. Deploy to production with confidence

**Estimated Time:** 5-10 minutes for both migrations
