'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format, isAfter, isBefore, addDays } from 'date-fns';
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
  Trash2,
  Edit3,
  GripVertical,
  TrendingUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type RoadmapItem = {
  id: string;
  title: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'suggested';
  priority: 'low' | 'medium' | 'high' | 'critical';
  source_type: 'admin' | 'feature_request' | 'account_manager';
  source_org_id?: string;
  source_org_name?: string;
  owner?: string;
  owner_id?: string;
  due_date?: string;
  version?: string;
  category?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
};

type ViewMode = 'kanban' | 'list' | 'analytics';

const STATUS_COLORS = {
  suggested: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
  planned: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  in_progress: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
  cancelled: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
};

const PRIORITY_COLORS = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', icon: 'text-red-600' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'text-orange-600' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'text-yellow-600' },
  low: { bg: 'bg-slate-100', text: 'text-slate-600', icon: 'text-slate-500' },
};

const CHART_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#94a3b8'];

export default function AdminRoadmapPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    status: (role?.toLowerCase() === 'account manager' ? 'suggested' : 'planned') as const,
    priority: 'medium' as const,
    owner: '',
    owner_id: '',
    due_date: '',
    version: '',
    category: '',
    notes: '',
  });

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const allowedRoles = ['admin', 'account manager'];
    if (user && role && allowedRoles.includes(role.toLowerCase())) {
      fetchRoadmapItems();
      fetchUsers();
    }
  }, [user, role]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Keyboard shortcut: Cmd+K to open add modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowAddModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchRoadmapItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('org_product_roadmap')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoadmapItems(data || []);
    } catch (error: any) {
      console.error('Error fetching roadmap items:', error);
      toast.error('Failed to load roadmap items');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!newItem.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('org_product_roadmap')
          .update(newItem)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Roadmap item updated successfully');
      } else {
        // Create new item
        const { error } = await supabase
          .from('org_product_roadmap')
          .insert([{
            ...newItem,
            source_type: role?.toLowerCase() === 'account manager' ? 'account_manager' : 'admin',
          }]);

        if (error) throw error;
        toast.success('Roadmap item added successfully');
      }

      setShowAddModal(false);
      setEditingItem(null);
      resetForm();
      fetchRoadmapItems();
    } catch (error: any) {
      console.error('Error saving roadmap item:', error);
      toast.error('Failed to save roadmap item');
    }
  };

  const resetForm = () => {
    setNewItem({
      title: '',
      description: '',
      status: (role?.toLowerCase() === 'account manager' ? 'suggested' : 'planned') as any,
      priority: 'medium',
      owner: '',
      owner_id: '',
      due_date: '',
      version: '',
      category: '',
      notes: '',
    });
  };

  const handleEditItem = (item: RoadmapItem) => {
    setEditingItem(item);
    setNewItem({
      title: item.title,
      description: item.description || '',
      status: item.status,
      priority: item.priority,
      owner: item.owner || '',
      owner_id: item.owner_id || '',
      due_date: item.due_date || '',
      version: item.version || '',
      category: item.category || '',
      notes: item.notes || '',
    });
    setShowAddModal(true);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this roadmap item?')) return;

    try {
      const { error } = await supabase
        .from('org_product_roadmap')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Roadmap item deleted successfully');
      fetchRoadmapItems();
    } catch (error: any) {
      console.error('Error deleting roadmap item:', error);
      toast.error('Failed to delete roadmap item');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('org_product_roadmap')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setRoadmapItems(roadmapItems.map(item =>
        item.id === id ? { ...item, status: newStatus as any } : item
      ));

      toast.success('Status updated');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedItem) {
      await handleStatusChange(draggedItem, newStatus);
      setDraggedItem(null);
    }
  };

  const filteredItems = roadmapItems.filter((item) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.owner?.toLowerCase().includes(query) ||
        item.source_org_name?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.version?.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    // Version filter
    if (selectedVersion !== 'all' && item.version !== selectedVersion) {
      return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }

    return true;
  });

  // Get unique versions and categories
  const uniqueVersions = Array.from(new Set(roadmapItems.map(item => item.version).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(roadmapItems.map(item => item.category).filter(Boolean)));

  // Analytics calculations
  const statusCounts = {
    suggested: filteredItems.filter(i => i.status === 'suggested').length,
    planned: filteredItems.filter(i => i.status === 'planned').length,
    in_progress: filteredItems.filter(i => i.status === 'in_progress').length,
    completed: filteredItems.filter(i => i.status === 'completed').length,
    cancelled: filteredItems.filter(i => i.status === 'cancelled').length,
  };

  const priorityCounts = {
    critical: filteredItems.filter(i => i.priority === 'critical').length,
    high: filteredItems.filter(i => i.priority === 'high').length,
    medium: filteredItems.filter(i => i.priority === 'medium').length,
    low: filteredItems.filter(i => i.priority === 'low').length,
  };

  const chartData = [
    { name: 'Suggested', value: statusCounts.suggested, fill: '#a855f7' },
    { name: 'Planned', value: statusCounts.planned, fill: '#3b82f6' },
    { name: 'In Progress', value: statusCounts.in_progress, fill: '#f59e0b' },
    { name: 'Completed', value: statusCounts.completed, fill: '#10b981' },
    { name: 'Cancelled', value: statusCounts.cancelled, fill: '#94a3b8' },
  ];

  const priorityChartData = [
    { name: 'Critical', value: priorityCounts.critical },
    { name: 'High', value: priorityCounts.high },
    { name: 'Medium', value: priorityCounts.medium },
    { name: 'Low', value: priorityCounts.low },
  ];

  const upcomingDeadlines = filteredItems
    .filter(item => item.due_date && item.status !== 'completed' && item.status !== 'cancelled')
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm text-slate-600">Loading roadmap...</span>
        </div>
      </div>
    );
  }

  const allowedRoles = ['admin', 'account manager'];
  if (!user || !role || !allowedRoles.includes(role.toLowerCase())) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-600">You must be an admin or account manager to view this page.</p>
        </div>
      </div>
    );
  }

  const getItemsByStatus = (status: string) => {
    return filteredItems.filter(item => item.status === status);
  };

  return (
    <main className="flex-1 flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Header - Enhanced Design */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-blue-700 px-8 py-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              Product Roadmap
            </h1>
            <p className="text-base text-blue-100 mt-2 font-medium">Plan, track, and ship game-changing features</p>
          </div>
          <button
            onClick={() => {
              setEditingItem(null);
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 h-11 px-5 bg-white hover:bg-blue-50 text-blue-600 text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            New Item
            <span className="ml-1 px-2 py-0.5 bg-blue-100 rounded-md text-xs font-mono">⌘K</span>
          </button>
        </div>

        {/* Controls - Enhanced Design */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input
              type="text"
              placeholder="Search roadmap items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-sm text-white placeholder:text-white/60 focus:outline-none focus:bg-white/30 focus:border-white/50 focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>

          {/* Version Filter */}
          {uniqueVersions.length > 0 && (
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="h-11 px-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-sm text-white focus:outline-none focus:bg-white/30 focus:border-white/50 focus:ring-2 focus:ring-white/20 transition-all"
            >
              <option value="all" className="text-slate-900">All Versions</option>
              {uniqueVersions.map((version) => (
                <option key={version} value={version} className="text-slate-900">
                  {version}
                </option>
              ))}
            </select>
          )}

          {/* Category Filter */}
          {uniqueCategories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-11 px-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-sm text-white focus:outline-none focus:bg-white/30 focus:border-white/50 focus:ring-2 focus:ring-white/20 transition-all"
            >
              <option value="all" className="text-slate-900">All Categories</option>
              {uniqueCategories.map((category) => (
                <option key={category} value={category} className="text-slate-900">
                  {category}
                </option>
              ))}
            </select>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-xl p-1 border border-white/30">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-lg transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-lg transition-all ${
                viewMode === 'analytics'
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5 px-5 py-2.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
            {statusCounts.suggested > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm"></div>
                <span className="text-sm font-semibold text-white">{statusCounts.suggested} Suggested</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-300 shadow-sm"></div>
              <span className="text-sm font-semibold text-white">{statusCounts.planned} Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-300 shadow-sm"></div>
              <span className="text-sm font-semibold text-white">{statusCounts.in_progress} In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-300 shadow-sm"></div>
              <span className="text-sm font-semibold text-white">{statusCounts.completed} Completed</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-5 gap-5 h-full">
            {/* Kanban Columns - Enhanced Design */}
            {(['suggested', 'planned', 'in_progress', 'completed', 'cancelled'] as const).map((status) => {
              const items = getItemsByStatus(status);
              const colors = STATUS_COLORS[status];

              return (
                <div
                  key={status}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                  className="flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden min-h-0"
                >
                  {/* Column Header - Gradient Design */}
                  <div className={`px-5 py-4 border-b-2 ${colors.border} ${colors.bg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colors.dot} shadow-sm animate-pulse`}></div>
                        <h3 className={`text-sm font-bold ${colors.text} uppercase tracking-wide`}>
                          {status.replace('_', ' ')}
                        </h3>
                      </div>
                      <span className={`text-xs font-bold ${colors.text} bg-white/60 px-2.5 py-1 rounded-full shadow-sm`}>
                        {items.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-center">
                        <Circle className="w-10 h-10 text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-400">No items</p>
                      </div>
                    ) : (
                      items.map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => handleDragStart(item.id)}
                          className={`group bg-white rounded-xl border-2 ${colors.border} p-4 cursor-move hover:shadow-xl transition-all duration-200 hover:scale-[1.02] ${
                            draggedItem === item.id ? 'opacity-50 scale-95' : 'opacity-100'
                          }`}
                        >
                          {/* Priority Badge & Actions */}
                          <div className="flex items-start justify-between mb-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm ${PRIORITY_COLORS[item.priority].bg} ${PRIORITY_COLORS[item.priority].text}`}>
                              <Flag className={`w-3.5 h-3.5 ${PRIORITY_COLORS[item.priority].icon}`} />
                              {item.priority}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                onClick={() => handleEditItem(item)}
                                className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit3 className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>

                          {/* Title & Description */}
                          <h4 className="text-sm font-bold text-slate-900 mb-2 line-clamp-2 leading-snug">
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-slate-600 mb-3 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}

                          {/* Category & Version Tags */}
                          {(item.category || item.version) && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {item.category && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded">
                                  {item.category}
                                </span>
                              )}
                              {item.version && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
                                  {item.version}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
                            {item.owner && (
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                <span className="font-medium">{item.owner}</span>
                              </div>
                            )}
                            {item.due_date && (
                              <div className={`flex items-center gap-1.5 ${
                                isAfter(new Date(), new Date(item.due_date)) && status !== 'completed'
                                  ? 'text-red-600 font-bold'
                                  : 'font-medium'
                              }`}>
                                <Calendar className="w-3.5 h-3.5" />
                                {format(new Date(item.due_date), 'MMM d')}
                              </div>
                            )}
                          </div>

                          {/* Source Badge */}
                          {item.source_type === 'feature_request' && item.source_org_name && (
                            <div className="mt-3 pt-2 border-t border-slate-100">
                              <span className="text-xs text-slate-500 font-medium">
                                From: {item.source_org_name}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-700 px-6 py-3">Item</th>
                  <th className="text-left text-xs font-semibold text-slate-700 px-6 py-3">Priority</th>
                  <th className="text-left text-xs font-semibold text-slate-700 px-6 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-700 px-6 py-3">Owner</th>
                  <th className="text-left text-xs font-semibold text-slate-700 px-6 py-3">Due Date</th>
                  <th className="text-left text-xs font-semibold text-slate-700 px-6 py-3">Source</th>
                  <th className="text-right text-xs font-semibold text-slate-700 px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                      No roadmap items found
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{item.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${PRIORITY_COLORS[item.priority].bg} ${PRIORITY_COLORS[item.priority].text}`}>
                          <Flag className={`w-3 h-3 ${PRIORITY_COLORS[item.priority].icon}`} />
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className={`px-2 py-1 rounded-md text-xs font-medium border-0 cursor-pointer ${STATUS_COLORS[item.status].bg} ${STATUS_COLORS[item.status].text}`}
                        >
                          <option value="suggested">Suggested</option>
                          <option value="planned">Planned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-900">{item.owner || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm ${
                          item.due_date && isAfter(new Date(), new Date(item.due_date)) && item.status !== 'completed'
                            ? 'text-red-600 font-medium'
                            : 'text-slate-900'
                        }`}>
                          {item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.source_type === 'admin' ? (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-medium">
                            Admin
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">{item.source_org_name || 'Unknown'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Edit3 className="w-4 h-4 text-slate-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'analytics' && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <Circle className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Total Items</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{filteredItems.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <Loader2 className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-medium text-slate-500">In Progress</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{statusCounts.in_progress}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-xs font-medium text-slate-500">Completed</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{statusCounts.completed}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <span className="text-xs font-medium text-slate-500">Completion Rate</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {filteredItems.length > 0 ? Math.round((statusCounts.completed / filteredItems.length) * 100) : 0}%
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6">
              {/* Status Distribution */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-6">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Priority Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-6">Priority Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={priorityChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Upcoming Deadlines</h3>
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No upcoming deadlines</p>
              ) : (
                <div className="space-y-3">
                  {upcomingDeadlines.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-xs ${PRIORITY_COLORS[item.priority].text}`}>
                            {item.priority} priority
                          </span>
                          {item.owner && (
                            <span className="text-xs text-slate-500">• {item.owner}</span>
                          )}
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${
                        isAfter(new Date(), new Date(item.due_date!))
                          ? 'text-red-600'
                          : isBefore(new Date(item.due_date!), addDays(new Date(), 7))
                          ? 'text-amber-600'
                          : 'text-slate-600'
                      }`}>
                        {format(new Date(item.due_date!), 'MMM d, yyyy')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingItem ? 'Edit Roadmap Item' : 'New Roadmap Item'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="e.g., Add dark mode support"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Description
                </label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  rows={4}
                  placeholder="Provide context, requirements, and any relevant details..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Tip: Use **bold**, *italic*, and `code` for formatting
                </p>
              </div>

              {/* Three Column Layout - Row 1 */}
              <div className="grid grid-cols-3 gap-5">
                {/* Priority */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Priority</label>
                  <select
                    value={newItem.priority}
                    onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as any })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Status</label>
                  <select
                    value={newItem.status}
                    onChange={(e) => setNewItem({ ...newItem, status: e.target.value as any })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    disabled={role?.toLowerCase() === 'account manager' && !editingItem}
                  >
                    {role?.toLowerCase() === 'account manager' && <option value="suggested">Suggested</option>}
                    {role?.toLowerCase() === 'admin' && (
                      <>
                        <option value="suggested">Suggested</option>
                        <option value="planned">Planned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </>
                    )}
                  </select>
                  {role?.toLowerCase() === 'account manager' && !editingItem && (
                    <p className="mt-1 text-xs text-slate-500">Account Managers can suggest features for review</p>
                  )}
                </div>

                {/* Owner - User Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Assign To</label>
                  <select
                    value={newItem.owner_id}
                    onChange={(e) => {
                      const selectedUser = users.find(u => u.id === e.target.value);
                      setNewItem({
                        ...newItem,
                        owner_id: e.target.value,
                        owner: selectedUser?.name || ''
                      });
                    }}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Three Column Layout - Row 2 */}
              <div className="grid grid-cols-3 gap-5">
                {/* Version */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Version</label>
                  <input
                    type="text"
                    value={newItem.version}
                    onChange={(e) => setNewItem({ ...newItem, version: e.target.value })}
                    placeholder="e.g., v1, v2, v2.1"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  <p className="mt-1 text-xs text-slate-500">Target release version</p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select Category</option>
                    <option value="Product">Product</option>
                    <option value="Agent">Agent</option>
                    <option value="Sales">Sales</option>
                    <option value="UX">UX</option>
                    <option value="API">API</option>
                    <option value="Integrations">Integrations</option>
                    <option value="Performance">Performance</option>
                    <option value="Security">Security</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-500">Feature type or department</p>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newItem.due_date}
                    onChange={(e) => setNewItem({ ...newItem, due_date: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Notes/Comments */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Notes & Comments
                </label>
                <textarea
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  rows={4}
                  placeholder="Add implementation notes, technical details, blockers, or discussion points..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Detailed notes for team collaboration and context
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="flex-1 h-11 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                className="flex-1 h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                {editingItem ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
