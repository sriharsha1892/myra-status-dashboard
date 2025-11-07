-- Announcements/Bulletin System for Key Features
-- Admins post, both admins and account managers can see

-- 1. Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  announcement_type TEXT NOT NULL DEFAULT 'feature', -- 'feature', 'update', 'maintenance', 'alert'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  status TEXT NOT NULL DEFAULT 'active', -- 'draft', 'active', 'archived'
  posted_by UUID REFERENCES auth.users(id),
  target_roles TEXT[] DEFAULT ARRAY['admin', 'account_manager']::TEXT[], -- who can see it
  expires_at TIMESTAMP, -- optional expiration date
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add URL field to activity_notes
ALTER TABLE activity_notes
  ADD COLUMN IF NOT EXISTS url TEXT;

-- 3. Create indexes for announcements
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_posted_by ON announcements(posted_by);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(announcement_type);

-- 4. Enable RLS on announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for announcements
-- Admins can do everything
CREATE POLICY "Admins can manage all announcements" ON announcements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- Account managers can view active announcements targeted to them
CREATE POLICY "Account managers can view announcements" ON announcements
  FOR SELECT
  USING (
    status = 'active'
    AND (
      'account_manager' = ANY(target_roles)
      OR 'admin' = ANY(target_roles)
    )
    AND (
      expires_at IS NULL
      OR expires_at > NOW()
    )
  );

-- 6. Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_announcements_updated_at ON announcements;
CREATE TRIGGER trigger_update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

-- 8. Add comment
COMMENT ON TABLE announcements IS 'Bulletin/announcements for key features and updates. Posted by admins, visible to admins and account managers.';
COMMENT ON COLUMN activity_notes.url IS 'Optional URL for related resources, will be used for linking in future';
