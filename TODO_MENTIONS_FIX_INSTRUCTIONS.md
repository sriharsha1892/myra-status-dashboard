# Todo Mentions Permission Fix - Migration Required

## Issue
When creating todos with `@mentions`, you get a **"permission denied for table users"** error (code 42501).

This happens because the `todo_mentions` table has foreign keys to `auth.users`, and PostgreSQL needs to validate these when inserting, but the client doesn't have SELECT permission on `auth.users` due to RLS.

## Solution
Created a SECURITY DEFINER database function that runs with elevated privileges to handle todo creation with mentions.

## How to Apply the Migration

### Option 1: Using Supabase Dashboard SQL Editor (RECOMMENDED)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Click on **SQL Editor** in the left sidebar
4. Create a new query
5. Copy the entire contents of: `supabase/migrations/20251111_fix_todo_mentions_permissions.sql`
6. Paste into the SQL Editor
7. Click **Run** or press `Cmd/Ctrl + Enter`
8. You should see: "Success. No rows returned"

### Option 2: Using Supabase CLI

```bash
npx supabase db push
```

### Option 3: Using psql (if installed)

```bash
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h aws-0-ap-south-1.pooler.supabase.com \
  -p 6543 \
  -d postgres \
  -U postgres.mkkhwiyolmowomojvtel \
  -f supabase/migrations/20251111_fix_todo_mentions_permissions.sql
```

## What the Migration Does

1. Creates a new database function: `create_todo_with_mentions()`
2. This function:
   - Accepts todo details and an array of mentioned user IDs
   - Creates the todo in `user_todos` table
   - Validates that mentioned users exist in `auth.users` (using SECURITY DEFINER privileges)
   - Creates mention records in `todo_mentions` table
   - Returns the created todo as JSON
3. Grants EXECUTE permission to authenticated users

## Code Changes Made

The `TodosWidget.tsx` has been updated to:
- Call the new RPC function instead of direct INSERT
- Pass all todo details and mentioned user IDs in a single call
- Handle the response correctly

## Testing

After applying the migration:

1. Go to your application
2. Click "Add Todo"
3. Type a todo with a mention, e.g., "@abin.zacharia is a hardworking guy"
4. Click "Add"
5. You should see **"Todo added"** success message
6. No more "permission denied" errors!

## Rollback (if needed)

If you need to rollback:

```sql
DROP FUNCTION IF EXISTS create_todo_with_mentions;
```

## Files Changed

- **NEW**: `supabase/migrations/20251111_fix_todo_mentions_permissions.sql` - Migration file
- **MODIFIED**: `components/support/TodosWidget.tsx` - Updated to use RPC function
- **NEW**: `scripts/apply-todo-mentions-fix.ts` - Helper script (optional)
- **NEW**: `TODO_MENTIONS_FIX_INSTRUCTIONS.md` - This file

---

**After applying the migration, try creating a todo with @mentions again!** 🎉
