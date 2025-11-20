'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { startOfMonth, endOfMonth, addMonths, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { Filter, Loader2, CalendarDays, Sparkles } from 'lucide-react';
import { TimelineAxis } from './TimelineAxis';
import { MacroGoalLane } from './MacroGoalLane';
import { CheckpointMarker } from './CheckpointMarker';

interface RoadmapItemData {
  id: string;
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
}

interface OrgDemand {
  roadmap_item_id: string;
  org_count: number;
  max_priority_level: number | null;
  link_types: string[] | null;
}

interface StrategicCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  display_order: number;
}

interface StrategicTimelineViewProps {
  onItemClick?: (itemId: string) => void;
}

/**
 * StrategicTimelineView Component
 *
 * GLOBAL roadmap view for myRA AI product planning.
 * Features:
 * - Adaptive time horizons (near-term, medium-term, long-term)
 * - Dynamic strategic categories (fetched from database, not hardcoded)
 * - Macro-goal swimlanes with nested items
 * - Checkpoint milestone markers
 * - Organization associations as tags/badges
 * - Progressive detail disclosure
 */
export default function StrategicTimelineView({
  onItemClick,
}: StrategicTimelineViewProps) {
  const [items, setItems] = useState<RoadmapItemData[]>([]);
  const [categories, setCategories] = useState<StrategicCategory[]>([]);
  const [orgDemands, setOrgDemands] = useState<Record<string, OrgDemand>>({});
  const [loading, setLoading] = useState(true);
  const [timelineStart, setTimelineStart] = useState(startOfMonth(new Date()));
  const [timelineEnd, setTimelineEnd] = useState(endOfMonth(addMonths(new Date(), 6))); // 6 months ahead
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchTimelineData();
  }, [timelineStart, timelineEnd]);

  const fetchTimelineData = async () => {
    setLoading(true);
    try {
      // Fetch ALL roadmap items (global view)
      const { data: itemsData, error: itemsError } = await supabase
        .from('org_product_roadmap')
        .select('*')
        .order('target_date', { ascending: true, nullsFirst: false });

      if (itemsError) throw itemsError;

      setItems(itemsData || []);

      // Fetch dynamic strategic categories from database
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('strategic_categories')
        .select('id, name, description, color, display_order')
        .eq('is_active', true)
        .order('display_order');

      if (categoriesError) {
        console.warn('Could not fetch strategic categories:', categoriesError);
        // Keep empty if fetch fails - will show uncategorized items
      } else {
        setCategories(categoriesData || []);
      }

      // Fetch organization demand data
      const { data: demandData, error: demandError } = await supabase
        .from('roadmap_org_demand')
        .select('*');

      if (demandError) {
        console.warn('Could not fetch org demand data:', demandError);
      } else if (demandData) {
        const demandMap: Record<string, OrgDemand> = {};
        demandData.forEach((d: any) => {
          demandMap[d.roadmap_item_id] = d;
        });
        setOrgDemands(demandMap);
      }
    } catch (error: any) {
      console.error('Error fetching timeline data:', error);
      toast.error('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  // Group items by strategic categories
  const itemsByCategory = useMemo(() => {
    const categorized: Record<string, RoadmapItemData[]> = {};

    // Initialize all active categories from database
    categories.forEach((cat) => {
      categorized[cat.name] = [];
    });

    // Categorize items
    items.forEach((item) => {
      const itemCategories = item.strategic_categories || [];

      if (itemCategories.length === 0) {
        // Uncategorized items
        if (!categorized['Uncategorized']) {
          categorized['Uncategorized'] = [];
        }
        categorized['Uncategorized'].push(item);
      } else {
        // Add item to each of its categories
        itemCategories.forEach((cat) => {
          if (!categorized[cat]) {
            categorized[cat] = [];
          }
          categorized[cat].push(item);
        });
      }
    });

    // Filter by selected categories if any
    if (selectedCategories.length > 0) {
      const filtered: Record<string, RoadmapItemData[]> = {};
      selectedCategories.forEach((cat) => {
        filtered[cat] = categorized[cat] || [];
      });
      return filtered;
    }

    // Remove empty categories except those defined in database
    Object.keys(categorized).forEach((cat) => {
      const isDefinedCat = categories.some((c) => c.name === cat);
      if (categorized[cat].length === 0 && !isDefinedCat) {
        delete categorized[cat];
      }
    });

    return categorized;
  }, [items, selectedCategories, categories]);

  // Find checkpoint milestones (dates with multiple items)
  const checkpoints = useMemo(() => {
    const dateCounts: Record<string, number> = {};

    items.forEach((item) => {
      if (item.target_date) {
        const monthKey = item.target_date.substring(0, 7); // YYYY-MM
        dateCounts[monthKey] = (dateCounts[monthKey] || 0) + 1;
      }
    });

    // Return dates with 3+ items as checkpoints
    return Object.entries(dateCounts)
      .filter(([_, count]) => count >= 3)
      .map(([date, count]) => ({
        date: parseISO(date + '-01'),
        count,
      }));
  }, [items]);

  // Navigation handlers
  const handleNavigate = (direction: 'prev' | 'next') => {
    const months = direction === 'prev' ? -3 : 3;
    setTimelineStart(addMonths(timelineStart, months));
    setTimelineEnd(addMonths(timelineEnd, months));
  };

  // Category filter
  const toggleCategoryFilter = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading strategic timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Strategic Timeline</h2>
            <p className="text-sm text-slate-600">
              Visual roadmap planning across strategic categories
            </p>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategoryFilter(cat.name)}
                className={`
                  px-3 py-1 rounded-full text-xs font-medium transition-all
                  ${
                    selectedCategories.length === 0 || selectedCategories.includes(cat.name)
                      ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                      : 'bg-slate-100 text-slate-500 border-2 border-transparent opacity-50'
                  }
                `}
                title={cat.description || cat.name}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Axis */}
      <TimelineAxis
        startDate={timelineStart}
        endDate={timelineEnd}
        onNavigate={handleNavigate}
      />

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border-2 border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{items.length}</div>
          <div className="text-sm text-slate-600">Total Items</div>
        </div>
        <div className="bg-green-50 rounded-lg border-2 border-green-200 p-4">
          <div className="text-2xl font-bold text-green-700">
            {items.filter((i) => i.status === 'completed').length}
          </div>
          <div className="text-sm text-green-600">Completed</div>
        </div>
        <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-4">
          <div className="text-2xl font-bold text-blue-700">
            {items.filter((i) => i.status === 'in_progress').length}
          </div>
          <div className="text-sm text-blue-600">In Progress</div>
        </div>
        <div className="bg-purple-50 rounded-lg border-2 border-purple-200 p-4">
          <div className="text-2xl font-bold text-purple-700">{checkpoints.length}</div>
          <div className="text-sm text-purple-600">Key Milestones</div>
        </div>
      </div>

      {/* Strategic Category Lanes */}
      <div className="space-y-4">
        {Object.entries(itemsByCategory).map(([categoryName, categoryItems]) => {
          const categoryInfo = categories.find((c) => c.name === categoryName);

          // Transform items for MacroGoalLane
          const transformedItems = categoryItems.map((item) => ({
            id: item.id,
            title: item.title,
            status: item.status,
            priority: item.priority,
            targetDate: item.target_date,
            progressPercentage: item.progress_percentage || 0,
            ownerName: item.owner_name,
            orgCount: orgDemands[item.id]?.org_count || 0,
            maxPriorityLevel: orgDemands[item.id]?.max_priority_level || 0,
            linkTypes: orgDemands[item.id]?.link_types || [],
          }));

          return (
            <MacroGoalLane
              key={categoryName}
              category={categoryName}
              categoryDescription={categoryInfo?.description || undefined}
              items={transformedItems}
              onItemClick={onItemClick}
            />
          );
        })}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed border-slate-300">
          <CalendarDays className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No roadmap items yet</h3>
          <p className="text-slate-500">
            Add roadmap items and assign them to strategic categories to see your timeline.
          </p>
        </div>
      )}
    </div>
  );
}
