'use client';

/**
 * Global Admin Roadmap View
 * - Uses 'roadmap' table (not org-specific)
 * - No org_id required
 * - Same UX improvements as ProductRoadmapTab
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { LayoutGrid, LayoutList, BarChart3, AlertCircle, Calendar } from 'lucide-react';
import RoadmapDetailPanel from './roadmap/RoadmapDetailPanel';
import RoadmapKanbanView from './roadmap/RoadmapKanbanView';
import RoadmapFilters from './roadmap/RoadmapFilters';
import RoadmapAnalytics from './roadmap/RoadmapAnalytics';
import CalendarView from './roadmap/CalendarView';
import QuickStats from './roadmap/QuickStats';
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
import LinkOrgsToRoadmapModal from './LinkOrgsToRoadmapModal';

interface LinkedOrg {
  org_id: string;
  org_name: string;
  domain: string;
  link_type: string;
  priority: string;
  notes: string;
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
  owner_name?: string | null;
  display_owner_name?: string | null;
  primary_owner?: any;
  linked_orgs?: LinkedOrg[];
  linked_org_count?: number;
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

type ViewMode = 'cards' | 'kanban' | 'analytics' | 'calendar';

export default function GlobalRoadmapView() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Filter states
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [selectedMilestoneIds, setSelectedMilestoneIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [organizations, setOrganizations] = useState<{ org_id: string; org_name: string; domain: string }[]>([]);

  // Modal states
  const [showLinkOrgsModal, setShowLinkOrgsModal] = useState(false);
  const [selectedItemForLinking, setSelectedItemForLinking] = useState<RoadmapItem | null>(null);

  // Confetti trigger
  const [showConfetti, setShowConfetti] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Fetch ALL roadmap items across all organizations for admin global view
      const { data: itemsData, error: itemsError } = await supabase
        .from('org_product_roadmap')
        .select('*')
        .order('target_date', { ascending: true, nullsFirst: false });

      if (itemsError) {
        console.error('Error fetching roadmap items:', itemsError);
        throw itemsError;
      }

      console.log('Fetched global roadmap items:', itemsData?.length || 0);

      // Fetch all owner assignments
      const { data: ownersData } = await supabase
        .from('roadmap_owner_assignments')
        .select('*')
        .eq('role', 'primary'); // Only fetch primary owners for card display

      // Create a map of roadmap_item_id -> primary owner
      const ownersMap = new Map();
      if (ownersData) {
        ownersData.forEach((owner: any) => {
          ownersMap.set(owner.roadmap_item_id, owner);
        });
      }

      // Fetch linked organizations for all roadmap items
      const { data: linkedOrgsData } = await supabase
        .from('roadmap_org_links')
        .select(`
          roadmap_item_id,
          org_id,
          link_type,
          priority,
          notes,
          trial_organizations (
            org_id,
            org_name,
            domain
          )
        `);

      // Create a map of roadmap_item_id -> linked orgs array
      const linkedOrgsMap = new Map<string, LinkedOrg[]>();
      if (linkedOrgsData) {
        linkedOrgsData.forEach((link: any) => {
          if (!linkedOrgsMap.has(link.roadmap_item_id)) {
            linkedOrgsMap.set(link.roadmap_item_id, []);
          }
          if (link.trial_organizations) {
            linkedOrgsMap.get(link.roadmap_item_id)!.push({
              org_id: link.trial_organizations.org_id,
              org_name: link.trial_organizations.org_name,
              domain: link.trial_organizations.domain,
              link_type: link.link_type,
              priority: link.priority,
              notes: link.notes,
            });
          }
        });
      }

      // Merge owner data and linked orgs into items
      const itemsWithOwners = (itemsData || []).map((item: any) => {
        const primaryOwner = ownersMap.get(item.id);
        const linkedOrgs = linkedOrgsMap.get(item.id) || [];
        return {
          ...item,
          primary_owner: primaryOwner || null,
          // Keep owner_name for backward compatibility, but prefer primary_owner
          display_owner_name: primaryOwner?.user_name || item.owner_name || null,
          linked_orgs: linkedOrgs,
          linked_org_count: linkedOrgs.length,
        };
      });

      setItems(itemsWithOwners);

      // Fetch all labels - Skip if query fails since labels are optional
      const { data: labelsData } = await supabase
        .from('roadmap_labels')
        .select('*')
        .order('name');

      setLabels(labelsData || []);

      // Fetch all milestones - Skip if query fails since milestones are optional
      const { data: milestonesData } = await supabase
        .from('roadmap_milestones')
        .select('*')
        .order('target_date', { ascending: true, nullsFirst: false });

      setMilestones(milestonesData || []);

      // Fetch all trial organizations for filtering
      const { data: orgsData } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name, domain')
        .order('org_name');

      setOrganizations(orgsData || []);
    } catch (error: any) {
      console.error('Error fetching global roadmap data:', error);
      toast.error(`Failed to load global roadmap data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((item) => selectedStatuses.includes(item.status));
    }

    // Priority filter
    if (selectedPriorities.length > 0) {
      filtered = filtered.filter((item) => selectedPriorities.includes(item.priority));
    }

    // Label filter
    if (selectedLabelIds.length > 0) {
      filtered = filtered.filter((item) =>
        item.label_ids?.some((labelId) => selectedLabelIds.includes(labelId))
      );
    }

    // Milestone filter
    if (selectedMilestoneIds.length > 0) {
      filtered = filtered.filter((item) =>
        item.milestone_id ? selectedMilestoneIds.includes(item.milestone_id) : false
      );
    }

    // Organization filter - show items linked to selected organizations
    if (selectedOrgIds.length > 0) {
      filtered = filtered.filter((item) =>
        item.linked_orgs?.some((org) => selectedOrgIds.includes(org.org_id))
      );
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter((item) => {
        if (!item.target_date) return false;
        return item.target_date >= dateRange.start! && item.target_date <= dateRange.end!;
      });
    }

    // Blocked items filter
    if (showBlockedOnly) {
      filtered = filtered.filter((item) => item.blocked_by_ids && item.blocked_by_ids.length > 0);
    }

    return filtered;
  }, [
    items,
    selectedStatuses,
    selectedPriorities,
    selectedLabelIds,
    selectedMilestoneIds,
    selectedOrgIds,
    dateRange,
    showBlockedOnly,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Escape: Close detail panel
      if (e.key === 'Escape' && selectedItemId) {
        setSelectedItemId(null);
      }

      // Number keys: Switch views
      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (e.key === '1') setViewMode('cards');
        if (e.key === '2') setViewMode('kanban');
        if (e.key === '3') setViewMode('analytics');
        if (e.key === '4') setViewMode('calendar');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedItemId]);


  const handleUpdateItem = async (itemId: string, updates: Partial<RoadmapItem>) => {
    try {
      // Check if status is being changed to completed
      const item = items.find((i) => i.id === itemId);
      const wasNotCompleted = item && item.status !== 'completed';
      const isNowCompleted = updates.status === 'completed';

      const { error } = await supabase
        .from('org_product_roadmap')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
      toast.success('Item updated successfully');

      // Trigger confetti on completion
      if (wasNotCompleted && isNowCompleted) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 100);
      }
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from('org_product_roadmap').delete().eq('id', itemId);

      if (error) throw error;

      setItems(items.filter((item) => item.id !== itemId));
      setSelectedItemId(null);
      toast.success('Item deleted successfully');
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const selectedItem = selectedItemId ? items.find((item) => item.id === selectedItemId) : null;

  const clearFilters = () => {
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedLabelIds([]);
    setSelectedMilestoneIds([]);
    setSelectedOrgIds([]);
    setDateRange({ start: null, end: null });
    setShowBlockedOnly(false);
  };

  const activeFilterCount = [
    selectedStatuses.length,
    selectedPriorities.length,
    selectedLabelIds.length,
    selectedMilestoneIds.length,
    selectedOrgIds.length,
    dateRange.start && dateRange.end ? 1 : 0,
    showBlockedOnly ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <StatsSkeleton />
        <GridSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <QuickStats items={items} allItems={items} />

      {/* Filters and View Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Cards View (1)"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Kanban View (2)"
            >
              <LayoutList className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'analytics'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Analytics View (3)"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Calendar View (4)"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <RoadmapFilters
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
          labels={labels}
          milestones={milestones}
          selectedOrgIds={selectedOrgIds}
          onOrgIdsChange={setSelectedOrgIds}
          organizations={organizations}
          onClearFilters={clearFilters}
        />
      </div>

      {/* Content Views */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No items found</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {activeFilterCount > 0
                    ? 'Try adjusting your filters to see more items.'
                    : 'Get started by adding your first roadmap item.'}
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <MagneticCard
                key={item.id}
                index={index}
                className={`group rounded-xl shadow-lg ${
                  STATUS_CONFIG[item.status]?.color?.border || 'border-gray-200'
                } ${
                  STATUS_CONFIG[item.status]?.color?.glow || ''
                } cursor-pointer overflow-hidden relative`}
                style={{
                  background: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)`,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                }}
              >
                {/* Status glow aura */}
                <StatusGlow
                  color={STATUS_CONFIG[item.status]?.color?.hex || '#3b82f6'}
                  intensity={item.status === 'completed' ? 'high' : 'medium'}
                  pulse={item.status === 'in_progress'}
                />

                {/* Morphing blob background */}
                <BlobBackground statusColor={STATUS_CONFIG[item.status]?.color?.hex} />

                {/* Holographic overlay */}
                <HolographicOverlay intensity={0.4}>
                  {/* Chromatic shift effect */}
                  <ChromaticShift intensity={0.6}>
                    <RippleEffect
                      color={STATUS_CONFIG[item.status]?.color?.dot?.replace('bg-', 'rgba(') || 'rgba(59, 130, 246, 0.4)'}
                    >
                      <div
                        onClick={() => setSelectedItemId(item.id)}
                        className="p-6 relative"
                      >
                    {/* Status and Priority */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                          STATUS_CONFIG[item.status]?.color?.text || 'text-gray-700'
                        }`}
                        style={{
                          background: `${STATUS_CONFIG[item.status]?.color?.dot?.replace('bg-', 'rgba(') || 'rgba(156, 163, 175, 0.2)'}20`,
                        }}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          STATUS_CONFIG[item.status]?.color?.dot || 'bg-gray-400'
                        } animate-pulse`} />
                        {STATUS_CONFIG[item.status]?.label || item.status}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-semibold shadow-sm ${
                          PRIORITY_CONFIG[item.priority]?.color?.bg || 'bg-gray-100'
                        } ${PRIORITY_CONFIG[item.priority]?.color?.text || 'text-gray-700'}`}
                      >
                        {PRIORITY_CONFIG[item.priority]?.icon || ''} {PRIORITY_CONFIG[item.priority]?.label || item.priority}
                      </span>
                    </div>

                    {/* Title with gradient */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
                      {item.title}
                    </h3>

                    {/* Description */}
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">{item.description}</p>
                    )}

                    {/* Liquid Progress Bar */}
                    {item.progress_percentage !== undefined && item.progress_percentage > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs font-medium text-gray-700 mb-2">
                          <span>Progress</span>
                          <span className="font-bold">{item.progress_percentage}%</span>
                        </div>
                        <LiquidProgressBar
                          progress={item.progress_percentage}
                          color={STATUS_CONFIG[item.status]?.color?.dot?.replace('bg-', '#') || '#3b82f6'}
                          height={10}
                        />
                      </div>
                    )}

                    {/* Labels with glass effect */}
                    {item.label_ids && item.label_ids.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.label_ids.slice(0, 3).map((labelId) => {
                          const label = labels.find((l) => l.id === labelId);
                          if (!label) return null;
                          return (
                            <span
                              key={labelId}
                              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm shadow-sm"
                              style={{
                                backgroundColor: `${label.color}25`,
                                color: label.color,
                                border: `1px solid ${label.color}40`,
                              }}
                            >
                              {label.name}
                            </span>
                          );
                        })}
                        {item.label_ids.length > 3 && (
                          <span className="text-xs text-gray-500 font-medium">+{item.label_ids.length - 3} more</span>
                        )}
                      </div>
                    )}

                    {/* Owner (if available) */}
                    {item.display_owner_name && (
                      <div className="mb-3 flex items-center gap-2 text-xs">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-md">
                          {item.display_owner_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-700 font-semibold">{item.display_owner_name}</span>
                      </div>
                    )}

                    {/* Footer with glass separator */}
                    <div className="flex items-center justify-between text-xs text-gray-600 pt-3 mt-3 border-t border-gray-200/50">
                      <span className="font-medium">
                        {item.target_date
                          ? `Due ${format(new Date(item.target_date), 'MMM d, yyyy')}`
                          : 'No due date'}
                      </span>
                      {item.blocked_by_ids && item.blocked_by_ids.length > 0 && (
                        <span className="flex items-center gap-1 text-red-600 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Blocked
                        </span>
                      )}
                    </div>
                  </div>
                    </RippleEffect>
                  </ChromaticShift>
                </HolographicOverlay>
              </MagneticCard>
            ))
          )}
        </div>
      )}

      {viewMode === 'kanban' && (
        <RoadmapKanbanView
          items={filteredItems}
          onItemClick={setSelectedItemId}
          onUpdateItem={handleUpdateItem}
          labels={labels}
          milestones={milestones}
        />
      )}

      {viewMode === 'analytics' && <RoadmapAnalytics items={items} labels={labels} milestones={milestones} />}

      {viewMode === 'calendar' && (
        <CalendarView
          items={filteredItems}
          onItemClick={setSelectedItemId}
          onUpdateItem={handleUpdateItem}
        />
      )}

      {/* Detail Panel */}
      {selectedItem && (
        <RoadmapDetailPanel
          itemId={selectedItem.id}
          orgId={selectedItem.org_id}
          isOpen={true}
          item={selectedItem}
          onClose={() => setSelectedItemId(null)}
          onUpdate={() => {}}
          onDelete={handleDeleteItem}
          labels={labels}
          milestones={milestones}
          allItems={items}
          linkedOrgs={selectedItem.linked_orgs || []}
          onOpenLinkOrgs={() => {
            setSelectedItemForLinking(selectedItem);
            setShowLinkOrgsModal(true);
          }}
        />
      )}

      {/* Link Organizations Modal */}
      {showLinkOrgsModal && selectedItemForLinking && (
        <LinkOrgsToRoadmapModal
          isOpen={showLinkOrgsModal}
          onClose={() => {
            setShowLinkOrgsModal(false);
            setSelectedItemForLinking(null);
          }}
          roadmapItemId={selectedItemForLinking.id}
          roadmapItemTitle={selectedItemForLinking.title}
          linkedOrgs={selectedItemForLinking.linked_orgs || []}
          onSuccess={() => {
            fetchAll();
            setShowLinkOrgsModal(false);
            setSelectedItemForLinking(null);
            toast.success('Organizations linked successfully!');
          }}
        />
      )}

      {/* Keyboard Shortcuts Helper */}
      <KeyboardShortcuts />

      {/* Confetti Effect */}
      <ConfettiEffect trigger={showConfetti} />
    </div>
  );
}
