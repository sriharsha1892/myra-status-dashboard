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
import EnhancedRoadmapCard from '@/components/roadmap/EnhancedRoadmapCard';
import TimeLoggingModal from '@/components/roadmap/TimeLoggingModal';

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
  // Time tracking fields
  estimated_hours?: number;
  actual_hours?: number;
  progress_percentage?: number;
  last_activity_at?: string;
  days_since_activity?: number;
};

type ViewMode = 'list' | 'board' | 'timeline';

// Premium status pill system
const COLORS = {
  status: {
    suggested: { bg: 'bg-[#eff6ff]', border: 'border-[#dbeafe]', text: 'text-[#2563eb]', dot: 'bg-[#3b82f6]' },
    planned: { bg: 'bg-[#eff6ff]', border: 'border-[#dbeafe]', text: 'text-[#2563eb]', dot: 'bg-[#3b82f6]' },
    in_progress: { bg: 'bg-[#fef3c7]', border: 'border-[#fed7aa]', text: 'text-[#d97706]', dot: 'bg-[#f59e0b]' },
    completed: { bg: 'bg-[#f0fdf4]', border: 'border-[#bbf7d0]', text: 'text-[#16a34a]', dot: 'bg-[#10b981]' },
    cancelled: { bg: 'bg-[#f8fafc]', border: 'border-[#e2e8f0]', text: 'text-[#64748b]', dot: 'bg-[#94a3b8]' },
  },
  priority: {
    critical: { text: 'text-[#dc2626]', bg: 'bg-[#fee2e2]', icon: 'text-[#ef4444]', border: 'border-[#fecaca]' },
    high: { text: 'text-[#d97706]', bg: 'bg-[#fef3c7]', icon: 'text-[#f59e0b]', border: 'border-[#fed7aa]' },
    medium: { text: 'text-[#ca8a04]', bg: 'bg-[#fef9c3]', icon: 'text-[#eab308]', border: 'border-[#fde68a]' },
    low: { text: 'text-[#64748b]', bg: 'bg-[#f1f5f9]', icon: 'text-[#94a3b8]', border: 'border-[#e2e8f0]' },
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

  // Time logging modal state
  const [timeLogModalOpen, setTimeLogModalOpen] = useState(false);
  const [selectedItemForTimeLog, setSelectedItemForTimeLog] = useState<RoadmapItem | null>(null);

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
      // Use productivity_metrics view for time tracking data
      const { data, error } = await supabase
        .from('roadmap_productivity_metrics')
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
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" strokeWidth={1.5} />
          </div>
          <span className="text-sm text-slate-600 font-medium tracking-[-0.01em]">Loading roadmap...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Premium Header - Clean & Purposeful */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          {/* Title & Actions */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <TrendingUp className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-[22px] leading-[28px] font-semibold text-slate-900 tracking-[-0.02em]">Product Roadmap</h1>
                <p className="text-sm text-slate-600 mt-1 tracking-[-0.01em]">Plan, track, and ship with confidence</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/support/admin/roadmap-import')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all duration-150"
              >
                <Upload className="w-4 h-4" strokeWidth={1.5} />
                Import
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-150"
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                New Item
                <kbd className="ml-1 px-1.5 py-0.5 text-xs font-mono bg-blue-700 bg-opacity-50 rounded">⌘K</kbd>
              </button>
            </div>
          </div>

          {/* Executive Insights Bar - Floating Glass Cards */}
          <div className="grid grid-cols-4 gap-8 mb-8">
            {/* Total Progress - with circular progress */}
            <div className="relative bg-white rounded-xl p-6 border border-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-medium text-slate-600 uppercase tracking-wide" style={{letterSpacing: '-0.01em'}}>Progress</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex items-center gap-6">
                {/* Circular Progress Ring */}
                <div className="relative w-16 h-16">
                  <svg className="transform -rotate-90 w-16 h-16">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="#e5e7eb"
                      strokeWidth="2"
                      fill="none"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - analytics.completionRate / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-semibold text-slate-900" style={{letterSpacing: '-0.02em'}}>{analytics.completionRate}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-[32px] leading-[40px] font-semibold text-slate-900 tracking-[-0.02em]">{analytics.completed}</div>
                  <div className="text-sm font-medium text-slate-500 tracking-[-0.01em]">of {analytics.total} shipped</div>
                </div>
              </div>
            </div>

            {/* In Progress */}
            <div className="relative bg-white rounded-xl p-6 border border-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-medium text-slate-600 uppercase tracking-wide" style={{letterSpacing: '-0.01em'}}>In Progress</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-[32px] leading-[40px] font-semibold text-slate-900 tracking-[-0.02em] mb-2">{analytics.inProgress}</div>
              <div className="text-sm font-medium text-slate-500 tracking-[-0.01em]">active items</div>
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-600 tracking-[-0.01em]">{analytics.planned} planned • {analytics.suggested} ideas</div>
              </div>
            </div>

            {/* Timeline Health */}
            <div className="relative bg-white rounded-xl p-6 border border-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-medium text-slate-600 uppercase tracking-wide" style={{letterSpacing: '-0.01em'}}>Timeline</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-[32px] leading-[40px] font-semibold text-slate-900 tracking-[-0.02em] mb-2">{analytics.dueSoon}</div>
              <div className="text-sm font-medium text-slate-500 tracking-[-0.01em]">due within 14 days</div>
              {analytics.overdue > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                    <AlertCircle className="w-3 h-3" strokeWidth={2} />
                    {analytics.overdue} overdue
                  </div>
                </div>
              )}
            </div>

            {/* Completed */}
            <div className="relative bg-white rounded-xl p-6 border border-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-medium text-slate-600 uppercase tracking-wide" style={{letterSpacing: '-0.01em'}}>Velocity</span>
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-[32px] leading-[40px] font-semibold text-slate-900 tracking-[-0.02em] mb-2">{analytics.completed}</div>
              <div className="text-sm font-medium text-slate-500 tracking-[-0.01em]">shipped this cycle</div>
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-xs text-emerald-600 font-medium tracking-[-0.01em]">On track</div>
              </div>
            </div>
          </div>

          {/* Search & Filters - Refined */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 max-w-lg relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search roadmap..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white tracking-[-0.01em] transition-all duration-150"
              />
            </div>

            {/* Goal Filter */}
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white tracking-[-0.01em] transition-all duration-150"
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
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white tracking-[-0.01em] transition-all duration-150"
            >
              <option value="all">All Areas</option>
              {uniqueAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>

            {/* Group By */}
            <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-white">
              <LayoutGrid className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="text-sm focus:outline-none bg-transparent tracking-[-0.01em]"
              >
                <option value="none">No grouping</option>
                <option value="goal">Group by Goal</option>
                <option value="area">Group by Area</option>
                <option value="status">Group by Status</option>
              </select>
            </div>

            {/* View Mode - Refined Segmented Control */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
                  viewMode === 'board'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
                  viewMode === 'timeline'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA - 32px spacing system */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* List View - Organic Crystal Formations */}
        {viewMode === 'list' && (
          <div className="space-y-10">
            {Object.entries(groupedItems).map(([groupName, items]) => (
              <div key={groupName} className="relative">
                {/* Group Header - Organic Flow */}
                {groupBy !== 'none' && (
                  <button
                    onClick={() => toggleGroup(groupName)}
                    className="w-full flex items-center gap-3 mb-6 group"
                  >
                    {expandedGroups.has(groupName) ? (
                      <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-all duration-200" strokeWidth={1.5} />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-all duration-200" strokeWidth={1.5} />
                    )}
                    <div className="flex-1 flex items-center gap-3 py-3 px-5 bg-gradient-to-r from-slate-50/80 to-transparent rounded-2xl backdrop-blur-sm">
                      <h3 className="text-[15px] leading-[22px] font-medium text-[#111827] tracking-[-0.01em]">{groupName}</h3>
                      <span className="px-2.5 py-0.5 text-xs font-medium text-slate-600 bg-white/60 backdrop-blur-sm rounded-full shadow-sm">
                        {items.length}
                      </span>
                    </div>
                  </button>
                )}

                {/* Items - Enhanced Cards with Time Tracking */}
                {(groupBy === 'none' || expandedGroups.has(groupName)) && (
                  <div className="space-y-4 relative">
                    {/* Subtle connecting line */}
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent" />

                    {items.map((item) => (
                      <div key={item.id} className="relative ml-6">
                        {/* Node connector */}
                        <div className="absolute left-[-24px] top-1/2 w-6 h-px bg-gradient-to-r from-slate-200 to-transparent" />
                        <EnhancedRoadmapCard
                          item={item}
                          onLogTime={() => {
                            setSelectedItemForTimeLog(item);
                            setTimeLogModalOpen(true);
                          }}
                          onClick={() => {
                            // TODO: Navigate to detail view or open detail panel
                            console.log('Navigate to detail view for:', item.id);
                          }}
                        />
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

        {/* KANBAN BOARD VIEW - Fully Functional */}
        {viewMode === 'board' && (
          <div className="grid grid-cols-5 gap-4">
            {/* Suggested Column */}
            <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <h3 className="font-semibold text-slate-900">Suggested</h3>
                </div>
                <span className="text-sm font-bold text-purple-600">
                  {filteredItems.filter(i => i.status === 'suggested').length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredItems.filter(i => i.status === 'suggested').map(item => (
                  <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm border border-purple-100 hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-medium text-slate-900 line-clamp-2 group-hover:text-purple-600 transition-colors">
                        {item.title}
                      </h4>
                      {item.priority !== 'low' && (
                        <Flag className={`w-3 h-3 flex-shrink-0 ${COLORS.priority[item.priority].icon}`} />
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.version_planned && (
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                          {item.version_planned}
                        </span>
                      )}
                      {item.assigned_to && (
                        <span className="text-xs text-slate-500">{item.assigned_to.split(',')[0]}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Planned Column */}
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <h3 className="font-semibold text-slate-900">Planned</h3>
                </div>
                <span className="text-sm font-bold text-blue-600">
                  {filteredItems.filter(i => i.status === 'planned').length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredItems.filter(i => i.status === 'planned').map(item => (
                  <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm border border-blue-100 hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-medium text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h4>
                      {item.priority !== 'low' && (
                        <Flag className={`w-3 h-3 flex-shrink-0 ${COLORS.priority[item.priority].icon}`} />
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.version_planned && (
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                          {item.version_planned}
                        </span>
                      )}
                      {item.target_date && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(item.target_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="font-semibold text-slate-900">In Progress</h3>
                </div>
                <span className="text-sm font-bold text-amber-600">
                  {filteredItems.filter(i => i.status === 'in_progress').length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredItems.filter(i => i.status === 'in_progress').map(item => (
                  <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm border border-amber-100 hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-medium text-slate-900 line-clamp-2 group-hover:text-amber-600 transition-colors">
                        {item.title}
                      </h4>
                      {item.priority !== 'low' && (
                        <Flag className={`w-3 h-3 flex-shrink-0 ${COLORS.priority[item.priority].icon}`} />
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.assigned_to && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {item.assigned_to.split(',')[0]}
                        </span>
                      )}
                      {item.target_date && (
                        <span className="text-xs text-slate-500">{format(parseISO(item.target_date), 'MMM d')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Completed Column */}
            <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-semibold text-slate-900">Completed</h3>
                </div>
                <span className="text-sm font-bold text-emerald-600">
                  {filteredItems.filter(i => i.status === 'completed').length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredItems.filter(i => i.status === 'completed').map(item => (
                  <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm border border-emerald-100 hover:shadow-md transition-shadow cursor-pointer group opacity-80 hover:opacity-100">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-medium text-slate-900 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                        {item.title}
                      </h4>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    </div>
                    {item.version_planned && (
                      <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                        {item.version_planned} Shipped
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cancelled Column */}
            <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-600">Cancelled</h3>
                </div>
                <span className="text-sm font-bold text-slate-500">
                  {filteredItems.filter(i => i.status === 'cancelled').length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredItems.filter(i => i.status === 'cancelled').map(item => (
                  <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group opacity-60 hover:opacity-80">
                    <h4 className="text-sm font-medium text-slate-600 line-clamp-2 mb-1">
                      {item.title}
                    </h4>
                    {item.rationale && (
                      <p className="text-xs text-slate-500 line-clamp-1">{item.rationale}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS VIEW - Fully Functional */}
        {viewMode === 'timeline' && (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
                <div className="text-3xl font-bold mb-1">{analytics.planned}</div>
                <div className="text-sm text-blue-100">Planned Items</div>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white">
                <div className="text-3xl font-bold mb-1">{analytics.inProgress}</div>
                <div className="text-sm text-amber-100">In Progress</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
                <div className="text-3xl font-bold mb-1">{analytics.completed}</div>
                <div className="text-sm text-emerald-100">Completed</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
                <div className="text-3xl font-bold mb-1">{analytics.suggested}</div>
                <div className="text-sm text-purple-100">Ideas</div>
              </div>
            </div>

            {/* Breakdown by Goal */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Items by Goal</h3>
              <div className="space-y-3">
                {uniqueGoals.map(goal => {
                  const count = filteredItems.filter(i => i.goal === goal).length;
                  const percentage = (count / filteredItems.length) * 100;
                  return (
                    <div key={goal}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{goal}</span>
                        <span className="text-sm text-slate-600">{count} items ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Breakdown by Area */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Items by Area</h3>
              <div className="space-y-3">
                {uniqueAreas.map(area => {
                  const count = filteredItems.filter(i => i.area === area).length;
                  const percentage = (count / filteredItems.length) * 100;
                  return (
                    <div key={area}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{area}</span>
                        <span className="text-sm text-slate-600">{count} items ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Time Logging Modal */}
      {timeLogModalOpen && selectedItemForTimeLog && (
        <TimeLoggingModal
          itemId={selectedItemForTimeLog.id}
          itemTitle={selectedItemForTimeLog.title}
          currentUserId={user?.id}
          onClose={() => {
            setTimeLogModalOpen(false);
            setSelectedItemForTimeLog(null);
          }}
          onSuccess={() => {
            fetchRoadmapItems(); // Refresh data to show updated hours
          }}
        />
      )}
    </div>
  );
}
