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
  Plus,
  Search,
  X,
  Calendar,
  User,
  Flag,
  Clock,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Upload,
  Filter,
  Target,
  Zap,
  AlertCircle,
  ArrowRight,
  Table,
} from 'lucide-react';
import EnhancedRoadmapCard from '@/components/roadmap/EnhancedRoadmapCard';
import AgentKanbanBoard from '@/components/roadmap/AgentKanbanBoard';
import Breadcrumbs from '@/components/Breadcrumbs';

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
  // Agent and environment fields
  agent_name?: string;
  agent_url?: string;
  environment?: 'staging' | 'production' | null;
  // Time tracking fields
  estimated_hours?: number;
  actual_hours?: number;
  progress_percentage?: number;
  last_activity_at?: string;
  days_since_activity?: number;
};

type ViewMode = 'version' | 'owner' | 'table';
type DensityPreset = 'cozy' | 'default' | 'compact';

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

  // Feature flag for Agent Kanban Board
  const AGENT_BOARD_ENABLED = process.env.NEXT_PUBLIC_AGENT_BOARD === 'on';

  // State
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table'); // Default to table view (full disclosure)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [density, setDensity] = useState<DensityPreset>('default');
  const [groupBy, setGroupBy] = useState<'none' | 'goal' | 'area' | 'status'>('none');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Inline editing state for table view
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Detail drawer state
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'activity' | 'links'>('overview');

  // Command palette state
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');

  // Users state for assignment dropdown
  const [users, setUsers] = useState<Array<{ id: string; email: string; name: string; role: string; status: string }>>([]);

  const supabase = createClient();

  // Fetch data
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
      return;
    }
    if (user && !authLoading) {
      fetchRoadmapItems();
      fetchUsers();
    }
  }, [user, authLoading, router]);

  // Command palette keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      // Escape to close
      if (e.key === 'Escape' && showCommandPalette) {
        setShowCommandPalette(false);
        setCommandSearch('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette]);

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

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Don't show toast error - this is not critical
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
          item.goal?.toLowerCase().includes(search) ||
          item.version_planned?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Filters
      if (selectedGoal !== 'all' && item.goal !== selectedGoal) return false;
      if (selectedArea !== 'all' && item.area !== selectedArea) return false;
      if (selectedStatus.length > 0 && !selectedStatus.includes(item.status)) return false;
      if (selectedVersion !== 'all' && item.version_planned !== selectedVersion) return false;
      if (selectedOwner !== 'all' && item.assigned_to !== selectedOwner) return false;

      return true;
    });
  }, [roadmapItems, searchQuery, selectedGoal, selectedArea, selectedStatus, selectedVersion, selectedOwner]);

  // Analytics
  const analytics = useMemo(() => {
    const total = filteredItems.length;
    // Shipped = completed AND environment is 'production'
    const shipped = filteredItems.filter(i => i.status === 'completed' && i.environment === 'production').length;
    const completed = filteredItems.filter(i => i.status === 'completed').length;
    const inProgress = filteredItems.filter(i => i.status === 'in_progress').length;
    const planned = filteredItems.filter(i => i.status === 'planned').length;
    const suggested = filteredItems.filter(i => i.status === 'suggested').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0; // Use 'completed' for completion rate

    // Timeline health
    const withDates = filteredItems.filter(i => i.target_date && i.status !== 'completed');
    const overdue = withDates.filter(i => isAfter(new Date(), parseISO(i.target_date!))).length;
    const dueSoon = withDates.filter(i => {
      const days = differenceInDays(parseISO(i.target_date!), new Date());
      return days >= 0 && days <= 14;
    }).length;

    return {
      total,
      shipped, // NEW: Only production items
      completed, // All completed (staging + production)
      inProgress,
      planned,
      suggested,
      completionRate, // Now based on shipped, not completed
      overdue,
      dueSoon,
    };
  }, [filteredItems]);

  // Grouping - Show all items, group properly or show as "Other"
  const groupedItems = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Items': filteredItems };
    }

    const groups: Record<string, RoadmapItem[]> = {};

    filteredItems.forEach(item => {
      let key = 'Other'; // Default fallback instead of hiding

      if (groupBy === 'goal') {
        key = item.goal || 'Other';
      } else if (groupBy === 'area') {
        key = item.area || 'Other';
      } else if (groupBy === 'status') {
        // Status always has a value
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

  // Unique values for filters (all derived from API data, no hardcoding)
  const uniqueGoals = useMemo(() =>
    Array.from(new Set(roadmapItems.map(i => i.goal).filter(Boolean))).sort(),
    [roadmapItems]
  );

  const uniqueAreas = useMemo(() =>
    Array.from(new Set(roadmapItems.map(i => i.area).filter(Boolean))).sort(),
    [roadmapItems]
  );


  const uniqueVersions = useMemo(() =>
    Array.from(new Set(roadmapItems.map(i => i.version_planned).filter(Boolean))).sort().reverse(), // Most recent first
    [roadmapItems]
  );

  const uniqueOwners = useMemo(() =>
    Array.from(new Set(roadmapItems.map(i => i.assigned_to).filter(Boolean))).sort(),
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

  // Inline editing functions for table view
  const handleStartEdit = (id: string, field: string, currentValue: any) => {
    setEditingCell({ id, field });
    setEditValue(currentValue || '');
  };

  const handleSaveEdit = async (id: string, field: string) => {
    try {
      const updates: any = {};

      // Convert value based on field type
      if (field === 'estimated_hours' || field === 'actual_hours' || field === 'progress_percentage') {
        updates[field] = editValue ? parseFloat(editValue) : null;
      } else if (field === 'target_date') {
        updates[field] = editValue ? new Date(editValue).toISOString() : null;
      } else {
        updates[field] = editValue || null;
      }

      // Update in database
      const { error } = await supabase
        .from('roadmap')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setRoadmapItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, ...updates } : item
        )
      );

      toast.success('Updated successfully');
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update');
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  if (authLoading || loading) {
    const loadingQuotes = [
      { text: "The best part is no part.", author: "Elon Musk" },
      { text: "Specific knowledge is found by pursuing your genuine curiosity.", author: "Naval Ravikant" },
      { text: "Real artists ship.", author: "Steve Jobs" },
      { text: "Competition is for losers.", author: "Peter Thiel" },
      { text: "Make something people want.", author: "Steve Jobs" },
      { text: "Play long-term games with long-term people.", author: "Naval Ravikant" },
    ];
    const randomQuote = loadingQuotes[Math.floor(Math.random() * loadingQuotes.length)];

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" strokeWidth={1.5} />
          </div>
          <span className="text-sm text-slate-600 font-medium tracking-[-0.01em]">Loading roadmap...</span>
          <div className="mt-2 px-6 py-3 bg-white rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-900 font-medium mb-1">"{randomQuote.text}"</p>
            <p className="text-[10px] text-slate-500">— {randomQuote.author}</p>
          </div>
        </div>
      </div>
    );
  }

  // CSS variables for density control
  const densityVars = {
    cozy: {
      '--card-padding': '1.5rem',
      '--card-gap': '1rem',
      '--text-base': '0.9375rem',
      '--text-sm': '0.875rem',
      '--text-xs': '0.8125rem',
      '--spacing': '1.5rem',
    },
    default: {
      '--card-padding': '1rem',
      '--card-gap': '0.75rem',
      '--text-base': '0.875rem',
      '--text-sm': '0.8125rem',
      '--text-xs': '0.75rem',
      '--spacing': '1rem',
    },
    compact: {
      '--card-padding': '0.75rem',
      '--card-gap': '0.5rem',
      '--text-base': '0.8125rem',
      '--text-sm': '0.75rem',
      '--text-xs': '0.6875rem',
      '--spacing': '0.75rem',
    },
  };

  return (
    <div className="min-h-screen bg-[#fafafa]" style={densityVars[density] as React.CSSProperties}>
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-8 py-4">
          <Breadcrumbs items={[
            { label: 'Dashboard', href: '/support/dashboard' },
            { label: 'Admin', href: '/support/admin/roadmap' },
            { label: 'Product Roadmap' }
          ]} />
        </div>
      </div>

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
                  <div className="text-sm font-medium text-slate-500 tracking-[-0.01em]">of {analytics.total} items</div>
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

          {/* Top Utility Bar - Version-Centric Sprint Controls */}
          <div className="space-y-3">
            {/* Row 1: Search + Primary Filters */}
            <div className="flex items-center gap-3">
              {/* Global Search (fuzzy, debounced) */}
              <div className="flex-1 max-w-lg relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Search roadmap... (/, title, version)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white tracking-[-0.01em] transition-all duration-150"
                />
              </div>

              {/* Version Selector */}
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white tracking-[-0.01em] transition-all duration-150 min-w-[120px]"
              >
                <option value="all">All Versions</option>
                {uniqueVersions.map(version => (
                  <option key={version} value={version}>{version}</option>
                ))}
              </select>

              {/* Density Slider - Presets */}
              <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-white">
                <span className="text-xs text-slate-600 font-medium">Density:</span>
                <div className="flex gap-1">
                  {(['cozy', 'default', 'compact'] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setDensity(preset)}
                      className={`px-2 py-0.5 text-xs font-medium rounded transition-all duration-150 ${
                        density === preset
                          ? 'bg-blue-500 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* New Item Button with Cmd+K hint */}
              <button
                onClick={() => setShowCommandPalette(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-150"
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                New
                <kbd className="ml-1 px-1.5 py-0.5 text-xs font-mono bg-blue-700 bg-opacity-50 rounded">⌘K</kbd>
              </button>
            </div>

            {/* Row 2: Composable Filter Chips + View Mode */}
            <div className="flex items-center gap-3">
              {/* Filter Chips */}
              <div className="flex items-center gap-2 flex-1">
                <Filter className="w-4 h-4 text-slate-400" strokeWidth={1.5} />

                {/* Goal Filter */}
                <select
                  value={selectedGoal}
                  onChange={(e) => setSelectedGoal(e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white tracking-[-0.01em] transition-all duration-150"
                >
                  <option value="all">Goal: All</option>
                  {uniqueGoals.map(goal => (
                    <option key={goal} value={goal}>Goal: {goal}</option>
                  ))}
                </select>

                {/* Area Filter */}
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white tracking-[-0.01em] transition-all duration-150"
                >
                  <option value="all">Area: All</option>
                  {uniqueAreas.map(area => (
                    <option key={area} value={area}>Area: {area}</option>
                  ))}
                </select>

                {/* Owner Filter */}
                <select
                  value={selectedOwner}
                  onChange={(e) => setSelectedOwner(e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white tracking-[-0.01em] transition-all duration-150"
                >
                  <option value="all">Owner: All</option>
                  {uniqueOwners.map(owner => (
                    <option key={owner} value={owner}>
                      {users.find(u => u.email === owner)?.name || owner}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Selector - Version/Owner/Table */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  onClick={() => setViewMode('version')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                    viewMode === 'version'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Version Board (grouped by version)"
                >
                  Version
                </button>
                <button
                  onClick={() => setViewMode('owner')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                    viewMode === 'owner'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Owner Board (workload view)"
                >
                  Owner
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                    viewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Table view"
                >
                  <Table className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AGENT BOARD (Feature Flag Controlled) */}
      {AGENT_BOARD_ENABLED ? (
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          <AgentKanbanBoard
            items={roadmapItems}
            onRefresh={fetchRoadmapItems}
            users={users}
          />
        </div>
      ) : (
        <>
          {/* CONTENT AREA - Professional spacing */}
          <div className="max-w-[1600px] mx-auto px-8 py-8">
            {/* TABLE VIEW - Excel-like Inline Editing */}
            {viewMode === 'table' && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Goal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Assigned To</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Target Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <p className="text-sm text-slate-500">No items to display</p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        {/* Title - Click anywhere on cell to edit */}
                        <td
                          className="px-4 py-3 cursor-pointer group"
                          onClick={() => editingCell?.id !== item.id && handleStartEdit(item.id, 'title', item.title)}
                        >
                          {editingCell?.id === item.id && editingCell?.field === 'title' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveEdit(item.id, 'title')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id, 'title');
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <div className="text-sm text-slate-900 font-medium group-hover:text-blue-600 transition-colors flex items-center gap-2">
                              <span>{item.title}</span>
                              <svg className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </div>
                          )}
                        </td>

                        {/* Status - Click anywhere on cell to edit */}
                        <td
                          className="px-4 py-3 cursor-pointer group"
                          onClick={() => editingCell?.id !== item.id && handleStartEdit(item.id, 'status', item.status)}
                        >
                          {editingCell?.id === item.id && editingCell?.field === 'status' ? (
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveEdit(item.id, 'status')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id, 'status');
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="suggested">Suggested</option>
                              <option value="planned">Planned</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          ) : (
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded ${COLORS.status[item.status].bg} ${COLORS.status[item.status].text} group-hover:opacity-80 transition-opacity`}>
                              <span>{item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                              <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          )}
                        </td>

                        {/* Priority - Select dropdown */}
                        <td className="px-4 py-3">
                          {editingCell?.id === item.id && editingCell?.field === 'priority' ? (
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveEdit(item.id, 'priority')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id, 'priority');
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(item.id, 'priority', item.priority)}
                              className={`w-full text-left px-2 py-1 text-xs font-medium rounded ${COLORS.priority[item.priority].bg} ${COLORS.priority[item.priority].text} hover:opacity-80 transition-opacity`}
                            >
                              {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                            </button>
                          )}
                        </td>

                        {/* Version Planned - Text input */}
                        <td className="px-4 py-3">
                          {editingCell?.id === item.id && editingCell?.field === 'version_planned' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveEdit(item.id, 'version_planned')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id, 'version_planned');
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                              placeholder="e.g., v1.2.0"
                              className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <button
                              onClick={() => handleStartEdit(item.id, 'version_planned', item.version_planned)}
                              className="w-full text-left text-xs text-slate-600 hover:text-blue-600 transition-colors"
                            >
                              {item.version_planned || '-'}
                            </button>
                          )}
                        </td>

                        {/* Environment - Select dropdown */}
                        <td className="px-4 py-3">
                          {editingCell?.id === item.id && editingCell?.field === 'environment' ? (
                            <select
                              value={editValue || ''}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveEdit(item.id, 'environment')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id, 'environment');
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Not Set</option>
                              <option value="staging">Staging</option>
                              <option value="production">Production</option>
                            </select>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(item.id, 'environment', item.environment)}
                              className={`w-full text-left px-2 py-1 text-xs font-medium rounded ${
                                item.environment === 'production'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : item.environment === 'staging'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'text-slate-500'
                              } hover:opacity-80 transition-opacity`}
                            >
                              {item.environment ? item.environment.charAt(0).toUpperCase() + item.environment.slice(1) : '-'}
                            </button>
                          )}
                        </td>

                        {/* Agent Name - Text input */}
                        <td className="px-4 py-3">
                          {editingCell?.id === item.id && editingCell?.field === 'agent_name' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveEdit(item.id, 'agent_name')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id, 'agent_name');
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                              placeholder="Agent name"
                              className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <button
                              onClick={() => handleStartEdit(item.id, 'agent_name', item.agent_name)}
                              className="w-full text-left text-xs text-slate-600 hover:text-blue-600 transition-colors"
                            >
                              {item.agent_name || '-'}
                            </button>
                          )}
                        </td>

                        {/* Agent URL - Text input with link */}
                        <td className="px-4 py-3">
                          {editingCell?.id === item.id && editingCell?.field === 'agent_url' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveEdit(item.id, 'agent_url')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id, 'agent_url');
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                              placeholder="https://..."
                              className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            item.agent_url ? (
                              <a
                                href={item.agent_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Link
                              </a>
                            ) : (
                              <button
                                onClick={() => handleStartEdit(item.id, 'agent_url', item.agent_url)}
                                className="w-full text-left text-xs text-slate-500 hover:text-blue-600 transition-colors"
                              >
                                -
                              </button>
                            )
                          )}
                        </td>

                        {/* Goal - Text input */}
                        <td className="px-4 py-3">
                          {editingCell?.id === item.id && editingCell?.field === 'goal' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveEdit(item.id, 'goal')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id, 'goal');
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <button
                              onClick={() => handleStartEdit(item.id, 'goal', item.goal)}
                              className="w-full text-left text-xs text-slate-600 hover:text-blue-600 transition-colors"
                            >
                              {item.goal || '-'}
                            </button>
                          )}
                        </td>

                        {/* Area - Text input */}
                        <td className="px-4 py-3">
                          {editingCell?.id === item.id && editingCell?.field === 'area' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveEdit(item.id, 'area')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id, 'area');
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <button
                              onClick={() => handleStartEdit(item.id, 'area', item.area)}
                              className="w-full text-left text-xs text-slate-600 hover:text-blue-600 transition-colors"
                            >
                              {item.area || '-'}
                            </button>
                          )}
                        </td>

                        {/* Assigned To - User dropdown */}
                        <td className="px-4 py-3">
                          {editingCell?.id === item.id && editingCell?.field === 'assigned_to' ? (
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveEdit(item.id, 'assigned_to')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id, 'assigned_to');
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="">Unassigned</option>
                              {users.map((user) => (
                                <option key={user.id} value={user.email}>
                                  {user.name} ({user.role})
                                  {user.status === 'Pending' ? ' - Pending' : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(item.id, 'assigned_to', item.assigned_to)}
                              className="w-full text-left text-xs text-slate-600 hover:text-blue-600 transition-colors"
                            >
                              {item.assigned_to ? (
                                // Try to find matching user for better display
                                (() => {
                                  const matchedUser = users.find(u => u.email === item.assigned_to);
                                  return matchedUser ? `${matchedUser.name} (${matchedUser.role})` : item.assigned_to;
                                })()
                              ) : '-'}
                            </button>
                          )}
                        </td>

                        {/* Target Date - Date input */}
                        <td className="px-4 py-3">
                          {editingCell?.id === item.id && editingCell?.field === 'target_date' ? (
                            <input
                              type="date"
                              value={editValue ? format(new Date(editValue), 'yyyy-MM-dd') : ''}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveEdit(item.id, 'target_date')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id, 'target_date');
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <button
                              onClick={() => handleStartEdit(item.id, 'target_date', item.target_date)}
                              className="w-full text-left text-xs text-slate-600 hover:text-blue-600 transition-colors"
                            >
                              {item.target_date ? format(new Date(item.target_date), 'MMM d, yyyy') : '-'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Helper text */}
            <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
              <p className="text-xs text-slate-600">
                💡 <span className="font-medium">Click any cell to edit</span> · Press Enter to save · Press Escape to cancel
              </p>
            </div>
          </div>
        )}

        {/* VERSION BOARD VIEW - Grouped by Version with Progress Rings */}
        {viewMode === 'version' && (
          <div className="space-y-6">
            {uniqueVersions.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-sm text-slate-600 mb-4">No versions defined yet. Add version_planned to roadmap items.</p>
                <p className="text-xs text-slate-500">Version Board groups items by version (e.g., "V2.0", "V2.1")</p>
              </div>
            ) : (
              uniqueVersions.map(version => {
                const versionItems = filteredItems.filter(item => item.version_planned === version);
                const completedCount = versionItems.filter(i => i.status === 'completed').length;
                const inProgressCount = versionItems.filter(i => i.status === 'in_progress').length;
                const totalCount = versionItems.length;
                const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                // Progress ring SVG values
                const radius = 40;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (completionPercent / 100) * circumference;

                return (
                  <div key={version} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    {/* Version Header with Progress Ring */}
                    <div className="flex items-start gap-6 mb-6">
                      {/* Progress Ring */}
                      <div className="relative w-24 h-24 flex-shrink-0">
                        <svg className="transform -rotate-90 w-24 h-24">
                          <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            stroke="#e5e7eb"
                            strokeWidth="6"
                            fill="none"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            stroke="#6366f1"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-xl font-bold text-slate-900">{completionPercent}%</div>
                            <div className="text-[10px] text-slate-500">complete</div>
                          </div>
                        </div>
                      </div>

                      {/* Version Info */}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">{version}</h3>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-600">
                            <span className="font-medium text-emerald-600">{completedCount}</span> done
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600">
                            <span className="font-medium text-amber-600">{inProgressCount}</span> in progress
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600">
                            <span className="font-medium">{totalCount}</span> total
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Items Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {versionItems.map(item => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="group p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md hover:border-blue-300 transition-all duration-150 cursor-pointer"
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <h4 className="text-sm font-medium text-slate-900 line-clamp-2 flex-1 group-hover:text-blue-600 transition-colors">
                              {item.title}
                            </h4>
                            {item.priority === 'critical' && (
                              <Flag className="w-3 h-3 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className={`px-2 py-0.5 rounded-md font-medium ${COLORS.status[item.status].bg} ${COLORS.status[item.status].text}`}>
                              {item.status === 'in_progress' ? 'In Progress' :
                               item.status === 'completed' ? 'Done' :
                               item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* OWNER BOARD VIEW - Workload Visualization */}
        {viewMode === 'owner' && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left: Owner List with Load Meters */}
            <div className="col-span-3 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Team Bandwidth</h3>
              {uniqueOwners.length === 0 ? (
                <p className="text-xs text-slate-500">No assigned owners yet</p>
              ) : (
                uniqueOwners.map(owner => {
                  const ownerItems = filteredItems.filter(item => item.assigned_to === owner);
                  const activeCount = ownerItems.filter(i => i.status === 'in_progress' || i.status === 'planned').length;
                  const totalCount = ownerItems.length;
                  const loadPercent = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
                  const userName = users.find(u => u.email === owner)?.name || owner.split('@')[0];

                  return (
                    <div
                      key={owner}
                      className="p-3 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-all duration-150"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">{userName}</div>
                          <div className="text-xs text-slate-500">{activeCount} active</div>
                        </div>
                      </div>
                      {/* Load meter */}
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            loadPercent > 80 ? 'bg-red-500' :
                            loadPercent > 50 ? 'bg-amber-500' :
                            'bg-emerald-500'
                          }`}
                          style={{ width: `${loadPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* OLD STATUS BOARD VIEW - Kept for reference, can be removed later */}
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

      {/* RIGHT DETAIL DRAWER - 480px, Non-Modal */}
      {selectedItem && (
        <>
          {/* Backdrop overlay (semi-transparent, allows interaction) */}
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 transition-opacity duration-200"
            onClick={() => setSelectedItem(null)}
          />

          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-[480px] bg-white border-l border-slate-200 shadow-2xl z-50 overflow-hidden flex flex-col transform transition-transform duration-300 ease-out">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900 mb-1 line-clamp-2">
                    {selectedItem.title}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${COLORS.status[selectedItem.status].bg} ${COLORS.status[selectedItem.status].text}`}>
                      {selectedItem.status === 'in_progress' ? 'In Progress' :
                       selectedItem.status === 'completed' ? 'Done' :
                       selectedItem.status.charAt(0).toUpperCase() + selectedItem.status.slice(1)}
                    </span>
                    {selectedItem.priority !== 'low' && (
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${COLORS.priority[selectedItem.priority].bg} ${COLORS.priority[selectedItem.priority].text}`}>
                        {selectedItem.priority.charAt(0).toUpperCase() + selectedItem.priority.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 mt-4 border-b border-slate-200 -mb-px">
                {(['overview', 'activity', 'links'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDrawerTab(tab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      drawerTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* Overview Tab */}
              {drawerTab === 'overview' && (
                <div className="space-y-6">
                  {/* Description */}
                  {selectedItem.description && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 block">
                        Description
                      </label>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedItem.description}
                      </p>
                    </div>
                  )}

                  {/* Key Details Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Version */}
                    {selectedItem.version_planned && (
                      <div>
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                          Version
                        </label>
                        <div className="text-sm text-slate-900">{selectedItem.version_planned}</div>
                      </div>
                    )}

                    {/* Goal */}
                    {selectedItem.goal && (
                      <div>
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                          Goal
                        </label>
                        <div className="text-sm text-slate-900">{selectedItem.goal}</div>
                      </div>
                    )}

                    {/* Area */}
                    {selectedItem.area && (
                      <div>
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                          Area
                        </label>
                        <div className="text-sm text-slate-900">{selectedItem.area}</div>
                      </div>
                    )}

                    {/* Assigned To */}
                    {selectedItem.assigned_to && (
                      <div>
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                          Assigned To
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                            {(users.find(u => u.email === selectedItem.assigned_to)?.name || selectedItem.assigned_to).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-slate-900">
                            {users.find(u => u.email === selectedItem.assigned_to)?.name || selectedItem.assigned_to}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Target Date */}
                    {selectedItem.target_date && (
                      <div>
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                          Target Date
                        </label>
                        <div className="text-sm text-slate-900">
                          {format(parseISO(selectedItem.target_date), 'MMM d, yyyy')}
                        </div>
                      </div>
                    )}

                    {/* Environment */}
                    {selectedItem.environment && (
                      <div>
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                          Environment
                        </label>
                        <span className={`inline-block text-xs px-2 py-1 rounded-md font-medium ${
                          selectedItem.environment === 'production'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {selectedItem.environment.charAt(0).toUpperCase() + selectedItem.environment.slice(1)}
                        </span>
                      </div>
                    )}

                    {/* Estimated Hours */}
                    {selectedItem.estimated_hours && (
                      <div>
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                          Estimated Hours
                        </label>
                        <div className="text-sm text-slate-900">{selectedItem.estimated_hours}h</div>
                      </div>
                    )}

                    {/* Actual Hours */}
                    {selectedItem.actual_hours && (
                      <div>
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                          Actual Hours
                        </label>
                        <div className="text-sm text-slate-900">{selectedItem.actual_hours}h</div>
                      </div>
                    )}
                  </div>

                  {/* Agent Info */}
                  {(selectedItem.agent_name || selectedItem.agent_url) && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <label className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2 block">
                        Agent
                      </label>
                      <div className="text-sm text-blue-900 font-medium mb-1">{selectedItem.agent_name}</div>
                      {selectedItem.agent_url && (
                        <a
                          href={selectedItem.agent_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                        >
                          View Agent
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Rationale */}
                  {selectedItem.rationale && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 block">
                        Rationale
                      </label>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedItem.rationale}
                      </p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                      <div>
                        <span className="font-medium">Created:</span>{' '}
                        {format(parseISO(selectedItem.created_at), 'MMM d, yyyy')}
                      </div>
                      <div>
                        <span className="font-medium">Updated:</span>{' '}
                        {format(parseISO(selectedItem.updated_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {drawerTab === 'activity' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Activity history coming soon...</p>
                  {selectedItem.last_activity_at && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-xs font-medium text-slate-700 mb-1">Last Activity</div>
                      <div className="text-sm text-slate-900">
                        {format(parseISO(selectedItem.last_activity_at), 'MMM d, yyyy h:mm a')}
                      </div>
                      {selectedItem.days_since_activity !== undefined && (
                        <div className="text-xs text-slate-500 mt-1">
                          {selectedItem.days_since_activity} days ago
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Links Tab */}
              {drawerTab === 'links' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Related links coming soon...</p>
                  {selectedItem.agent_url && (
                    <a
                      href={selectedItem.agent_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                          <ArrowRight className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">Agent URL</div>
                          <div className="text-xs text-slate-500">{selectedItem.agent_name || 'View agent'}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* COMMAND PALETTE (Cmd+K) */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Search Input */}
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={commandSearch}
                  onChange={(e) => setCommandSearch(e.target.value)}
                  placeholder="Type a command or search..."
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 text-base border-none focus:outline-none focus:ring-0 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Commands List */}
            <div className="max-h-[400px] overflow-y-auto p-2">
              {/* View Actions */}
              <div className="mb-4">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Views</div>
                <button
                  onClick={() => { setViewMode('version'); setShowCommandPalette(false); setCommandSearch(''); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left group"
                >
                  <Target className="w-5 h-5 text-slate-400 group-hover:text-purple-600" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">Version Board</div>
                    <div className="text-xs text-slate-500">View progress by version</div>
                  </div>
                  {viewMode === 'version' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                </button>
                <button
                  onClick={() => { setViewMode('owner'); setShowCommandPalette(false); setCommandSearch(''); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left group"
                >
                  <User className="w-5 h-5 text-slate-400 group-hover:text-green-600" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">Owner Board</div>
                    <div className="text-xs text-slate-500">View team workload</div>
                  </div>
                  {viewMode === 'owner' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                </button>
                <button
                  onClick={() => { setViewMode('table'); setShowCommandPalette(false); setCommandSearch(''); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left group"
                >
                  <Table className="w-5 h-5 text-slate-400 group-hover:text-amber-600" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">Table View</div>
                    <div className="text-xs text-slate-500">Spreadsheet-like editing</div>
                  </div>
                  {viewMode === 'table' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                </button>
              </div>

              {/* Density Actions */}
              <div className="mb-4">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Density</div>
                <button
                  onClick={() => { setDensity('cozy'); setShowCommandPalette(false); setCommandSearch(''); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left group"
                >
                  <div className="text-sm font-medium text-slate-900">Cozy</div>
                  {density === 'cozy' && <CheckCircle2 className="w-4 h-4 text-blue-600 ml-auto" />}
                </button>
                <button
                  onClick={() => { setDensity('default'); setShowCommandPalette(false); setCommandSearch(''); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left group"
                >
                  <div className="text-sm font-medium text-slate-900">Default</div>
                  {density === 'default' && <CheckCircle2 className="w-4 h-4 text-blue-600 ml-auto" />}
                </button>
                <button
                  onClick={() => { setDensity('compact'); setShowCommandPalette(false); setCommandSearch(''); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left group"
                >
                  <div className="text-sm font-medium text-slate-900">Compact</div>
                  {density === 'compact' && <CheckCircle2 className="w-4 h-4 text-blue-600 ml-auto" />}
                </button>
              </div>

              {/* Quick Filters */}
              <div className="mb-4">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Filters</div>
                <button
                  onClick={() => { setSelectedGoal('all'); setSelectedArea('all'); setSelectedStatus([]); setSelectedVersion('all'); setSelectedOwner('all'); setShowCommandPalette(false); setCommandSearch(''); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left group"
                >
                  <X className="w-5 h-5 text-slate-400 group-hover:text-red-600" />
                  <div className="text-sm font-medium text-slate-900">Clear all filters</div>
                </button>
              </div>

              {/* Navigation */}
              <div>
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Navigate</div>
                <button
                  onClick={() => { router.push('/support/admin/roadmap-import'); setShowCommandPalette(false); setCommandSearch(''); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left group"
                >
                  <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                  <div className="text-sm font-medium text-slate-900">Import Roadmap</div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span>↑↓ Navigate</span>
                <span>⏎ Select</span>
                <span>Esc Close</span>
              </div>
              <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono">⌘K</kbd>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
