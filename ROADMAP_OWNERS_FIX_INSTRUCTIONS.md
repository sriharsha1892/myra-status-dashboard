# Roadmap Owners RLS Fix - Apply This Migration

## Issues Fixed

1. **403 Forbidden Error**: When fetching roadmap owners after assignment
2. **No Visual Confirmation**: Owners appear to not save because the fetch fails
3. **Empty String orgId**: Fixed to pass `null` correctly for global roadmap items

## Apply the RLS Policy Migration

### Option 1: Supabase Dashboard SQL Editor (RECOMMENDED)

1. Go to https://supabase.com/dashboard
2. Navigate to your project
3. Click on **SQL Editor**
4. Copy the contents of: `supabase/migrations/20251111_fix_roadmap_owners_rls.sql`
5. Paste and click **Run**

### Migration Contents

```sql
-- Fix RLS policy for roadmap_owner_assignments
-- Allow authenticated users to read owner assignments

DROP POLICY IF EXISTS "Users can view roadmap owner assignments" ON roadmap_owner_assignments;

CREATE POLICY "Users can view roadmap owner assignments"
  ON roadmap_owner_assignments
  FOR SELECT
  TO authenticated
  USING (true);
```

## What This Fixes

**Before Migration:**
- ✅ Owner assignment works (via RPC function with SECURITY DEFINER)
- ❌ Fetching owners fails with 403 Forbidden
- ❌ No visual confirmation that owner was added
- ❌ Owners list appears empty even though owners are assigned

**After Migration:**
- ✅ Owner assignment works
- ✅ Fetching owners works
- ✅ Success toast appears: "Owner assigned as Contributor"
- ✅ Owners list updates immediately
- ✅ Full visual confirmation

## Test After Applying

1. Refresh your browser
2. Go to **Roadmap** page
3. Click on a roadmap item
4. Scroll to "Owners & Contributors" section
5. Click **"+ Add Owner"**
6. Fill in:
   - **Name**: Test User
   - **Email**: test@example.com  (optional)
   - **Role**: Contributor
7. Click **"Add Owner"**

**You should now see:**
- ✅ Green success toast: "Owner assigned as Contributor"
- ✅ Owner appears in the list immediately
- ✅ No 403 errors in console

---

**Status**: Migration ready to apply
**Priority**: High - Blocks owner assignment functionality
