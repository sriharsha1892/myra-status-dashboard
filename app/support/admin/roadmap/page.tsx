'use client';

/**
 * WORLD-CLASS PRODUCT ROADMAP
 * CEO-Grade UI/UX inspired by Linear & Asana
 *
 * Features:
 * - Executive insights dashboard
 * - Clean, minimalist design
 * - Smart grouping & filtering
 * - Beautiful data visualization
 * - Smooth micro-interactions
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format, isAfter, isBefore, addDays, differenceInDays, parseISO } from 'date-fns';
import {
  LayoutGrid,
  List,
  BarChart3,
  Plus,
  Search,
  X,
  Calendar,
  User,
  Flag,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  TrendingUp,
  Upload,
  Filter,
  ChevronDown,
  ChevronRight,
  Target,
  Zap,
  AlertCircle,
  ArrowUp,
  ArrowRight,
} from 'lucide-react';

// Types
type RoadmapItem = {
  id: string;
  title: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'suggested';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  proposer?: string;
  goal?: string;
  area?: string;
  rationale?: string;
  version_planned?: string;
  assigned_to?: string;
  org_id?: string;
};

type ViewMode = 'list' | 'board' | 'timeline';

// Linear-inspired color palette
const COLORS = {
  status: {
    suggested: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
    planned: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
    in_progress: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    completed: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    cancelled: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
  },
  priority: {
    critical: { text: 'text-red-600', bg: 'bg-red-50', icon: 'text-red-500' },
    high: { text: 'text-orange-600', bg: 'bg-orange-50', icon: 'text-orange-500' },
    medium: { text: 'text-yellow-600', bg: 'bg-yellow-50', icon: 'text-yellow-500' },
    low: { text: 'text-slate-500', bg: 'bg-slate-50', icon: 'text-slate-400' },
  },
};

export default function WorldClassRoadmapPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();

  // State
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<'none' | 'goal' | 'area' | 'status'>('goal');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const supabase = createClient();

  // Fetch data
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
      return;
    }
    if (user && !authLoading) {
      fetchRoadmapItems();
    }
  }, [user, authLoading, router]);

  const fetchRoadmapItems = async () => {
    try {
      const { data, error } = await supabase
        .from('org_product_roadmap')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoadmapItems(data || []);

      // Expand all groups by default
      const allGroups = new Set<string>();
      (data || []).forEach(item => {
        if (item.goal) allGroups.add(item.goal);
        if (item.area) allGroups.add(item.area);
      });
      setExpandedGroups(allGroups);
    } catch (error: any) {
      console.error('Error fetching roadmap:', error);
      toast.error('Failed to load roadmap');
    } finally {
      setLoading(false);
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return roadmapItems.filter(item => {
      // Search
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matchesSearch =
          item.title?.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search) ||
          item.area?.toLowerCase().includes(search) ||
          item.goal?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Filters
      if (selectedGoal !== 'all' && item.goal !== selectedGoal) return false;
      if (selectedArea !== 'all' && item.area !== selectedArea) return false;
      if (selectedStatus.length > 0 && !selectedStatus.includes(item.status)) return false;

      return true;
    });
  }, [roadmapItems, searchQuery, selectedGoal, selectedArea, selectedStatus]);

  // Analytics
  const analytics = useMemo(() => {
    const total = filteredItems.length;
    const completed = filteredItems.filter(i => i.status === 'completed').length;
    const inProgress = filteredItems.filter(i => i.status === 'in_progress').length;
    const planned = filteredItems.filter(i => i.status === 'planned').length;
    const suggested = filteredItems.filter(i => i.status === 'suggested').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Timeline health
    const withDates = filteredItems.filter(i => i.target_date && i.status !== 'completed');
    const overdue = withDates.filter(i => isAfter(new Date(), parseISO(i.target_date!))).length;
    const dueSoon = withDates.filter(i => {
      const days = differenceInDays(parseISO(i.target_date!), new Date());
      return days >= 0 && days <= 14;
    }).length;

    return {
      total,
      completed,
      inProgress,
      planned,
      suggested,
      completionRate,
      overdue,
      dueSoon,
    };
  }, [filteredItems]);

  // Grouping
  const groupedItems = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Items': filteredItems };
    }

    const groups: Record<string, RoadmapItem[]> = {};

    filteredItems.forEach(item => {
      let key = 'Uncategorized';

      if (groupBy === 'goal' && item.goal) key = item.goal;
      else if (groupBy === 'area' && item.area) key = item.area;
      else if (groupBy === 'status') {
        key = item.status === 'in_progress' ? 'In Progress' :
              item.status === 'completed' ? 'Completed' :
              item.status === 'planned' ? 'Planned' :
              item.status === 'suggested' ? 'Suggested' : 'Cancelled';
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return groups;
  }, [filteredItems, groupBy]);

  // Unique values for filters
  const uniqueGoals = useMemo(() =>
    Array.from(new Set(roadmapItems.map(i => i.goal).filter(Boolean))).sort(),
    [roadmapItems]
  );

  const uniqueAreas = useMemo(() =>
    Array.from(new Set(roadmapItems.map(i => i.area).filter(Boolean))).sort(),
    [roadmapItems]
  );

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm text-slate-600 font-medium">Loading roadmap...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* WORLD-CLASS HEADER - Linear-inspired */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-8 py-5">
          {/* Title & Actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product Roadmap</h1>
                <p className="text-sm text-slate-500 mt-0.5">Plan, track, and ship game-changing features</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/support/admin/roadmap-import')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-all"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                New Item
                <kbd className="ml-1 px-1.5 py-0.5 text-xs font-mono bg-blue-700 rounded">⌘K</kbd>
              </button>
            </div>
          </div>

          {/* Executive Insights Bar */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {/* Total Progress */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Progress</span>
                <Target className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{analytics.completionRate}%</span>
                <span className="text-sm text-slate-600">of {analytics.total} items</span>
              </div>
              <div className="mt-3 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${analytics.completionRate}%` }}
                />
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">In Progress</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{analytics.inProgress}</span>
                <span className="text-sm text-slate-600">active</span>
              </div>
              <p className="text-xs text-amber-700 mt-2 font-medium">
                {analytics.planned} planned • {analytics.suggested} ideas
              </p>
            </div>

            {/* Timeline Health */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Timeline</span>
                <Clock className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{analytics.dueSoon}</span>
                <span className="text-sm text-slate-600">due soon</span>
              </div>
              {analytics.overdue > 0 && (
                <p className="text-xs text-red-600 mt-2 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {analytics.overdue} overdue
                </p>
              )}
            </div>

            {/* Completed */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Completed</span>
                <CheckCircle2 className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{analytics.completed}</span>
                <span className="text-sm text-slate-600">shipped</span>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                Keep shipping! 🚀
              </p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search roadmap..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Goal Filter */}
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Goals</option>
              {uniqueGoals.map(goal => (
                <option key={goal} value={goal}>{goal}</option>
              ))}
            </select>

            {/* Area Filter */}
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Areas</option>
              {uniqueAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>

            {/* Group By */}
            <div className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg bg-white">
              <LayoutGrid className="w-4 h-4 text-slate-500" />
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="text-sm focus:outline-none bg-transparent"
              >
                <option value="none">No grouping</option>
                <option value="goal">Group by Goal</option>
                <option value="area">Group by Area</option>
                <option value="status">Group by Status</option>
              </select>
            </div>

            {/* View Mode */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                  viewMode === 'board'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-[1600px] mx-auto px-8 py-6">
        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([groupName, items]) => (
              <div key={groupName} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Group Header */}
                {groupBy !== 'none' && (
                  <button
                    onClick={() => toggleGroup(groupName)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedGroups.has(groupName) ? (
                        <ChevronDown className="w-5 h-5 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      )}
                      <h3 className="text-base font-semibold text-slate-900">{groupName}</h3>
                      <span className="px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-200 rounded-full">
                        {items.length}
                      </span>
                    </div>
                  </button>
                )}

                {/* Items */}
                {(groupBy === 'none' || expandedGroups.has(groupName)) && (
                  <div className="divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start gap-4">
                          {/* Priority Indicator */}
                          <div className={`mt-1 w-1 h-1 rounded-full ${COLORS.priority[item.priority].icon}`} />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {item.title}
                                </h4>
                                {item.description && (
                                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}

                                {/* Metadata */}
                                <div className="flex items-center gap-3 mt-2">
                                  {/* Status */}
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md ${COLORS.status[item.status].bg} ${COLORS.status[item.status].text}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${COLORS.status[item.status].dot}`} />
                                    {item.status === 'in_progress' ? 'In Progress' :
                                     item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                  </span>

                                  {/* Priority */}
                                  {item.priority !== 'low' && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md ${COLORS.priority[item.priority].bg} ${COLORS.priority[item.priority].text}`}>
                                      <Flag className="w-3 h-3" />
                                      {item.priority}
                                    </span>
                                  )}

                                  {/* Version */}
                                  {item.version_planned && (
                                    <span className="text-xs text-slate-500 font-medium">
                                      {item.version_planned}
                                    </span>
                                  )}

                                  {/* Assignees */}
                                  {item.assigned_to && (
                                    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                                      <User className="w-3 h-3" />
                                      {item.assigned_to}
                                    </span>
                                  )}

                                  {/* Target Date */}
                                  {item.target_date && (
                                    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                                      <Calendar className="w-3 h-3" />
                                      {format(parseISO(item.target_date), 'MMM d, yyyy')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Quick Actions (visible on hover) */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="text-center py-16">
                <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No items found</h3>
                <p className="text-sm text-slate-600">Try adjusting your filters or search query</p>
              </div>
            )}
          </div>
        )}

        {/* Board/Timeline views - Coming soon placeholders */}
        {viewMode === 'board' && (
          <div className="text-center py-16">
            <LayoutGrid className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Board View</h3>
            <p className="text-sm text-slate-600">Kanban board coming soon</p>
          </div>
        )}

        {viewMode === 'timeline' && (
          <div className="text-center py-16">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Analytics View</h3>
            <p className="text-sm text-slate-600">Detailed analytics coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
