-- Fix notifications user_id FK to reference users table instead of auth.users
-- Notifications are for internal users (admins/account managers), not auth users

-- Drop the existing FK constraint
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Add new FK constraint pointing to users table
ALTER TABLE notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT notifications_user_id_fkey ON notifications
IS 'References internal users table (admins/account managers), not auth.users';
