# Run @Mentions Database Migration

## Quick Start

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/[your-project-id]/sql/new

2. **Copy the SQL file**
   - Open: `supabase/migrations/20251107_todo_mentions.sql`
   - Copy entire contents

3. **Paste and Run**
   - Paste into SQL Editor
   - Click "Run" button

4. **Done!**
   - The @mentions feature is now active
   - No app restart needed (already deployed)

## What This Creates

- **todo_mentions table** - Tracks who is @mentioned in each todo
- **RLS policies** - Privacy rules for mentions
- **Indexes** - Fast mention lookups
- **extract_mentions() function** - SQL helper for parsing @mentions

## How to Use

### Creating a Todo with @mentions:

1. Go to Dashboard
2. Click "+" to add a todo
3. Type: "Follow up with client @sudeshana"
4. The widget will show autocomplete dropdown as you type @
5. Select from dropdown or continue typing
6. Save the todo

### Viewing Mentions:

1. Switch to "@Mentioned" tab in todos widget
2. See all todos where you're mentioned
3. Purple badge shows unread count
4. Click todo to mark as read

### Autocomplete:

- Type `@` to trigger dropdown
- Shows up to 5 matching team members
- Search by username or full name
- Click to insert mention

## Example Use Case

**Admin creates:**
"Schedule demo with Mordor Intelligence @sudeshana @admin"

**Sudeshana sees:**
- Todo appears in her "@Mentioned" tab
- Purple badge shows "1"
- Purple highlight indicates unread
- Click to mark as read

**Both can:**
- See the todo context
- Mark it complete
- Track progress

## Troubleshooting

**No mentions showing?**
- Check you ran the SQL migration
- Verify user exists in account managers list
- Try hard refresh (Ctrl+Shift+R)

**Autocomplete not working?**
- Make sure you're typing @ symbol
- Check team members loaded (should see names in dropdown)
- Try clearing browser cache

**RLS errors?**
- Verify you're logged in
- Check user has correct role in Supabase Auth
