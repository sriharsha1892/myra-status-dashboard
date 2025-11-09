'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import CategoryTrendsChart from '@/components/support/CategoryTrendsChart';
import CategoryTrendsTable from '@/components/support/CategoryTrendsTable';
import TrendInsightsPanel from '@/components/support/TrendInsightsPanel';
import { Period, calculateWeeklyStats, exportTrendsCSV, downloadCSV } from '@/lib/analytics/categoryTrends';
import Breadcrumbs from '@/components/Breadcrumbs';
import {
  TrendingUp,
  TrendingDown,
  Filter,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  BarChart3,
  Activity,
  Settings,
  Plus,
  Maximize2,
  Minimize2
} from 'lucide-react';

type Ticket = Database['public']['Tables']['tickets']['Row'];

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsPage() {
  const { user, loading: authLoading, signOut, role } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendsPeriod, setTrendsPeriod] = useState<Period>('30d');

  // Filter states
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAssignedTo, setSelectedAssignedTo] = useState<string>('all');
  const [selectedOrganization, setSelectedOrganization] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('all');

  // New UI state
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'analysis'>('overview');
  const [builderMode, setBuilderMode] = useState(false);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (role?.toLowerCase() === 'team' || role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'account_manager')) {
      fetchTickets();
    }
  }, [user, role]);

  useEffect(() => {
    applyFilters();
  }, [tickets, selectedStatus, selectedPriority, selectedCategory, selectedAssignedTo, selectedOrganization, dateRange]);

  const fetchTickets = async () => {
    const supabase = createClient();
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tickets').select('*');

      if (error) throw error;
      setTickets(data || []);
      setFilteredTickets(data || []);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tickets];

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((ticket) => ticket.status === selectedStatus);
    }

    // Priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter((ticket) => ticket.priority === selectedPriority);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((ticket) => ticket.category === selectedCategory);
    }

    // Assigned To filter (Account Manager)
    if (selectedAssignedTo !== 'all') {
      filtered = filtered.filter((ticket) => ticket.assigned_to === selectedAssignedTo);
    }

    // Organization filter
    if (selectedOrganization !== 'all') {
      filtered = filtered.filter((ticket) => ticket.organization === selectedOrganization);
    }

    // Date Range filter
    if (dateRange !== 'all') {
      const daysAgo = parseInt(dateRange);
      const cutoffDate = subDays(new Date(), daysAgo);
      filtered = filtered.filter((ticket) => {
        const ticketDate = new Date(ticket.created_at);
        return ticketDate >= cutoffDate;
      });
    }

    setFilteredTickets(filtered);
  };

  // Get unique values for filter dropdowns
  const uniqueStatuses = Array.from(new Set(tickets.map((t) => t.status))).sort();
  const uniquePriorities = ['Critical', 'High', 'Medium', 'Low'];
  const uniqueCategories = Array.from(new Set(tickets.map((t) => t.category))).sort();
  const uniqueAssignedTo = Array.from(
    new Set(tickets.map((t) => t.assigned_to).filter((a) => a !== null))
  ).sort();
  const uniqueOrganizations = Array.from(new Set(tickets.map((t) => t.organization))).sort();

  // Calculate stats by status
  const statusData = [
    { name: 'New', count: filteredTickets.filter((t) => t.status === 'New').length },
    { name: 'In Progress', count: filteredTickets.filter((t) => t.status === 'In Progress').length },
    { name: 'Waiting on User', count: filteredTickets.filter((t) => t.status === 'Waiting on User').length },
    { name: 'Resolved', count: filteredTickets.filter((t) => t.status === 'Resolved').length },
    { name: 'Closed', count: filteredTickets.filter((t) => t.status === 'Closed').length },
  ].filter((item) => item.count > 0);

  // Calculate stats by priority
  const priorityData = [
    { name: 'Critical', count: filteredTickets.filter((t) => t.priority === 'Critical').length },
    { name: 'High', count: filteredTickets.filter((t) => t.priority === 'High').length },
    { name: 'Medium', count: filteredTickets.filter((t) => t.priority === 'Medium').length },
    { name: 'Low', count: filteredTickets.filter((t) => t.priority === 'Low').length },
  ].filter((item) => item.count > 0);

  // Calculate stats by category
  const categoryData = Object.entries(
    filteredTickets.reduce((acc, ticket) => {
      acc[ticket.category] = (acc[ticket.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate tickets over time (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const count = filteredTickets.filter((t) => format(new Date(t.created_at), 'yyyy-MM-dd') === dateStr).length;
    return {
      date: format(date, 'MMM dd'),
      count,
    };
  });

  // Handle category click (filter by category)
  const handleCategoryClick = (category: string) => {
    console.log('Filter by category:', category);
    // Navigate to dashboard with category filter
    router.push(`/support/dashboard?category=${encodeURIComponent(category)}`);
  };

  // Handle export trends
  const handleExportTrends = () => {
    const stats = calculateWeeklyStats(filteredTickets);
    const csv = exportTrendsCSV(stats);
    downloadCSV(csv, `category-trends-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  // Calculate trend indicators for KPIs
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { percent: 0, direction: 'neutral' as const };
    const percent = ((current - previous) / previous) * 100;
    return {
      percent: Math.abs(percent),
      direction: percent > 0 ? ('up' as const) : percent < 0 ? ('down' as const) : ('neutral' as const)
    };
  };

  // Get previous period data for trends
  const getPreviousPeriodData = () => {
    const days = dateRange === 'all' ? 30 : parseInt(dateRange);
    const previousStart = subDays(new Date(), days * 2);
    const previousEnd = subDays(new Date(), days);

    return tickets.filter((ticket) => {
      const ticketDate = new Date(ticket.created_at);
      return ticketDate >= previousStart && ticketDate < previousEnd;
    });
  };

  const previousPeriodTickets = dateRange !== 'all' ? getPreviousPeriodData() : [];
  const totalTrend = calculateTrend(filteredTickets.length, previousPeriodTickets.length);
  const openTrend = calculateTrend(
    filteredTickets.filter((t) => !['Resolved', 'Closed'].includes(t.status)).length,
    previousPeriodTickets.filter((t) => !['Resolved', 'Closed'].includes(t.status)).length
  );
  const resolvedTrend = calculateTrend(
    filteredTickets.filter((t) => ['Resolved', 'Closed'].includes(t.status)).length,
    previousPeriodTickets.filter((t) => ['Resolved', 'Closed'].includes(t.status)).length
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || (role?.toLowerCase() !== 'team' && role?.toLowerCase() !== 'admin')) {
    return null;
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/10 min-h-screen">
      {/* Modern Header with Glassmorphism */}
      <header className="bg-white/70 backdrop-blur-2xl border-b border-white/20 shadow-lg sticky top-0 z-20">
        <div className="px-8 py-6">
          <Breadcrumbs items={[
            { label: 'Dashboard', href: '/support/dashboard' },
            { label: 'Reports & Analytics' }
          ]} />
          <div className="flex items-center justify-between mt-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h2>
              </div>
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                Comprehensive insights and performance metrics
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/support/reports/engagement')}
                className="group relative flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 text-slate-700 bg-white/80 hover:bg-white border border-slate-200 hover:shadow-md"
              >
                <Activity className="w-4 h-4" />
                <span>Engagement Waves</span>
              </button>
              <button
                onClick={() => setBuilderMode(!builderMode)}
                className={`group relative flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${ builderMode
                    ? 'text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/30'
                    : 'text-slate-700 bg-white/80 hover:bg-white border border-slate-200 hover:shadow-md'
                }`}
              >
                {builderMode && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
                <LayoutGrid className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{builderMode ? 'Exit Builder' : 'Customize'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <div className="p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="relative">
              <div className="w-20 h-20">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping opacity-20"></div>
                <div className="absolute inset-0 border-4 border-t-blue-600 border-r-purple-600 border-b-pink-600 border-l-blue-600 rounded-full animate-spin"></div>
              </div>
              <p className="mt-6 text-sm font-medium text-slate-600 text-center">Loading analytics...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Enhanced KPI Cards with Trends */}
            <div className="grid grid-cols-3 gap-6">
              {/* Total Tickets Card */}
              <div className="group relative overflow-hidden rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                <div className="relative backdrop-blur-xl bg-white/90 border border-white/30 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 shadow-lg shadow-blue-500/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"></div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Tickets</p>
                        <p className="text-4xl font-bold text-slate-900 tracking-tight">{filteredTickets.length}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    {dateRange !== 'all' && totalTrend.direction !== 'neutral' && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                        totalTrend.direction === 'up'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {totalTrend.direction === 'up' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className="text-sm font-semibold">{totalTrend.percent.toFixed(1)}% vs prev period</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Open Tickets Card */}
              <div className="group relative overflow-hidden rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 via-blue-400/20 to-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                <div className="relative backdrop-blur-xl bg-white/90 border border-white/30 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 shadow-lg shadow-purple-500/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"></div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Open Tickets</p>
                        <p className="text-4xl font-bold text-slate-900 tracking-tight">
                          {filteredTickets.filter((t) => !['Resolved', 'Closed'].includes(t.status)).length}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/40">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    {dateRange !== 'all' && openTrend.direction !== 'neutral' && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                        openTrend.direction === 'down'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {openTrend.direction === 'down' ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <TrendingUp className="w-4 h-4" />
                        )}
                        <span className="text-sm font-semibold">{openTrend.percent.toFixed(1)}% vs prev period</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resolved Tickets Card */}
              <div className="group relative overflow-hidden rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-green-400/20 to-teal-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                <div className="relative backdrop-blur-xl bg-white/90 border border-white/30 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 shadow-lg shadow-green-500/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"></div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Resolved</p>
                        <p className="text-4xl font-bold text-slate-900 tracking-tight">
                          {filteredTickets.filter((t) => ['Resolved', 'Closed'].includes(t.status)).length}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/40">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    {dateRange !== 'all' && resolvedTrend.direction !== 'neutral' && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                        resolvedTrend.direction === 'up'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {resolvedTrend.direction === 'up' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className="text-sm font-semibold">{resolvedTrend.percent.toFixed(1)}% vs prev period</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsible Filters Panel */}
            <div className="relative overflow-hidden rounded-2xl">
              <div className="relative backdrop-blur-xl bg-white/90 border border-white/30 rounded-2xl shadow-lg">
                {/* Filter Header */}
                <button
                  onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <Filter className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base font-semibold text-slate-900">Filters</h3>
                      <p className="text-xs text-slate-500">
                        {filteredTickets.length} of {tickets.length} tickets
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {(selectedStatus !== 'all' || selectedPriority !== 'all' || selectedCategory !== 'all' || selectedAssignedTo !== 'all' || selectedOrganization !== 'all' || dateRange !== 'all') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStatus('all');
                          setSelectedPriority('all');
                          setSelectedCategory('all');
                          setSelectedAssignedTo('all');
                          setSelectedOrganization('all');
                          setDateRange('all');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                    {filtersCollapsed ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Filter Content */}
                {!filtersCollapsed && (
                  <div className="border-t border-slate-200 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Row 1: Date, Status, Priority */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Date Range</label>
                        <select
                          value={dateRange}
                          onChange={(e) => setDateRange(e.target.value as any)}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-slate-300 transition-colors text-sm"
                        >
                          <option value="all">All Time</option>
                          <option value="7">Last 7 Days</option>
                          <option value="30">Last 30 Days</option>
                          <option value="90">Last 90 Days</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Status</label>
                        <select
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-slate-300 transition-colors text-sm"
                        >
                          <option value="all">All Statuses</option>
                          {uniqueStatuses.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Priority</label>
                        <select
                          value={selectedPriority}
                          onChange={(e) => setSelectedPriority(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-slate-300 transition-colors text-sm"
                        >
                          <option value="all">All Priorities</option>
                          {uniquePriorities.map((priority) => (
                            <option key={priority} value={priority}>{priority}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Row 2: Category, Manager, Organization */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Category</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-slate-300 transition-colors text-sm"
                        >
                          <option value="all">All Categories</option>
                          {uniqueCategories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Account Manager</label>
                        <select
                          value={selectedAssignedTo}
                          onChange={(e) => setSelectedAssignedTo(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-slate-300 transition-colors text-sm"
                        >
                          <option value="all">All Managers</option>
                          {uniqueAssignedTo.map((person) => (
                            <option key={person} value={person}>{person}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Organization</label>
                        <select
                          value={selectedOrganization}
                          onChange={(e) => setSelectedOrganization(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-slate-300 transition-colors text-sm"
                        >
                          <option value="all">All Organizations</option>
                          {uniqueOrganizations.map((org) => (
                            <option key={org} value={org}>{org}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-2 gap-6">
                {/* Tickets by Status */}
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Tickets by Status</h3>
                  </div>
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
                      No data available
                    </div>
                  )}
                </div>

                {/* Tickets by Priority */}
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Tickets by Priority</h3>
                  </div>
                  {priorityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={priorityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                        <defs>
                          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.9} />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
                      No data available
                    </div>
                  )}
                </div>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-2 gap-6">
                {/* Top Categories */}
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Top Categories</h3>
                  </div>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categoryData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="url(#greenGradient)" radius={[0, 8, 8, 0]} />
                        <defs>
                          <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
                      No data available
                    </div>
                  )}
                </div>

                {/* Tickets Over Time */}
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Tickets Created (Last 7 Days)</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={last7Days}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="url(#purpleGradient)" radius={[8, 8, 0, 0]} />
                      <defs>
                        <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#a855f7" stopOpacity={0.9} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Deep Dive Analytics Section */}
              <div className="space-y-6 mt-8">
                {/* Section Header */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Deep Dive Analytics</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Advanced insights and trends over time</p>
                  </div>
                </div>

                {/* Insights Panel */}
                <TrendInsightsPanel tickets={filteredTickets} period={trendsPeriod} />

                {/* Trends Chart */}
                <CategoryTrendsChart
                  tickets={filteredTickets}
                  period={trendsPeriod}
                  onPeriodChange={setTrendsPeriod}
                  onCategoryClick={handleCategoryClick}
                />

                {/* Trends Table */}
                <CategoryTrendsTable tickets={filteredTickets} onCategoryClick={handleCategoryClick} />
              </div>
            </>
          )}
        </div>
      </main>
  );
}
