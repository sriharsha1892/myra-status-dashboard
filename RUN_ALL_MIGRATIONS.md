# Run All Required Migrations

## ⚠️ CRITICAL: Fix "Failed to Load Organization" Error

Your production deployment needs **3 migrations** to work properly.

---

## 🚀 Quick Fix (Run These in Order)

### Step 1: Go to Supabase SQL Editor
Visit: https://supabase.com/dashboard/project/[your-project-id]/sql/new

### Step 2: Run These 3 Migrations (in order)

#### Migration 1: Fix trial_users Schema
**File:** `supabase/migrations/20250107_fix_trial_users_schema.sql`
- Adds: name, role, phone, current_stage, account_manager, sales_poc, etc.
- Migrates data from old columns (full_name → name)

**Copy/Paste → Run**

---

#### Migration 2: Drop Old trial_users Columns
**File:** `supabase/migrations/20250107_drop_old_user_columns.sql`
- Removes: full_name, title_role, is_primary_contact, etc.
- Cleans up outdated schema

**Copy/Paste → Run**

---

#### Migration 3: Add trial_organizations Fields ⚠️ **THIS FIXES THE ERROR**
**File:** `supabase/migrations/20250107_add_trial_org_fields.sql`
- Adds: sales_poc, description, org_url, logo_url
- **This is causing your "failed to load organization" error**

**Copy/Paste → Run**

---

## Why You're Getting the Error

The code tries to read these fields from `trial_organizations`:
```typescript
editedOrg.sales_poc
editedOrg.description
editedOrg.org_url
editedOrg.logo_url
```

But they don't exist in the database yet! Migration #3 adds them.

---

## After Running All 3 Migrations:

✅ Organizations will load without errors
✅ Can add/edit users
✅ Can set Sales POC, Description, URL, Logo
✅ Support queries work
✅ Toasts auto-dismiss properly

---

## Verify It Worked

1. **Hard refresh your browser** (Ctrl+Shift+R / Cmd+Shift+R)
2. **Visit a trial org page** - Should load without error
3. **Check the form** - Should see all new fields
4. **Try adding a user** - Should work perfectly

---

## Alternative: Run All at Once

If you want to run all 3 migrations at once, create a new SQL query with:

```sql
-- Migration 1: Fix trial_users schema
\i 20250107_fix_trial_users_schema.sql

-- Migration 2: Drop old columns
\i 20250107_drop_old_user_columns.sql

-- Migration 3: Add trial_organizations fields
\i 20250107_add_trial_org_fields.sql
```

Or just paste all 3 files' contents one after another and run.

---

## Troubleshooting

**Still seeing "failed to load organization"?**
1. Check browser console for specific error
2. Verify migration #3 ran successfully in Supabase
3. Hard refresh your browser
4. Check Supabase logs for any errors

**Users still not working?**
- Make sure migrations #1 and #2 ran successfully
- Try running the schema check: `node scripts/check-trial-users-schema.js`

---

## Summary

| Migration | Purpose | Fixes |
|-----------|---------|-------|
| #1 | Add new trial_users columns | User creation errors |
| #2 | Remove old trial_users columns | Constraint violations |
| #3 | Add trial_organizations fields | **Organization load error** ⚠️ |

**Run all 3 to fix everything!**
