'use client';

import { useState, useMemo } from 'react';
import { Filter, Loader2, CalendarDays, Sparkles, Zap, TrendingUp, Target, Rocket } from 'lucide-react';
import { TimelineItem } from './TimelineItem';
import { OrgDemandBadge } from './OrgDemandBadge';
import { useRoadmapData } from '@/hooks/useRoadmapData';

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

interface StrategicTimelineViewEnhancedProps {
  onItemClick?: (itemId: string) => void;
}

export default function StrategicTimelineViewEnhanced({
  onItemClick,
}: StrategicTimelineViewEnhancedProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'timeline' | 'swim'>('swim');

  // Use shared hook with caching - data is reused across tab switches!
  const { data, isLoading: loading, error } = useRoadmapData();

  // Extract data from hook (with fallbacks)
  const items = data?.items || [];
  const categories = data?.categories || [];
  const orgDemands = data?.orgDemands || {};

  const itemsByCategory = useMemo(() => {
    const categorized: Record<string, RoadmapItemData[]> = {};
    categories.forEach((cat) => {
      categorized[cat.name] = [];
    });

    items.forEach((item) => {
      const itemCategories = item.strategic_categories || [];
      if (itemCategories.length === 0) {
        if (!categorized['Uncategorized']) categorized['Uncategorized'] = [];
        categorized['Uncategorized'].push(item);
      } else {
        itemCategories.forEach((cat) => {
          if (!categorized[cat]) categorized[cat] = [];
          categorized[cat].push(item);
        });
      }
    });

    if (selectedCategories.length > 0) {
      const filtered: Record<string, RoadmapItemData[]> = {};
      selectedCategories.forEach((cat) => {
        filtered[cat] = categorized[cat] || [];
      });
      return filtered;
    }

    return categorized;
  }, [items, selectedCategories, categories]);

  const getCategoryColor = (categoryName: string) => {
    const cat = categories.find((c) => c.name === categoryName);
    const colorMap: Record<string, { from: string; to: string; bg: string; border: string }> = {
      purple: { from: '#a855f7', to: '#7c3aed', bg: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30' },
      blue: { from: '#3b82f6', to: '#2563eb', bg: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
      green: { from: '#10b981', to: '#059669', bg: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
      orange: { from: '#f97316', to: '#ea580c', bg: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
      pink: { from: '#ec4899', to: '#db2777', bg: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
      cyan: { from: '#06b6d4', to: '#0891b2', bg: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
    };
    return colorMap[cat?.color || 'purple'] || colorMap.purple;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto" />
          <p className="text-lg font-medium text-slate-700">Loading Strategic Timeline...</p>
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            <span className="text-sm text-slate-500">Preparing your roadmap</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-40 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-40 -right-40 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/2 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Hero Header */}
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-pink-600/10 rounded-3xl blur-2xl"></div>
        <div className="relative bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl shadow-lg">
                  <Rocket className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
                    Strategic Timeline
                  </h1>
                  <p className="text-slate-600 text-sm font-medium mt-1">
                    Global Product Roadmap • {items.length} Active Items
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="text-3xl font-bold text-green-700">{items.filter((i) => i.status === 'completed').length}</div>
                  <div className="text-xs font-semibold text-green-600 mt-1">Completed</div>
                </div>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="text-3xl font-bold text-blue-700">{items.filter((i) => i.status === 'in_progress').length}</div>
                  <div className="text-xs font-semibold text-blue-600 mt-1">In Progress</div>
                </div>
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                  <div className="text-3xl font-bold text-purple-700">{items.filter((i) => i.status === 'planned').length}</div>
                  <div className="text-xs font-semibold text-purple-600 mt-1">Planned</div>
                </div>
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                  <div className="text-3xl font-bold text-orange-700">{categories.length}</div>
                  <div className="text-xs font-semibold text-orange-600 mt-1">Categories</div>
                </div>
              </div>
            </div>

            {/* Category Filters */}
            <div className="ml-8">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Filter Categories</span>
              </div>
              <div className="flex flex-wrap gap-2 max-w-md">
                {categories.map((cat) => {
                  const isSelected = selectedCategories.length === 0 || selectedCategories.includes(cat.name);
                  const colors = getCategoryColor(cat.name);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        if (selectedCategories.includes(cat.name)) {
                          setSelectedCategories(selectedCategories.filter((c) => c !== cat.name));
                        } else {
                          setSelectedCategories([...selectedCategories, cat.name]);
                        }
                      }}
                      className={`
                        px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300
                        ${isSelected
                          ? `bg-gradient-to-r ${colors.bg} border-2 ${colors.border} shadow-md scale-105`
                          : 'bg-slate-100 border-2 border-transparent text-slate-400 hover:bg-slate-200'
                        }
                      `}
                      style={isSelected ? { color: colors.from } : {}}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Swimlanes */}
      <div className="space-y-6">
        {Object.entries(itemsByCategory).map(([categoryName, categoryItems]) => {
          if (categoryItems.length === 0) return null;

          const colors = getCategoryColor(categoryName);
          const categoryInfo = categories.find((c) => c.name === categoryName);
          const progress = categoryItems.length > 0
            ? Math.round(categoryItems.reduce((sum, item) => sum + (item.progress_percentage || 0), 0) / categoryItems.length)
            : 0;

          return (
            <div key={categoryName} className="group">
              <div className={`bg-gradient-to-br ${colors.bg} backdrop-blur-xl border-2 ${colors.border} rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500`}>
                {/* Category Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/80 rounded-xl shadow">
                      <Target className="w-6 h-6" style={{ color: colors.from }} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black" style={{ color: colors.from }}>
                        {categoryName}
                      </h2>
                      {categoryInfo?.description && (
                        <p className="text-sm text-slate-600 mt-1">{categoryInfo.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-3xl font-black" style={{ color: colors.from }}>{categoryItems.length}</div>
                      <div className="text-xs font-semibold text-slate-600">Items</div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black" style={{ color: colors.from }}>{progress}%</div>
                      <div className="text-xs font-semibold text-slate-600">Progress</div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-3 bg-white/60 rounded-full overflow-hidden mb-6 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r transition-all duration-1000 ease-out rounded-full shadow-lg"
                    style={{
                      width: `${progress}%`,
                      backgroundImage: `linear-gradient(to right, ${colors.from}, ${colors.to})`
                    }}
                  />
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categoryItems.map((item) => (
                    <TimelineItem
                      key={item.id}
                      {...item}
                      targetDate={item.target_date}
                      progressPercentage={item.progress_percentage || 0}
                      ownerName={item.owner_name}
                      orgCount={orgDemands[item.id]?.org_count || 0}
                      maxPriorityLevel={orgDemands[item.id]?.max_priority_level || 0}
                      linkTypes={orgDemands[item.id]?.link_types || []}
                      onClick={() => onItemClick?.(item.id)}
                      className="transform hover:scale-105 transition-transform duration-300"
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-20 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl border-2 border-dashed border-slate-300 rounded-3xl">
          <CalendarDays className="w-20 h-20 text-slate-300 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-slate-700 mb-2">No Roadmap Items Yet</h3>
          <p className="text-slate-500">Add roadmap items and assign them to strategic categories to see your timeline.</p>
        </div>
      )}

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
