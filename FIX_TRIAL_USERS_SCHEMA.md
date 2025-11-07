# Fix trial_users Schema Error

## Problem

You're seeing this error when trying to add users:
```
ERROR: 42703: column "current_stage" does not exist
```

This means the `trial_users` table exists but has outdated columns (`full_name`, `title_role`) instead of the new ones (`name`, `role`, `current_stage`, etc.).

## Solution: Run the Schema Fix Migration

### Quick Steps:

1. **Go to Supabase SQL Editor**
   - Visit: https://supabase.com/dashboard/project/[your-project-id]/sql/new

2. **Copy the migration file**
   - Open: `supabase/migrations/20250107_fix_trial_users_schema.sql`
   - Copy entire contents

3. **Paste and Run**
   - Paste into SQL Editor
   - Click "Run" button

4. **Done!**
   - Refresh your browser
   - Try adding a user again

## What This Migration Does

✅ **Adds missing columns:**
- `name` (replaces `full_name` if it exists)
- `role` (replaces `title_role` if it exists)
- `phone`
- `current_stage`
- `account_manager`
- `sales_poc`
- `salesforce_id`
- `invited_at`

✅ **Preserves existing data:**
- Copies `full_name` → `name`
- Copies `title_role` → `role`
- Keeps all existing user records

✅ **Adds indexes:**
- Fast queries by org_id, stage, account_manager, email

✅ **Safe to run:**
- Uses `IF NOT EXISTS` checks
- Won't break if columns already exist
- Won't lose any data

## Old Schema → New Schema Mapping

| Old Column    | New Column      | Why Changed                    |
|---------------|-----------------|--------------------------------|
| `full_name`   | `name`          | Shorter, clearer               |
| `title_role`  | `role`          | Matches industry standard      |
| N/A           | `phone`         | Contact information needed     |
| N/A           | `current_stage` | Track user journey             |
| N/A           | `account_manager` | Link to AM                   |
| N/A           | `sales_poc`     | Sales point of contact         |

## After Migration

You'll be able to:
- ✅ Add new users successfully
- ✅ Edit user information
- ✅ Track user stages (invited, onboarding, active, engaged)
- ✅ Link users to account managers
- ✅ View user journey history

## Verify It Worked

After running the migration, check by:

1. **Try adding a user** - Should work without errors
2. **Run the check script:**
   ```bash
   node scripts/check-trial-users-schema.js
   ```

Should show:
```
✅ All required columns exist!
```

## Troubleshooting

**Still seeing errors after migration?**
- Hard refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)
- Clear your browser cache
- Check Supabase dashboard that migration ran successfully

**Want to start fresh instead?**

If you have no important user data, you can drop and recreate:

```sql
-- ⚠️ DESTRUCTIVE - Only if table is empty or you don't need the data
DROP TABLE IF EXISTS trial_users CASCADE;

-- Then run the full migration:
-- supabase/migrations/20250103_trial_users.sql
```

## Questions?

Check the migration file comments for detailed explanations of each step.
