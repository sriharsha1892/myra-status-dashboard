-- Todos System for Account Managers
-- Optimized for demos, follow-ups, feedback collection workflows

-- 1. Create todos table
CREATE TABLE IF NOT EXISTS user_todos (
  todo_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  todo_type TEXT NOT NULL DEFAULT 'task', -- 'demo', 'follow_up', 'feedback', 'task', 'meeting'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  related_org_id UUID REFERENCES trial_organizations(org_id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create feedback_submissions table
CREATE TABLE IF NOT EXISTS feedback_submissions (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  feedback_type TEXT NOT NULL DEFAULT 'feedback', -- 'feedback', 'support', 'bug', 'feature_request'
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new', -- 'new', 'in_review', 'resolved'
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_todos_user_id ON user_todos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_todos_status ON user_todos(status);
CREATE INDEX IF NOT EXISTS idx_user_todos_due_date ON user_todos(due_date);
CREATE INDEX IF NOT EXISTS idx_user_todos_type ON user_todos(todo_type);
CREATE INDEX IF NOT EXISTS idx_user_todos_org ON user_todos(related_org_id);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_submissions(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback_submissions(created_at DESC);

-- 4. Enable RLS
ALTER TABLE user_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for user_todos
-- Users can manage their own todos
CREATE POLICY "Users can manage own todos" ON user_todos
  FOR ALL
  USING (user_id = auth.uid());

-- Admins can view all todos
CREATE POLICY "Admins can view all todos" ON user_todos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- 6. RLS Policies for feedback_submissions
-- Users can create and view their own feedback
CREATE POLICY "Users can manage own feedback" ON feedback_submissions
  FOR ALL
  USING (user_id = auth.uid());

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback" ON feedback_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- 7. Auto-update triggers
CREATE OR REPLACE FUNCTION update_user_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_todos_updated_at ON user_todos;
CREATE TRIGGER trigger_update_user_todos_updated_at
  BEFORE UPDATE ON user_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_user_todos_updated_at();

-- 8. Comments
COMMENT ON TABLE user_todos IS 'Personal todos for account managers - demos, follow-ups, feedback collection, meetings';
COMMENT ON TABLE feedback_submissions IS 'User feedback and support requests for the myRA platform itself';
