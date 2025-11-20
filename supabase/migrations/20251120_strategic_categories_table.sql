-- Strategic Categories Management
-- Creates a table for managing strategic categories dynamically (not hardcoded)

-- 1. Create strategic_categories table
CREATE TABLE IF NOT EXISTS strategic_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT 'purple', -- For UI theming (purple, blue, green, orange, pink, cyan)
  icon TEXT, -- Optional icon name or emoji
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add indexes
CREATE INDEX idx_strategic_categories_active ON strategic_categories(is_active) WHERE is_active = true;
CREATE INDEX idx_strategic_categories_order ON strategic_categories(display_order);

-- 3. Insert default strategic categories (based on your 6 categories)
INSERT INTO strategic_categories (name, description, color, display_order) VALUES
  ('Datasets Expansion', 'Adding datasets at scale without creating organization-specific agents', 'purple', 1),
  ('Enterprise Integrations', 'CRM (Salesforce), ERP (SAP/Oracle), collaboration tools (Teams/Slack)', 'blue', 2),
  ('Feature Development', 'Customer experience optimization - response time, output quality, ease of use', 'green', 3),
  ('Platform Optimizations', 'Technical debt management, performance improvements, scalability enhancements', 'orange', 4),
  ('Expert Insights Network', 'Credible expert validators with 15+ years experience, active practitioner status', 'pink', 5),
  ('Survey Panels Integration', 'Primary research capability for consumer insights when desk research is insufficient', 'cyan', 6)
ON CONFLICT (name) DO NOTHING;

-- 4. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_strategic_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for updated_at
CREATE TRIGGER strategic_categories_updated_at
  BEFORE UPDATE ON strategic_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_strategic_categories_updated_at();

-- 6. Add RLS policies
ALTER TABLE strategic_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read active categories
CREATE POLICY strategic_categories_read_policy
  ON strategic_categories
  FOR SELECT
  USING (is_active = true);

-- Only authenticated users can manage categories (admins)
CREATE POLICY strategic_categories_manage_policy
  ON strategic_categories
  FOR ALL
  USING (auth.role() = 'authenticated');

-- 7. Grant permissions
GRANT SELECT ON strategic_categories TO authenticated;
GRANT SELECT ON strategic_categories TO anon;

-- 8. Add helpful comments
COMMENT ON TABLE strategic_categories IS 'Modular strategic categories for organizing roadmap items. Categories can be added, modified, or deactivated without code changes.';
COMMENT ON COLUMN strategic_categories.name IS 'Unique category name (e.g., "Datasets Expansion")';
COMMENT ON COLUMN strategic_categories.color IS 'UI theme color: purple, blue, green, orange, pink, cyan, or any valid Tailwind color';
COMMENT ON COLUMN strategic_categories.display_order IS 'Order in which categories appear in the UI (lower numbers first)';
COMMENT ON COLUMN strategic_categories.is_active IS 'Whether this category is currently active and should be shown in UI';
