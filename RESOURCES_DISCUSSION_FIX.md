# Resources Discussion Fix - Complete Guide

**Date:** 2025-11-12
**Issues Fixed:** "Column name does not exist" and "Unknown user" display

---

## 🐛 Issues Identified

### Issue 1: RPC Function Error
**Error:** `column "name" does not exist`
**Location:** `create_resource_discussion` RPC function
**Cause:** The RPC function was trying to select `name` from the users table, but the column is called `full_name`

### Issue 2: Unknown User Display
**Error:** Posts showing author as "Unknown"
**Location:** QAHubSection.tsx and CommunityFeedSection.tsx components
**Cause:** Components were querying `name` instead of `full_name` from the users table

---

## ✅ Fixes Applied

### 1. Component Fixes (Already Applied)

#### Fixed Files:
- ✅ `components/resources/QAHubSection.tsx`
- ✅ `components/resources/CommunityFeedSection.tsx`

#### Changes Made:
Changed from:
```typescript
.select('name, email')
// and
author_name: authorData?.name || 'Unknown'
```

Changed to:
```typescript
.select('full_name, email')
// and
author_name: authorData?.full_name || 'Unknown'
```

### 2. Database Migration (Needs to be Applied)

**Migration File:** `supabase/migrations/20251112_fix_rpc_column_name.sql`

This migration updates the `create_resource_discussion` RPC function to use `full_name` instead of `name`.

---

## 🚀 How to Apply the Database Fix

### Option 1: Supabase Dashboard (Recommended - 2 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com/project/mkkhwiyolmowomojvtel/sql/new

2. **Copy the Migration SQL**
   - Open: `supabase/migrations/20251112_fix_rpc_column_name.sql`
   - Copy the entire contents

3. **Paste and Execute**
   - Paste into the SQL Editor
   - Click "Run"
   - Wait for "Success" message

4. **Verify**
   - You should see: "CREATE OR REPLACE FUNCTION" success message

### Option 2: Local Script (if you have DB password)

```bash
# Set your database password first
export SUPABASE_DB_PASSWORD="your-password-here"

# Run the migration
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h aws-0-ap-south-1.pooler.supabase.com \
  -p 6543 \
  -d postgres \
  -U postgres.mkkhwiyolmowomojvtel \
  -f supabase/migrations/20251112_fix_rpc_column_name.sql
```

---

## 🧪 Testing the Fixes

### Test 1: Create a Discussion
1. Go to `/support/resources`
2. Click "Start Discussion" in the Community Feed
3. Fill out the form and submit
4. **Expected:** Discussion creates successfully (no column error)

### Test 2: Verify Author Name
1. After creating a discussion
2. Check the author name display
3. **Expected:** Shows your full name (not "Unknown")

### Test 3: Create a Question
1. Go to Q&A Hub section
2. Click "Ask Question"
3. Submit a question
4. **Expected:** Question shows with your full name

---

## 📋 What Was Fixed

| Issue | Location | Fix | Status |
|-------|----------|-----|--------|
| Column "name" error | RPC function | Use `full_name` | ⏳ Needs DB migration |
| Unknown user in discussions | CommunityFeedSection.tsx | Use `full_name` | ✅ Fixed |
| Unknown user in Q&A | QAHubSection.tsx | Use `full_name` | ✅ Fixed |

---

## ⚠️ Important Notes

1. **Component fixes are already applied** - These are ready to use immediately
2. **Database migration needs to be run** - This requires manual SQL execution in Supabase Dashboard
3. **No data migration needed** - This only updates the function, existing data is unaffected

---

## 🔍 Root Cause Analysis

The issue occurred because:

1. **Database Schema:** The `users` table was created with a column called `full_name` (not `name`)
2. **RPC Function:** The `create_resource_discussion` function was written to query `name` from users
3. **React Components:** Components were also querying `name` instead of `full_name`

This is a common issue when:
- Different parts of the codebase are written at different times
- Column names are assumed without checking the actual schema
- There's no TypeScript type safety for database columns

---

## 📝 Prevention for Future

To prevent similar issues:

1. **Use Type-Safe Database Clients:** Consider using Supabase's generated types
2. **Schema Documentation:** Keep a schema reference doc updated
3. **Test All Database Interactions:** Always test RPC functions with real data
4. **Code Reviews:** Check for column name consistency across codebase

---

## ✅ Verification Checklist

After applying the migration, verify:

- [ ] Database migration applied successfully
- [ ] Can create discussions without errors
- [ ] Author names display correctly (not "Unknown")
- [ ] Can create questions in Q&A
- [ ] Mentions work in discussions
- [ ] Notifications are sent for mentions

---

## 🆘 Troubleshooting

### Issue: Migration fails with "function already exists"
**Solution:** This is okay! The migration uses `CREATE OR REPLACE` so it will update the existing function

### Issue: Still seeing "Unknown" after fix
**Solution:**
1. Hard refresh the page (Cmd+Shift+R)
2. Check that the database migration was applied
3. Verify your user record has a `full_name` value

### Issue: Permission denied error
**Solution:** Make sure you're running the SQL in Supabase Dashboard, or that you have the correct DB password

---

**Last Updated:** 2025-11-12
**Status:** Component fixes complete, DB migration pending user action
