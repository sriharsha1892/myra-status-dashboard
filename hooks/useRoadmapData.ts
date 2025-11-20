import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface RoadmapItem {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_date: string | null;
  estimated_completion_date: string | null;
  progress_percentage: number | null;
  owner_name: string | null;
  strategic_categories: string[] | null;
  item_type: 'macro-goal' | 'task';
  created_at: string;
  updated_at: string;
  label_ids: string[] | null;
  milestone_id: string | null;
  blocked_by_ids: string[] | null;
  blocks_ids: string[] | null;
}

interface Label {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  target_date: string | null;
  status: 'active' | 'completed' | 'cancelled';
  color: string;
}

interface StrategicCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  display_order: number;
  is_active: boolean;
}

interface OrgDemand {
  roadmap_item_id: string;
  org_count: number;
  max_priority_level: number | null;
  link_types: string[] | null;
}

interface RoadmapData {
  items: RoadmapItem[];
  labels: Label[];
  milestones: Milestone[];
  categories: StrategicCategory[];
  orgDemands: Record<string, OrgDemand>;
}

/**
 * Fetch all roadmap data with optimized field selection
 * Shared across Global Roadmap and Master Roadmap views
 */
async function fetchRoadmapData(): Promise<RoadmapData> {
  const supabase = createClient();

  // Parallel fetch with specific field selection (not SELECT *)
  const [itemsData, labelsData, milestonesData, categoriesData, demandData] = await Promise.all([
    // Only select fields we actually use
    supabase
      .from('org_product_roadmap')
      .select(
        'id, org_id, title, description, status, priority, target_date, estimated_completion_date, progress_percentage, owner_name, strategic_categories, item_type, created_at, updated_at, label_ids, milestone_id, blocked_by_ids, blocks_ids'
      )
      .order('target_date', { ascending: true, nullsFirst: false }),

    supabase.from('roadmap_labels').select('id, name, color, description').order('name'),

    supabase
      .from('roadmap_milestones')
      .select('id, name, description, target_date, status, color')
      .order('target_date', { ascending: true, nullsFirst: false }),

    supabase
      .from('strategic_categories')
      .select('id, name, description, color, display_order, is_active')
      .eq('is_active', true)
      .order('display_order'),

    supabase.from('roadmap_org_demand').select('roadmap_item_id, org_count, max_priority_level, link_types'),
  ]);

  if (itemsData.error) throw itemsData.error;

  // Process org demands into a map
  const orgDemands: Record<string, OrgDemand> = {};
  if (demandData.data) {
    demandData.data.forEach((d: any) => {
      orgDemands[d.roadmap_item_id] = d;
    });
  }

  return {
    items: itemsData.data || [],
    labels: labelsData.data || [],
    milestones: milestonesData.data || [],
    categories: categoriesData.data || [],
    orgDemands,
  };
}

/**
 * Shared hook for roadmap data with React Query caching
 *
 * Benefits:
 * - Data is cached for 2 minutes (staleTime)
 * - Switching tabs reuses cached data (instant load)
 * - Automatic background refetch after staleTime
 * - Shared across all roadmap views
 */
export function useRoadmapData() {
  return useQuery({
    queryKey: ['roadmap', 'all'],
    queryFn: fetchRoadmapData,
    staleTime: 2 * 60 * 1000, // 2 minutes - data considered fresh
    cacheTime: 5 * 60 * 1000, // 5 minutes - keep in cache
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

/**
 * Invalidate roadmap cache (call after create/update/delete)
 */
export function invalidateRoadmapCache() {
  const supabase = createClient();
  // This will be available via QueryClient in components
  return ['roadmap', 'all'];
}
