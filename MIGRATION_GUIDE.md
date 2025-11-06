# Database Migration Guide

## Quick Start

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your project: `mkkhwiyolmowomojvtel`
3. Click "SQL Editor" in the left sidebar
4. Click "New query"

### Step 2: Run Migration SQL
Copy and paste the entire contents of `supabase/migrations/003_notifications_and_links.sql` into the SQL editor and click "Run".

### Step 3: Verify Migration
Run this query to verify tables were created:
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('notifications', 'ticket_links', 'ticket_comments')
ORDER BY table_name, ordinal_position;
```

Expected output should show:
- **notifications**: id, user_id, ticket_id, type, message, is_read, created_at
- **ticket_links**: id, ticket_id, related_ticket_id, link_type, created_by, created_at
- **ticket_comments**: id, ticket_id, user_id, comment, created_at, updated_at

---

## What Gets Created

### Tables
1. **notifications** - In-app notification system
2. **ticket_links** - Ticket dependencies/relationships
3. **ticket_comments** - Comments on tickets (if not exists)

### Indexes
- `idx_notifications_user` - Fast notification queries by user
- `idx_notifications_unread` - Fast unread notification counts
- `idx_ticket_links_ticket` - Fast link lookups by ticket
- `idx_ticket_links_related` - Fast reverse link lookups
- `idx_ticket_comments_ticket` - Fast comment queries

### RLS Policies
- Users can view their own notifications
- Users can update their own notifications (mark as read)
- Anyone can view ticket links
- Authenticated users can create ticket links
- Users can delete their own ticket links
- Anyone can view ticket comments
- Authenticated users can create comments
- Users can update/delete their own comments

---

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Drop tables (be careful - this deletes all data!)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ticket_links CASCADE;
DROP TABLE IF EXISTS ticket_comments CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_notifications_user;
DROP INDEX IF EXISTS idx_notifications_unread;
DROP INDEX IF EXISTS idx_ticket_links_ticket;
DROP INDEX IF EXISTS idx_ticket_links_related;
DROP INDEX IF EXISTS idx_ticket_comments_ticket;
```

---

## Testing the Migration

### Test 1: Create a Notification
```sql
INSERT INTO notifications (user_id, ticket_id, type, message)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM tickets LIMIT 1),
  'status_change',
  'Test notification'
);

-- Verify
SELECT * FROM notifications;
```

### Test 2: Create a Ticket Link
```sql
INSERT INTO ticket_links (ticket_id, related_ticket_id, link_type, created_by)
VALUES (
  (SELECT id FROM tickets LIMIT 1 OFFSET 0),
  (SELECT id FROM tickets LIMIT 1 OFFSET 1),
  'blocks',
  (SELECT id FROM auth.users LIMIT 1)
);

-- Verify
SELECT * FROM ticket_links;
```

### Test 3: Create a Comment
```sql
INSERT INTO ticket_comments (ticket_id, user_id, comment)
VALUES (
  (SELECT id FROM tickets LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'Test comment'
);

-- Verify
SELECT * FROM ticket_comments;
```

---

## Troubleshooting

### Error: "relation already exists"
The table already exists. Either:
1. Drop the table first, or
2. Skip creating that table

### Error: "permission denied"
You need service_role permissions. Make sure you're using the service role key or running as admin in Supabase dashboard.

### Error: "foreign key constraint"
Make sure the `auth.users` and `tickets` tables exist before running the migration.

---

## Post-Migration

After running the migration successfully:

1. ✅ Restart your Next.js dev server
2. ✅ Clear browser cache
3. ✅ Test the notification center in the UI
4. ✅ Test organization panel
5. ✅ Test ticket linking
6. ✅ Check browser console for errors

---

## Need Help?

Check the following files:
- `TESTING_CHECKLIST.md` - Full testing procedures
- `ENHANCEMENTS_GUIDE.md` - Feature documentation
- `supabase/migrations/003_notifications_and_links.sql` - The actual SQL

If tables exist but features don't work:
1. Check RLS policies are enabled
2. Verify user authentication is working
3. Check browser console for errors
4. Check Supabase logs for database errors
