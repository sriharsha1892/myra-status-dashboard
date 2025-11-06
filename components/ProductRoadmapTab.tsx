'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Plus, LayoutGrid, LayoutList, BarChart3, AlertCircle, Calendar } from 'lucide-react';
import AddRoadmapItemModal from './AddRoadmapItemModal';
import RoadmapDetailPanel from './roadmap/RoadmapDetailPanel';
import RoadmapKanbanView from './roadmap/RoadmapKanbanView';
import RoadmapFilters from './roadmap/RoadmapFilters';
import RoadmapAnalytics from './roadmap/RoadmapAnalytics';
import CalendarView from './roadmap/CalendarView';

interface RoadmapItem {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_date: string | null;
  estimated_completion_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  linked_features: string[] | null;
  blocked_by_ids: string[] | null;
  blocks_ids: string[] | null;
  label_ids: string[] | null;
  milestone_id: string | null;
}

interface Label {
  id: string;
  org_id: string;
  name: string;
  color: string;
  description: string | null;
}

interface Milestone {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  target_date: string | null;
  status: 'active' | 'completed' | 'cancelled';
  color: string;
}

interface ProductRoadmapTabProps {
  orgId: string;
}

const STATUS_CONFIG: { [key: string]: { icon: string; color: string; label: string } } = {
  planned: { icon: '📋', color: 'blue', label: 'Planned' },
  in_progress: { icon: '🚀', color: 'yellow', label: 'In Progress' },
  completed: { icon: '✅', color: 'green', label: 'Completed' },
  cancelled: { icon: '⛔', color: 'gray', label: 'Cancelled' },
};

const PRIORITY_CONFIG: { [key: string]: { icon: string; color: string; label: string } } = {
  low: { icon: '🟢', color: 'green', label: 'Low' },
  medium: { icon: '🟡', color: 'yellow', label: 'Medium' },
  high: { icon: '🔴', color: 'red', label: 'High' },
  critical: { icon: '🚨', color: 'red', label: 'Critical' },
};

type ViewMode = 'cards' | 'kanban' | 'analytics' | 'calendar';

export default function ProductRoadmapTab({ orgId }: ProductRoadmapTabProps) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [selectedMilestoneIds, setSelectedMilestoneIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchAll();
  }, [orgId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('org_product_roadmap')
        .select('*')
        .eq('org_id', orgId)
        .order('target_date', { ascending: true, nullsFirst: false });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // Fetch labels
      const { data: labelsData, error: labelsError } = await supabase
        .from('roadmap_labels')
        .select('*')
        .eq('org_id', orgId)
        .order('name');

      if (labelsError) throw labelsError;
      setLabels(labelsData || []);

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('roadmap_milestones')
        .select('*')
        .eq('org_id', orgId)
        .order('target_date', { ascending: true, nullsFirst: false });

      if (milestonesError) throw milestonesError;
      setMilestones(milestonesData || []);
    } catch (error: any) {
      console.error('Error fetching roadmap data:', error);
      toast.error('Failed to load roadmap data');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((item) => selectedStatuses.includes(item.status));
    }

    // Priority filter
    if (selectedPriorities.length > 0) {
      filtered = filtered.filter((item) => selectedPriorities.includes(item.priority));
    }

    // Date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter((item) => {
        if (!item.target_date) return false;
        const itemDate = new Date(item.target_date);
        if (dateRange.start && itemDate < new Date(dateRange.start)) return false;
        if (dateRange.end && itemDate > new Date(dateRange.end)) return false;
        return true;
      });
    }

    // Label filter
    if (selectedLabelIds.length > 0) {
      filtered = filtered.filter((item) => {
        if (!item.label_ids || item.label_ids.length === 0) return false;
        return selectedLabelIds.some(labelId => item.label_ids?.includes(labelId));
      });
    }

    // Milestone filter
    if (selectedMilestoneIds.length > 0) {
      filtered = filtered.filter((item) => {
        return item.milestone_id && selectedMilestoneIds.includes(item.milestone_id);
      });
    }

    // Blocked only filter
    if (showBlockedOnly) {
      filtered = filtered.filter((item) => {
        if (!item.blocked_by_ids || item.blocked_by_ids.length === 0) return false;
        // Check if any blocker is not completed
        const blockers = items.filter((i) => item.blocked_by_ids?.includes(i.id));
        return blockers.some((blocker) => blocker.status !== 'completed');
      });
    }

    return filtered;
  }, [items, searchQuery, selectedStatuses, selectedPriorities, selectedLabelIds, selectedMilestoneIds, dateRange, showBlockedOnly]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedLabelIds([]);
    setSelectedMilestoneIds([]);
    setDateRange({ start: null, end: null });
    setShowBlockedOnly(false);
  };

  const getStatusColor = (status: string) => {
    const config = STATUS_CONFIG[status];
    switch (config?.color) {
      case 'blue':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'yellow':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'green':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'gray':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    const config = PRIORITY_CONFIG[priority];
    switch (config?.color) {
      case 'green':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'yellow':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'red':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const hasActiveBlockers = (item: RoadmapItem) => {
    if (!item.blocked_by_ids || item.blocked_by_ids.length === 0) return false;
    const blockers = items.filter((i) => item.blocked_by_ids?.includes(i.id));
    return blockers.some((blocker) => blocker.status !== 'completed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Roadmap</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            {filteredItems.length !== items.length && ` (filtered from ${items.length})`}
          </p>
        </div>

        <div className="flex gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'cards'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'analytics'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Item</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {viewMode !== 'analytics' && viewMode !== 'calendar' && (
        <RoadmapFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatuses={selectedStatuses}
          onStatusChange={setSelectedStatuses}
          selectedPriorities={selectedPriorities}
          onPriorityChange={setSelectedPriorities}
          selectedLabelIds={selectedLabelIds}
          onLabelIdsChange={setSelectedLabelIds}
          selectedMilestoneIds={selectedMilestoneIds}
          onMilestoneIdsChange={setSelectedMilestoneIds}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          showBlockedOnly={showBlockedOnly}
          onShowBlockedOnlyChange={setShowBlockedOnly}
          onClearFilters={clearFilters}
          labels={labels}
          milestones={milestones}
        />
      )}

      {/* Content */}
      {viewMode === 'analytics' ? (
        <RoadmapAnalytics items={items} />
      ) : viewMode === 'calendar' ? (
        <CalendarView
          orgId={orgId}
          items={filteredItems}
          labels={labels}
          milestones={milestones}
          onItemClick={setSelectedItemId}
          onUpdate={fetchAll}
        />
      ) : viewMode === 'kanban' ? (
        <RoadmapKanbanView
          orgId={orgId}
          items={filteredItems}
          onItemClick={setSelectedItemId}
          onUpdate={fetchAll}
        />
      ) : (
        /* Cards View */
        <>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">
                {items.length === 0
                  ? 'No roadmap items yet. Click "Add Item" to get started.'
                  : 'No items match your filters.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const statusConfig = STATUS_CONFIG[item.status];
                const priorityConfig = PRIORITY_CONFIG[item.priority];
                const isBlocked = hasActiveBlockers(item);

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border-2 p-4 ${getStatusColor(
                      item.status
                    )} cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.01]`}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{statusConfig.icon}</span>
                          <h4 className="text-lg font-semibold text-gray-900">{item.title}</h4>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                    )}

                    {/* Priority Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getPriorityColor(
                          item.priority
                        )}`}
                      >
                        {priorityConfig.icon} {priorityConfig.label}
                      </span>
                      {isBlocked && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Blocked
                        </span>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="text-xs text-gray-500 space-y-1">
                      {item.target_date && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Target:</span>
                          <span>{format(new Date(item.target_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      {item.estimated_completion_date && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Est. Complete:</span>
                          <span>
                            {format(new Date(item.estimated_completion_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add Modal */}
      <AddRoadmapItemModal
        orgId={orgId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchAll}
      />

      {/* Detail Panel */}
      <RoadmapDetailPanel
        itemId={selectedItemId || ''}
        orgId={orgId}
        isOpen={!!selectedItemId}
        onClose={() => setSelectedItemId(null)}
        onUpdate={fetchAll}
        allItems={items}
        labels={labels}
        milestones={milestones}
      />
    </div>
  );
}
