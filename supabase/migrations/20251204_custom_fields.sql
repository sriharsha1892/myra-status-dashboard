-- Migration: Custom Data Fields System
-- Allows admins to define custom fields on all major entities
-- Entities: trial_organizations, trial_users, tickets, trial_timeline_events, user_activity_log

-- ============================================
-- 1. Custom Field Definitions Table
-- Central registry for all custom field definitions
-- ============================================

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Field identification
  field_key TEXT NOT NULL,  -- snake_case, unique per entity_type
  field_label TEXT NOT NULL,
  description TEXT,

  -- Entity scope
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'trial_organizations',
    'trial_users',
    'tickets',
    'trial_timeline_events',
    'user_activity_log'
  )),

  -- Field type configuration
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text',
    'number',
    'boolean',
    'date',
    'enum',
    'multi_select',
    'url',
    'email'
  )),

  -- Type-specific configuration (JSONB for flexibility)
  field_config JSONB DEFAULT '{}'::jsonb,
  -- Examples:
  -- text: {"maxLength": 500, "placeholder": "Enter value...", "multiline": false}
  -- number: {"min": 0, "max": 100, "step": 1, "unit": "days"}
  -- enum: {"options": [{"value": "opt1", "label": "Option 1", "color": "#3B82F6"}]}
  -- multi_select: {"options": [...], "maxSelections": 5}
  -- date: {"includeTime": false, "minDate": null, "maxDate": null}

  -- Validation
  is_required BOOLEAN DEFAULT false,
  default_value JSONB,
  validation_regex TEXT,
  validation_message TEXT,

  -- Display configuration
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  show_in_list BOOLEAN DEFAULT false,
  show_in_detail BOOLEAN DEFAULT true,

  -- Query configuration
  is_filterable BOOLEAN DEFAULT true,
  is_sortable BOOLEAN DEFAULT true,
  is_searchable BOOLEAN DEFAULT false,

  -- Import/Export mapping
  import_column_name TEXT,
  export_column_name TEXT,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(entity_type, field_key)
);

-- Indexes for custom field definitions
CREATE INDEX IF NOT EXISTS idx_custom_field_defs_entity_type
  ON custom_field_definitions(entity_type);
CREATE INDEX IF NOT EXISTS idx_custom_field_defs_visible
  ON custom_field_definitions(entity_type, is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_custom_field_defs_filterable
  ON custom_field_definitions(entity_type, is_filterable) WHERE is_filterable = true;
CREATE INDEX IF NOT EXISTS idx_custom_field_defs_display_order
  ON custom_field_definitions(entity_type, display_order);

-- ============================================
-- 2. Add custom_fields JSONB column to entities
-- ============================================

-- trial_organizations (may already have custom_fields)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_organizations' AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE trial_organizations ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- trial_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_users' AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE trial_users ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- tickets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE tickets ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- trial_timeline_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trial_timeline_events' AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE trial_timeline_events ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- user_activity_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_activity_log' AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE user_activity_log ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ============================================
-- 3. GIN indexes for efficient JSONB querying
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trial_orgs_custom_fields
  ON trial_organizations USING gin(custom_fields);
CREATE INDEX IF NOT EXISTS idx_trial_users_custom_fields
  ON trial_users USING gin(custom_fields);
CREATE INDEX IF NOT EXISTS idx_tickets_custom_fields
  ON tickets USING gin(custom_fields);
CREATE INDEX IF NOT EXISTS idx_timeline_events_custom_fields
  ON trial_timeline_events USING gin(custom_fields);
CREATE INDEX IF NOT EXISTS idx_user_activity_custom_fields
  ON user_activity_log USING gin(custom_fields);

-- ============================================
-- 4. RLS Policies for custom_field_definitions
-- ============================================

ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view field definitions
CREATE POLICY "Users can view custom field definitions"
  ON custom_field_definitions FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create/update/delete field definitions
CREATE POLICY "Admins can manage custom field definitions"
  ON custom_field_definitions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (u.role = 'Admin' OR u.is_super_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (u.role = 'Admin' OR u.is_super_admin = true)
    )
  );

-- ============================================
-- 5. Helper Functions
-- ============================================

-- Function to get all custom field definitions for an entity type
CREATE OR REPLACE FUNCTION get_custom_field_definitions(p_entity_type TEXT)
RETURNS TABLE (
  id UUID,
  field_key TEXT,
  field_label TEXT,
  description TEXT,
  field_type TEXT,
  field_config JSONB,
  is_required BOOLEAN,
  default_value JSONB,
  display_order INTEGER,
  is_filterable BOOLEAN,
  show_in_list BOOLEAN,
  show_in_detail BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cfd.id,
    cfd.field_key,
    cfd.field_label,
    cfd.description,
    cfd.field_type,
    cfd.field_config,
    cfd.is_required,
    cfd.default_value,
    cfd.display_order,
    cfd.is_filterable,
    cfd.show_in_list,
    cfd.show_in_detail
  FROM custom_field_definitions cfd
  WHERE cfd.entity_type = p_entity_type
    AND cfd.is_visible = true
  ORDER BY cfd.display_order ASC, cfd.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate custom field values against definitions
CREATE OR REPLACE FUNCTION validate_custom_fields(
  p_entity_type TEXT,
  p_custom_fields JSONB
)
RETURNS TABLE (
  field_key TEXT,
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_definition RECORD;
  v_value JSONB;
  v_is_valid BOOLEAN;
  v_error TEXT;
BEGIN
  -- Get all required fields for this entity type
  FOR v_definition IN
    SELECT * FROM custom_field_definitions
    WHERE entity_type = p_entity_type AND is_visible = true
  LOOP
    v_value := p_custom_fields -> v_definition.field_key;
    v_is_valid := true;
    v_error := NULL;

    -- Check required fields
    IF v_definition.is_required AND (v_value IS NULL OR v_value = 'null'::jsonb) THEN
      v_is_valid := false;
      v_error := v_definition.field_label || ' is required';
    END IF;

    -- Return result for this field
    field_key := v_definition.field_key;
    is_valid := v_is_valid;
    error_message := v_error;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply default values to custom fields
CREATE OR REPLACE FUNCTION apply_custom_field_defaults(
  p_entity_type TEXT,
  p_custom_fields JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := COALESCE(p_custom_fields, '{}'::jsonb);
  v_definition RECORD;
BEGIN
  FOR v_definition IN
    SELECT field_key, default_value
    FROM custom_field_definitions
    WHERE entity_type = p_entity_type
      AND is_visible = true
      AND default_value IS NOT NULL
  LOOP
    -- Only apply default if field doesn't exist or is null
    IF NOT (v_result ? v_definition.field_key)
       OR v_result -> v_definition.field_key = 'null'::jsonb THEN
      v_result := v_result || jsonb_build_object(
        v_definition.field_key,
        v_definition.default_value
      );
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Updated_at Trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_custom_field_definitions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_custom_field_definitions_timestamp
  ON custom_field_definitions;
CREATE TRIGGER trigger_update_custom_field_definitions_timestamp
  BEFORE UPDATE ON custom_field_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_field_definitions_timestamp();

-- ============================================
-- 7. Sample Field Definitions (Optional)
-- ============================================

-- Uncomment to add sample custom fields for testing
/*
INSERT INTO custom_field_definitions (
  field_key, field_label, description, entity_type, field_type, field_config,
  is_required, display_order, show_in_list
) VALUES
-- Organization fields
('industry_vertical', 'Industry Vertical', 'Primary industry classification',
 'trial_organizations', 'enum',
 '{"options": [
   {"value": "fintech", "label": "FinTech", "color": "#10B981"},
   {"value": "healthcare", "label": "Healthcare", "color": "#3B82F6"},
   {"value": "retail", "label": "Retail", "color": "#F59E0B"},
   {"value": "saas", "label": "SaaS", "color": "#8B5CF6"},
   {"value": "other", "label": "Other", "color": "#6B7280"}
 ]}'::jsonb,
 false, 1, true),

('annual_revenue', 'Annual Revenue', 'Estimated annual revenue',
 'trial_organizations', 'enum',
 '{"options": [
   {"value": "0-1m", "label": "$0 - $1M"},
   {"value": "1m-10m", "label": "$1M - $10M"},
   {"value": "10m-50m", "label": "$10M - $50M"},
   {"value": "50m-100m", "label": "$50M - $100M"},
   {"value": "100m+", "label": "$100M+"}
 ]}'::jsonb,
 false, 2, false),

('tech_stack', 'Tech Stack', 'Technologies used by the organization',
 'trial_organizations', 'multi_select',
 '{"options": [
   {"value": "react", "label": "React"},
   {"value": "vue", "label": "Vue"},
   {"value": "angular", "label": "Angular"},
   {"value": "python", "label": "Python"},
   {"value": "node", "label": "Node.js"},
   {"value": "java", "label": "Java"},
   {"value": "dotnet", "label": ".NET"}
 ], "maxSelections": 10}'::jsonb,
 false, 3, false),

-- User fields
('department', 'Department', 'Department within the organization',
 'trial_users', 'enum',
 '{"options": [
   {"value": "engineering", "label": "Engineering"},
   {"value": "product", "label": "Product"},
   {"value": "sales", "label": "Sales"},
   {"value": "marketing", "label": "Marketing"},
   {"value": "support", "label": "Support"},
   {"value": "executive", "label": "Executive"},
   {"value": "other", "label": "Other"}
 ]}'::jsonb,
 false, 1, true),

('linkedin_url', 'LinkedIn Profile', 'Link to LinkedIn profile',
 'trial_users', 'url',
 '{"placeholder": "https://linkedin.com/in/..."}'::jsonb,
 false, 2, false)

ON CONFLICT (entity_type, field_key) DO NOTHING;
*/
