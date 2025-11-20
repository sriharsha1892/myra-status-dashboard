-- Strategic Timeline Feature
-- Adds support for macro-goals, flexible categorization, and enhanced org demand tracking

-- 1. Add strategic categorization and hierarchy fields to roadmap items
ALTER TABLE org_product_roadmap
ADD COLUMN IF NOT EXISTS strategic_categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS parent_item_id UUID REFERENCES org_product_roadmap(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'task' CHECK (item_type IN ('macro-goal', 'task'));

-- 2. Create index for parent-child relationships
CREATE INDEX IF NOT EXISTS idx_roadmap_parent_item ON org_product_roadmap(parent_item_id) WHERE parent_item_id IS NOT NULL;

-- 3. Create index for strategic categories (GIN index for array operations)
CREATE INDEX IF NOT EXISTS idx_roadmap_strategic_categories ON org_product_roadmap USING GIN(strategic_categories);

-- 4. Create index for item_type filtering
CREATE INDEX IF NOT EXISTS idx_roadmap_item_type ON org_product_roadmap(item_type);

-- 5. Create view for organization demand aggregation
CREATE OR REPLACE VIEW roadmap_org_demand AS
SELECT
  roadmap_item_id,
  COUNT(DISTINCT org_id) as org_count,
  ARRAY_AGG(DISTINCT org_id) FILTER (WHERE org_id IS NOT NULL) as org_ids,
  MAX(CASE
    WHEN priority = 'critical' THEN 4
    WHEN priority = 'high' THEN 3
    WHEN priority = 'medium' THEN 2
    WHEN priority = 'low' THEN 1
    ELSE 0
  END) as max_priority_level,
  ARRAY_AGG(DISTINCT link_type) FILTER (WHERE link_type IS NOT NULL) as link_types
FROM roadmap_org_links
WHERE deleted_at IS NULL
GROUP BY roadmap_item_id;

-- 6. Add helpful comment on strategic_categories column
COMMENT ON COLUMN org_product_roadmap.strategic_categories IS 'Flexible array of strategic category tags (e.g., ["Datasets Expansion", "Enterprise Integrations"]). Supports multiple categories per item and easy evolution of categorization scheme.';

COMMENT ON COLUMN org_product_roadmap.parent_item_id IS 'Reference to parent roadmap item for hierarchical organization. Used for macro-goals that contain child tasks.';

COMMENT ON COLUMN org_product_roadmap.item_type IS 'Distinguishes between macro-level goals and individual tasks. Macro-goals can aggregate progress from child items.';

-- 7. Create function to calculate rollup progress for macro-goals
CREATE OR REPLACE FUNCTION calculate_macro_goal_progress(macro_goal_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  avg_progress INTEGER;
BEGIN
  SELECT COALESCE(AVG(progress_percentage)::INTEGER, 0)
  INTO avg_progress
  FROM org_product_roadmap
  WHERE parent_item_id = macro_goal_id
    AND item_type = 'task';

  RETURN avg_progress;
END;
$$;

COMMENT ON FUNCTION calculate_macro_goal_progress IS 'Calculates aggregate progress for a macro-goal based on average progress of its child tasks.';

-- 8. Create function to get timeline items with org demand
CREATE OR REPLACE FUNCTION get_timeline_items_with_demand(
  p_org_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_categories TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  target_date DATE,
  estimated_completion_date DATE,
  progress_percentage INTEGER,
  item_type TEXT,
  parent_item_id UUID,
  strategic_categories TEXT[],
  org_count BIGINT,
  max_priority_level INTEGER,
  link_types TEXT[],
  owner_name TEXT,
  milestone_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.title,
    r.description,
    r.status,
    r.priority,
    r.target_date,
    r.estimated_completion_date,
    r.progress_percentage,
    r.item_type,
    r.parent_item_id,
    r.strategic_categories,
    COALESCE(d.org_count, 0) as org_count,
    d.max_priority_level,
    d.link_types,
    r.owner_name,
    r.milestone_id,
    r.created_at,
    r.updated_at
  FROM org_product_roadmap r
  LEFT JOIN roadmap_org_demand d ON r.id = d.roadmap_item_id
  WHERE
    (p_org_id IS NULL OR r.org_id = p_org_id)
    AND (p_start_date IS NULL OR r.target_date >= p_start_date)
    AND (p_end_date IS NULL OR r.target_date <= p_end_date)
    AND (p_categories IS NULL OR r.strategic_categories && p_categories)
  ORDER BY r.target_date NULLS LAST, r.priority DESC;
END;
$$;

COMMENT ON FUNCTION get_timeline_items_with_demand IS 'Fetches roadmap items with organization demand aggregation, supporting filtering by org, date range, and categories.';

-- 9. Grant permissions
GRANT SELECT ON roadmap_org_demand TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_macro_goal_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_timeline_items_with_demand TO authenticated;
