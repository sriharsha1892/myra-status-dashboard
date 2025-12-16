-- ============================================
-- Automation Rules Schema
-- Visual workflow automation for alerts and actions
-- ============================================

-- Automation Rules Table
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,

  -- Targeting
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'trial_organizations', 'trial_users', 'tickets'
  )),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Trigger type: event-based or scheduled
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('event', 'schedule')),

  -- Event trigger config (when trigger_type = 'event')
  -- Events: created, updated, field_changed, status_changed
  trigger_event TEXT CHECK (
    trigger_event IS NULL OR trigger_event IN (
      'created', 'updated', 'deleted',
      'field_changed', 'status_changed',
      'trial_expired', 'trial_expiring_soon',
      'ticket_created', 'ticket_assigned', 'ticket_resolved'
    )
  ),

  -- Schedule trigger config (when trigger_type = 'schedule')
  -- Cron expression for scheduled runs (e.g., '0 */15 * * *' for every 15 mins)
  schedule_cron TEXT,

  -- Conditions (AND/OR groups)
  -- Structure: { logic: 'AND' | 'OR', conditions: [...] }
  conditions JSONB NOT NULL DEFAULT '{"logic": "AND", "conditions": []}'::jsonb,

  -- Actions to execute when conditions are met
  -- Structure: [{ type: 'send_notification', config: {...} }, ...]
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Execution settings
  max_executions_per_entity INTEGER, -- Limit how many times this rule runs per entity
  cooldown_minutes INTEGER DEFAULT 60, -- Minimum time between executions for same entity

  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Execution stats
  last_executed_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0
);

-- Automation Execution Log
CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to the rule
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,

  -- Entity that triggered/matched the rule
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,

  -- Execution details
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),

  -- Results
  actions_executed JSONB DEFAULT '[]'::jsonb, -- Which actions ran
  error_message TEXT, -- If failed

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Context snapshot (what the entity looked like when triggered)
  entity_snapshot JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_entity_type ON automation_rules(entity_type);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_type, trigger_event);

CREATE INDEX IF NOT EXISTS idx_automation_executions_rule ON automation_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_entity ON automation_executions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_started ON automation_executions(started_at);

-- RLS Policies
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

-- Admins can manage automation rules
CREATE POLICY "Admins can manage automation rules"
  ON automation_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- All authenticated users can view active rules
CREATE POLICY "Authenticated users can view active automation rules"
  ON automation_rules
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND is_active = true
  );

-- Admins can view all executions
CREATE POLICY "Admins can view automation executions"
  ON automation_executions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.role = 'Admin' OR users.is_super_admin = true)
    )
  );

-- Service role can insert executions (for backend processing)
CREATE POLICY "Service role can manage executions"
  ON automation_executions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Update trigger
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Condition Types Reference (stored in JSONB)
-- ============================================
--
-- Text conditions:
-- { field: 'field_name', operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty', value: 'string' }
--
-- Number conditions:
-- { field: 'field_name', operator: 'equals' | 'not_equals' | 'greater_than' | 'greater_than_or_equals' | 'less_than' | 'less_than_or_equals' | 'between', value: number | [number, number] }
--
-- Date conditions:
-- { field: 'field_name', operator: 'equals' | 'before' | 'after' | 'between' | 'in_last_n_days' | 'in_next_n_days' | 'is_empty' | 'is_not_empty', value: 'date' | number }
--
-- Enum conditions:
-- { field: 'field_name', operator: 'equals' | 'not_equals' | 'in' | 'not_in', value: 'string' | ['string'] }
--
-- Boolean conditions:
-- { field: 'field_name', operator: 'equals', value: true | false }

-- ============================================
-- Action Types Reference (stored in JSONB)
-- ============================================
--
-- Send notification:
-- { type: 'send_notification', config: { channel: 'in_app' | 'email' | 'teams', recipients: 'owner' | 'assignee' | 'specific_users' | 'admins', specific_user_ids?: ['uuid'], message_template: 'string', subject?: 'string' } }
--
-- Update field:
-- { type: 'update_field', config: { field: 'field_name', value: 'new_value' } }
--
-- Create task/ticket:
-- { type: 'create_ticket', config: { title_template: 'string', description_template: 'string', priority: 'low' | 'medium' | 'high', assign_to: 'owner' | 'specific_user', specific_user_id?: 'uuid' } }
--
-- Send Teams message:
-- { type: 'send_teams_message', config: { webhook_url: 'string', message_template: 'string' } }
--
-- Add timeline event:
-- { type: 'add_timeline_event', config: { event_type: 'string', description_template: 'string' } }
--
-- Assign to user:
-- { type: 'assign_user', config: { user_id: 'uuid' | 'round_robin' | 'least_busy' } }

COMMENT ON TABLE automation_rules IS 'Automation rules for triggering actions based on entity events or schedules';
COMMENT ON TABLE automation_executions IS 'Log of automation rule executions';
