-- ============================================
-- Smart Assignment Rules Schema
-- Automatically assign trials to team members
-- ============================================

-- Assignment rules table
CREATE TABLE IF NOT EXISTS assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule identity
  name TEXT NOT NULL,
  description TEXT,

  -- Priority (lower = higher priority)
  priority INTEGER NOT NULL DEFAULT 100,

  -- Is rule active?
  is_active BOOLEAN DEFAULT true,

  -- Rule conditions (JSON array of conditions)
  -- Each condition: { field, operator, value }
  -- Fields: industry, company_size, source, region, plan_type, etc.
  -- Operators: equals, not_equals, contains, starts_with, in, not_in, greater_than, less_than
  conditions JSONB NOT NULL DEFAULT '[]',

  -- Match type: 'all' (AND) or 'any' (OR)
  match_type TEXT NOT NULL DEFAULT 'all' CHECK (match_type IN ('all', 'any')),

  -- Assignment target
  -- Can be a specific user ID or round-robin group
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('user', 'round_robin', 'load_balanced')),
  assigned_user_id UUID REFERENCES users(id),
  round_robin_pool UUID[] DEFAULT '{}',  -- Array of user IDs for round-robin

  -- For round-robin, track last assigned
  last_assigned_index INTEGER DEFAULT 0,

  -- Assignment outcomes
  -- What happens when rule matches
  set_status TEXT,  -- e.g., 'active', 'pending_review'
  add_tags TEXT[] DEFAULT '{}',
  notify_on_assignment BOOLEAN DEFAULT true,

  -- Statistics
  total_matches INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignment history table (track what was assigned and why)
CREATE TABLE IF NOT EXISTS assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was assigned
  org_id UUID REFERENCES trial_organizations(org_id),

  -- Who it was assigned to
  assigned_to UUID REFERENCES users(id) NOT NULL,
  previous_assignee UUID REFERENCES users(id),

  -- How it was assigned
  assignment_method TEXT NOT NULL CHECK (assignment_method IN ('rule', 'manual', 'round_robin', 'load_balanced', 'rebalance')),
  rule_id UUID REFERENCES assignment_rules(id),
  rule_name TEXT,

  -- Why (explanation)
  match_reason TEXT,

  -- Timestamp
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id)  -- NULL if automatic
);

-- Team capacity settings
CREATE TABLE IF NOT EXISTS team_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES users(id) NOT NULL UNIQUE,

  -- Capacity limits
  max_active_trials INTEGER DEFAULT 20,
  max_new_per_week INTEGER DEFAULT 5,

  -- Current load (cached, updated periodically)
  current_active_count INTEGER DEFAULT 0,
  new_this_week_count INTEGER DEFAULT 0,

  -- Availability
  is_accepting_new BOOLEAN DEFAULT true,
  away_until DATE,

  -- Specializations (used for smart matching)
  specializations JSONB DEFAULT '{}',  -- { industry: [...], company_size: [...] }

  -- Stats
  avg_trial_duration_days NUMERIC,
  conversion_rate NUMERIC,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assignment_rules_active ON assignment_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_assignment_rules_priority ON assignment_rules(priority);
CREATE INDEX IF NOT EXISTS idx_assignment_history_org ON assignment_history(org_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_assigned_to ON assignment_history(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assignment_history_date ON assignment_history(assigned_at);
CREATE INDEX IF NOT EXISTS idx_team_capacity_user ON team_capacity(user_id);
CREATE INDEX IF NOT EXISTS idx_team_capacity_accepting ON team_capacity(is_accepting_new) WHERE is_accepting_new = true;

-- RLS Policies
ALTER TABLE assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_capacity ENABLE ROW LEVEL SECURITY;

-- Admins can manage rules
CREATE POLICY "Admins can manage assignment rules"
  ON assignment_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- All authenticated users can view rules
CREATE POLICY "Users can view assignment rules"
  ON assignment_rules
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- All users can view assignment history
CREATE POLICY "Users can view assignment history"
  ON assignment_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins can create assignment history
CREATE POLICY "Admins can create assignment history"
  ON assignment_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- Users can view their own capacity
CREATE POLICY "Users can view their own capacity"
  ON team_capacity
  FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.role = 'Admin' OR users.is_super_admin = true)
  ));

-- Users can update their own capacity
CREATE POLICY "Users can update their own capacity"
  ON team_capacity
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all capacity
CREATE POLICY "Admins can manage team capacity"
  ON team_capacity
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- Service role full access
CREATE POLICY "Service role full access assignment rules"
  ON assignment_rules
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access assignment history"
  ON assignment_history
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access team capacity"
  ON team_capacity
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Update trigger
CREATE TRIGGER update_assignment_rules_updated_at
  BEFORE UPDATE ON assignment_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_capacity_updated_at
  BEFORE UPDATE ON team_capacity
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update rule match count
CREATE OR REPLACE FUNCTION increment_rule_match_count(rule_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE assignment_rules
  SET total_matches = total_matches + 1,
      last_matched_at = NOW()
  WHERE id = rule_uuid;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE assignment_rules IS 'Rules for automatically assigning trials to team members';
COMMENT ON TABLE assignment_history IS 'History of all trial assignments';
COMMENT ON TABLE team_capacity IS 'Team member capacity and availability settings';
