-- Restrict roadmap owner management to admins and super admins only

-- Drop the permissive policy
DROP POLICY IF EXISTS "Allow all for authenticated users" ON roadmap_owner_assignments;

-- Create admin + super admin policies
CREATE POLICY "Admins and Super Admins can view all owner assignments"
  ON roadmap_owner_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' IN ('Admin', 'admin', 'Super Admin', 'super admin'))
    )
  );

CREATE POLICY "Admins and Super Admins can insert owner assignments"
  ON roadmap_owner_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' IN ('Admin', 'admin', 'Super Admin', 'super admin'))
    )
  );

CREATE POLICY "Admins and Super Admins can update owner assignments"
  ON roadmap_owner_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' IN ('Admin', 'admin', 'Super Admin', 'super admin'))
    )
  );

CREATE POLICY "Admins and Super Admins can delete owner assignments"
  ON roadmap_owner_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' IN ('Admin', 'admin', 'Super Admin', 'super admin'))
    )
  );
