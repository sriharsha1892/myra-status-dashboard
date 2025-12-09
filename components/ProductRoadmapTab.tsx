'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Plus, LayoutGrid, LayoutList, BarChart3, AlertCircle, Calendar, Trash2, CheckCircle, User, MessageCircle, Copy } from 'lucide-react';
import AddRoadmapItemModal from './AddRoadmapItemModal';
import RoadmapDetailPanel from './roadmap/RoadmapDetailPanel';
import RoadmapItemVoting from './RoadmapItemVoting';
import RoadmapComments from './RoadmapComments';
import CloneTemplateModal from './roadmap/CloneTemplateModal';
import RoadmapKanbanView from './roadmap/RoadmapKanbanView';
import RoadmapFilters from './roadmap/RoadmapFilters';
import RoadmapAnalytics from './roadmap/RoadmapAnalytics';
import CalendarView from './roadmap/CalendarView';
import StrategicTimelineViewEnhanced from './strategic-timeline/StrategicTimelineViewEnhanced';
import QuickStats from './roadmap/QuickStats';
import SavedFilterViews from './roadmap/SavedFilterViews';
import RoadmapPresence from './roadmap/RoadmapPresence';
import { GridSkeleton, StatsSkeleton } from './roadmap/RoadmapSkeleton';
import KeyboardShortcuts from './roadmap/KeyboardShortcuts';
import { STATUS_CONFIG, PRIORITY_CONFIG, ANIMATIONS } from '@/lib/roadmap/constants';
import { MagneticCard } from './animations/MagneticCard';
import { RippleEffect } from './animations/RippleEffect';
import { LiquidProgressBar } from './animations/LiquidProgressBar';
import { ConfettiEffect } from './animations/ConfettiEffect';
import { HolographicOverlay } from './animations/HolographicOverlay';
import { ChromaticShift } from './animations/ChromaticShift';
import { BlobBackground } from './animations/MorphingBlob';
import { StatusGlow } from './animations/StatusGlow';

interface Owner {
  id: string;
  user_name: string;
  role: 'primary' | 'contributor' | 'reviewer';
}

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
  progress_percentage?: number;
  owners?: Owner[];
  votes?: number;
  comment_count?: number;
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

interface Organization {
  org_id: string;
  org_name: string;
  domain: string;
}

interface ProductRoadmapTabProps {
  orgId: string;
}

type ViewMode = 'cards' | 'kanban' | 'analytics' | 'calendar' | 'strategic';

export default function ProductRoadmapTab({ orgId }: ProductRoadmapTabProps) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [showCommentsModal, setShowCommentsModal] = useState<string | null>(null);
  const [showCloneModal, setShowCloneModal] = useState<RoadmapItem | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // State for pre-filling modal from Analytics
  const [modalPrefill, setModalPrefill] = useState<{
    status?: 'planned' | 'in_progress' | 'completed' | 'cancelled';
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }>({});

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [selectedMilestoneIds, setSelectedMilestoneIds] = useState<string[]>([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  // Confetti trigger
  const [showConfetti, setShowConfetti] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchAll();

    // Set up real-time subscriptions for roadmap changes
    const channel = supabase
      .channel(`roadmap-changes-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'org_product_roadmap',
          filter: `org_id=eq.${orgId}`
        },
        (payload) => {
          // Handle real-time updates
          if (payload.eventType === 'INSERT') {
            setItems((prev) => [...prev, payload.new as RoadmapItem]);
            toast.success('New roadmap item added');
          } else if (payload.eventType === 'UPDATE') {
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as RoadmapItem) : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [orgId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Fetch items with comment count
      const { data: itemsData, error: itemsError } = await supabase
        .from('org_product_roadmap')
        .select('*, comment_count')
        .eq('org_id', orgId)
        .order('target_date', { ascending: true, nullsFirst: false });

      if (itemsError) throw itemsError;

      if (!itemsData || itemsData.length === 0) {
        setItems([]);
      } else {
        // Batch fetch all owners for all roadmap items in one query
        const itemIds = itemsData.map((item) => item.id);
        const { data: allOwnersData } = await supabase
          .from('roadmap_owner_assignments')
          .select('id, user_name, role, roadmap_item_id')
          .in('roadmap_item_id', itemIds)
          .eq('org_id', orgId)
          .order('role', { ascending: true }); // primary first

        // Group owners by roadmap_item_id for O(1) lookup
        const ownersByItem = new Map<string, Owner[]>();
        (allOwnersData || []).forEach((owner: any) => {
          const existing = ownersByItem.get(owner.roadmap_item_id) || [];
          existing.push({ id: owner.id, user_name: owner.user_name, role: owner.role });
          ownersByItem.set(owner.roadmap_item_id, existing);
        });

        // Map items with owners (no more N+1!)
        const itemsWithOwners = itemsData.map((item) => ({
          ...item,
          owners: ownersByItem.get(item.id) || []
        }));

        setItems(itemsWithOwners);
      }

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

      // Fetch organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name, domain')
        .order('org_name');

      if (orgsError) throw orgsError;
      setOrganizations(orgsData || []);
    } catch (error: any) {
      console.error('Error fetching roadmap data:', error);
      toast.error('Failed to load roadmap data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string, itemTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${itemTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('org_product_roadmap')
        .delete()
        .eq('id', itemId)
        .eq('org_id', orgId);

      if (error) throw error;

      toast.success('Roadmap item deleted');
      fetchAll();
    } catch (error: any) {
      console.error('Error deleting roadmap item:', error);
      toast.error('Failed to delete roadmap item');
    }
  };

  const handleMarkComplete = async (itemId: string, itemTitle: string, currentStatus: string) => {
    if (currentStatus === 'completed') {
      toast.success('Item is already completed');
      return;
    }

    try {
      const { error } = await supabase
        .from('org_product_roadmap')
        .update({
          status: 'completed',
          progress_percentage: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('org_id', orgId);

      if (error) throw error;

      toast.success(`Marked "${itemTitle}" as complete!`);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      fetchAll();
    } catch (error: any) {
      console.error('Error marking item complete:', error);
      toast.error('Failed to mark item complete');
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

    // Organization filter
    if (selectedOrgIds.length > 0) {
      filtered = filtered.filter((item) =>
        item.org_id && selectedOrgIds.includes(item.org_id)
      );
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
  }, [items, searchQuery, selectedStatuses, selectedPriorities, selectedLabelIds, selectedMilestoneIds, selectedOrgIds, dateRange, showBlockedOnly]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedLabelIds([]);
    setSelectedMilestoneIds([]);
    setSelectedOrgIds([]);
    setDateRange({ start: null, end: null });
    setShowBlockedOnly(false);
  };

  const hasActiveBlockers = (item: RoadmapItem) => {
    if (!item.blocked_by_ids || item.blocked_by_ids.length === 0) return false;
    const blockers = items.filter((i) => item.blocked_by_ids?.includes(i.id));
    return blockers.some((blocker) => blocker.status !== 'completed');
  };

  // Handle creating item from Analytics view with prefilled values
  const handleCreateFromAnalytics = (prefill: { status?: string; priority?: string }) => {
    setModalPrefill({
      status: prefill.status as any,
      priority: prefill.priority as any,
    });
    setShowAddModal(true);
    toast.success(`Creating item with ${prefill.status ? `status: ${prefill.status}` : `priority: ${prefill.priority}`}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <StatsSkeleton />
        <GridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Presence */}
      <RoadmapPresence
        roadmapId={orgId}
        currentView={viewMode}
        showCursors={false}
        showAvatars={true}
      />

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Left: Title and Description */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Product Roadmap</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
              {filteredItems.length !== items.length && ` (filtered from ${items.length})`}
            </p>
          </div>

          {/* Right: Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            {/* Saved Filter Views */}
            <div className="flex items-center gap-3">
              <SavedFilterViews
                orgId={orgId}
                currentFilters={{
                  searchQuery,
                  selectedStatuses,
                  selectedPriorities,
                  selectedLabelIds,
                  selectedMilestoneIds,
                  selectedOrgIds,
                  dateRange,
                  showBlockedOnly
                }}
                currentViewMode={viewMode}
                onApplyView={(filters, mode) => {
                  setSearchQuery(filters.searchQuery || '');
                  setSelectedStatuses(filters.selectedStatuses || []);
                  setSelectedPriorities(filters.selectedPriorities || []);
                  setSelectedLabelIds(filters.selectedLabelIds || []);
                  setSelectedMilestoneIds(filters.selectedMilestoneIds || []);
                  setSelectedOrgIds(filters.selectedOrgIds || []);
                  setDateRange(filters.dateRange || { start: null, end: null });
                  setShowBlockedOnly(filters.showBlockedOnly || false);
                  setViewMode(mode as ViewMode);
                }}
              />
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px h-10 bg-gray-200" />

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 overflow-x-auto">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden lg:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'kanban'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Kanban View"
              >
                <LayoutList className="w-4 h-4" />
                <span className="hidden lg:inline">Kanban</span>
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'analytics'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Analytics View"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden lg:inline">Analytics</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'calendar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Calendar View"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden lg:inline">Calendar</span>
              </button>
              <button
                onClick={() => setViewMode('strategic')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'strategic'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Strategic Timeline View"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="hidden lg:inline">Strategic</span>
              </button>
            </div>

            {/* Add Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm flex items-center justify-center gap-2 text-sm font-medium whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {viewMode !== 'analytics' && viewMode !== 'calendar' && viewMode !== 'strategic' && (
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
          selectedOrgIds={selectedOrgIds}
          onOrgIdsChange={setSelectedOrgIds}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          showBlockedOnly={showBlockedOnly}
          onShowBlockedOnlyChange={setShowBlockedOnly}
          onClearFilters={clearFilters}
          labels={labels}
          milestones={milestones}
          organizations={organizations}
        />
      )}

      {/* Quick Stats */}
      {viewMode !== 'analytics' && viewMode !== 'strategic' && (
        <QuickStats items={filteredItems} allItems={items} />
      )}

      {/* Content */}
      {viewMode === 'analytics' ? (
        <RoadmapAnalytics items={items} onCreateItem={handleCreateFromAnalytics} />
      ) : viewMode === 'calendar' ? (
        <CalendarView
          orgId={orgId}
          items={filteredItems}
          labels={labels}
          milestones={milestones}
          onItemClick={setSelectedItemId}
          onUpdate={fetchAll}
        />
      ) : viewMode === 'strategic' ? (
        <StrategicTimelineViewEnhanced
          onItemClick={setSelectedItemId}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item, index) => {
                const statusConfig = STATUS_CONFIG[item.status];
                const priorityConfig = PRIORITY_CONFIG[item.priority];
                const isBlocked = hasActiveBlockers(item);

                // Calculate counts for indicators
                const blockerCount = item.blocked_by_ids?.length || 0;
                const linkedCount = item.linked_features?.length || 0;
                const labelCount = item.label_ids?.length || 0;

                return (
                  <MagneticCard
                    key={item.id}
                    index={index}
                    className={`group rounded-xl shadow-lg ${statusConfig.color.border} ${statusConfig.color.glow || ''} cursor-pointer overflow-hidden relative h-[400px] flex flex-col`}
                    style={{
                      background: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)`,
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                    }}
                  >
                    {/* Status glow aura */}
                    <StatusGlow
                      color={statusConfig.color.hex || '#3b82f6'}
                      intensity={item.status === 'completed' ? 'high' : 'medium'}
                      pulse={item.status === 'in_progress'}
                    />

                    {/* Morphing blob background */}
                    <BlobBackground statusColor={statusConfig.color.hex} />

                    {/* Holographic overlay */}
                    <HolographicOverlay intensity={0.4}>
                      {/* Chromatic shift effect */}
                      <ChromaticShift intensity={0.6}>
                        <RippleEffect
                          color={statusConfig.color.dot?.replace('bg-', 'rgba(') || 'rgba(59, 130, 246, 0.4)'}
                        >
                          <div
                            className="flex-1 overflow-y-auto"
                          >
                            <div
                              onClick={() => setSelectedItemId(item.id)}
                              className="p-5 relative"
                            >
                        {/* Header: Title + Progress */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h4 className="text-lg font-bold text-gray-900 flex-1 line-clamp-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
                            {item.title}
                          </h4>
                          {item.progress_percentage !== undefined && item.progress_percentage > 0 && (
                            <span className="text-xs font-bold text-gray-700 shrink-0 bg-gray-100 px-2 py-1 rounded-lg">
                              {item.progress_percentage}%
                            </span>
                          )}
                        </div>

                        {/* Animated Separator */}
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-3" />

                        {/* Metadata: Labels + Date */}
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                          {item.label_ids && item.label_ids.length > 0 && (
                            <span className="font-semibold">
                              {labels.find(l => l.id === item.label_ids![0])?.name || 'Label'}
                            </span>
                          )}
                          {item.label_ids && item.label_ids.length > 0 && item.target_date && (
                            <span className="font-bold">•</span>
                          )}
                          {item.target_date && (
                            <span className="font-medium">{format(new Date(item.target_date), 'MMM d, yyyy')}</span>
                          )}
                        </div>

                        {/* Owners */}
                        {item.owners && item.owners.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                            {item.owners.slice(0, 3).map((owner, idx) => (
                              <div
                                key={owner.id}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                                  owner.role === 'primary'
                                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                                    : owner.role === 'contributor'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                    : 'bg-green-100 text-green-700 border border-green-300'
                                }`}
                                title={`${owner.user_name} (${owner.role})`}
                              >
                                <User className="w-3 h-3" />
                                <span>{owner.user_name}</span>
                                {owner.role === 'primary' && (
                                  <span className="text-[10px] font-bold">★</span>
                                )}
                              </div>
                            ))}
                            {item.owners.length > 3 && (
                              <span className="text-xs text-gray-500 font-medium">
                                +{item.owners.length - 3} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Description */}
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        {/* Liquid Progress Bar */}
                        {item.progress_percentage !== undefined && item.progress_percentage > 0 && (
                          <div className="mb-3">
                            <LiquidProgressBar
                              progress={item.progress_percentage}
                              color={item.progress_percentage === 100 ? '#10b981' : (statusConfig.color.dot?.replace('bg-', '#') || '#3b82f6')}
                              height={8}
                            />
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[10px] font-bold ${statusConfig.color.text} backdrop-blur-sm px-2 py-0.5 rounded-md`}
                                style={{ background: `${statusConfig.color.dot?.replace('bg-', 'rgba(') || 'rgba(59, 130, 246, 0.15)'}15` }}
                              >
                                {statusConfig.label}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Enhanced Indicators */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Priority Badge with gradient */}
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm ${priorityConfig.color.bg} ${priorityConfig.color.text} ${priorityConfig.color.border}`}
                          >
                            {priorityConfig.icon} {priorityConfig.label}
                          </span>

                          {/* Blocker Indicator with pulse */}
                          {isBlocked && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 shadow-sm">
                              <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                              {blockerCount}
                            </span>
                          )}

                          {/* Linked Items */}
                          {linkedCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                              🔗 {linkedCount}
                            </span>
                          )}

                          {/* Label Count */}
                          {labelCount > 1 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                              🏷️ {labelCount}
                            </span>
                          )}

                          {/* Milestone */}
                          {item.milestone_id && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                              🎯
                            </span>
                          )}

                          {/* Voting */}
                          <RoadmapItemVoting
                            roadmapId={item.id}
                            initialVotes={item.votes || 0}
                            title={item.title}
                            onVoteChange={(newVoteCount) => {
                              // Update local state
                              setItems(prevItems =>
                                prevItems.map(i =>
                                  i.id === item.id ? { ...i, votes: newVoteCount } : i
                                )
                              );
                            }}
                            size="sm"
                            showVoters={false}
                          />

                          {/* Comments */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCommentsModal(item.id);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm hover:bg-blue-100 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {item.comment_count || 0}
                          </button>
                        </div>
                            </div>
                          </div>

                          {/* Action Buttons Footer */}
                          <div className="border-t border-gray-200 bg-white/80 backdrop-blur-sm p-3 flex gap-2">
                            {item.status !== 'completed' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkComplete(item.id, item.title, item.status);
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Complete
                              </button>
                            )}
                            {item.status === 'completed' && (
                              <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">
                                <CheckCircle className="w-4 h-4" />
                                Completed
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowCloneModal(item);
                              }}
                              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center justify-center gap-1.5"
                              title="Clone item"
                            >
                              <Copy className="w-4 h-4" />
                              Clone
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id, item.title);
                              }}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center justify-center gap-1.5"
                              title="Delete item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </RippleEffect>
                      </ChromaticShift>
                    </HolographicOverlay>
                  </MagneticCard>
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
        onClose={() => {
          setShowAddModal(false);
          setModalPrefill({}); // Clear prefill when closing
        }}
        onSuccess={fetchAll}
        initialStatus={modalPrefill.status}
        initialPriority={modalPrefill.priority}
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

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts
        onNewItem={() => setShowAddModal(true)}
        onToggleFilters={() => {
          // Scroll to filters section
          const filtersElement = document.querySelector('[data-roadmap-filters]');
          if (filtersElement) {
            filtersElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }}
        onFocusSearch={() => {
          const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        }}
      />

      {/* Comments Modal */}
      {showCommentsModal && (
        <RoadmapComments
          roadmapItemId={showCommentsModal}
          roadmapTitle={items.find(item => item.id === showCommentsModal)?.title || 'Roadmap Item'}
          isOpen={!!showCommentsModal}
          onClose={() => setShowCommentsModal(null)}
          embedded={false}
        />
      )}

      {/* Clone/Template Modal */}
      {showCloneModal && (
        <CloneTemplateModal
          isOpen={!!showCloneModal}
          onClose={() => setShowCloneModal(null)}
          item={showCloneModal}
          orgId={orgId}
          onSuccess={() => {
            fetchAll();
            setShowCloneModal(null);
            toast.success('Item cloned successfully!');
          }}
          mode="both"
        />
      )}

      {/* Confetti Effect */}
      <ConfettiEffect trigger={showConfetti} />
    </div>
  );
}
