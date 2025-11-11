-- Add Sriharsha as Super Admin to users table
-- Run this in Supabase Dashboard > SQL Editor

INSERT INTO users (
  id,
  email,
  password_hash,
  full_name,
  role,
  parent_company,
  is_super_admin,
  is_active
)
VALUES (
  '5b78a00e-c660-4422-bfae-d7104e45452d',
  'sriharsha@mordorintelligence.com',
  '$2b$10$7DaVbPO9pQAf3th.nmsd9eYVyLqABnyy1k2dNkDYBEV2iLMe0z6X2',
  'Sriharsha',
  'admin',
  'Mordor Intelligence',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  password_hash = '$2b$10$7DaVbPO9pQAf3th.nmsd9eYVyLqABnyy1k2dNkDYBEV2iLMe0z6X2',
  is_super_admin = true,
  role = 'admin',
  parent_company = 'Mordor Intelligence',
  is_active = true;

-- Verify the user was added
SELECT id, email, full_name, role, is_super_admin, is_active
FROM users
WHERE email = 'sriharsha@mordorintelligence.com';
