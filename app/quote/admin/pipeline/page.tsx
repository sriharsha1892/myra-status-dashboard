'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, RefreshCw, Building2, Filter, X, Check, ShieldX } from 'lucide-react';
import {
  usePipelineOrgs,
  useUpdatePipelineOrg,
  useBulkUpdatePipelineOrgs,
  LIFECYCLE_STAGES,
  MOMENTUM_OPTIONS,
  type PipelineOrg,
  type PipelineFilters,
} from '@/hooks/usePipelineManager';
import { enhancedToast } from '@/lib/toast/manager';

// Get row styling based on momentum
const getMomentumRowClass = (momentum: string | null) => {
  switch (momentum) {
    case 'positive':
      return 'border-l-4 border-l-emerald-400 bg-emerald-50/30';
    case 'stalled':
      return 'border-l-4 border-l-amber-400 bg-amber-50/30';
    case 'at_risk':
      return 'border-l-4 border-l-red-400 bg-red-50/30';
    default:
      return 'border-l-4 border-l-transparent';
  }
};

// Stage badge component
function StageBadge({ stage }: { stage: string | null }) {
  const stageConfig = LIFECYCLE_STAGES.find((s) => s.id === stage) || {
    label: stage || 'Unknown',
    color: '#9CA3AF',
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${stageConfig.color}15`,
        color: stageConfig.color,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stageConfig.color }} />
      {stageConfig.label}
    </span>
  );
}

// Momentum badge component (now clickable)
function MomentumBadge({ momentum }: { momentum: string | null }) {
  if (!momentum) return <span className="text-neutral-400 text-sm">Set momentum</span>;

  const config = MOMENTUM_OPTIONS.find((m) => m.id === momentum) || {
    label: momentum,
    color: '#9CA3AF',
  };

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}

// Stage dropdown component
function StageDropdown({
  org,
  onUpdate,
  disabled,
}: {
  org: PipelineOrg;
  onUpdate: (orgId: string, stage: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="inline-flex items-center gap-1 hover:bg-neutral-100 rounded-lg p-1 transition-colors disabled:opacity-50"
      >
        <StageBadge stage={org.org_lifecycle_stage} />
        <ChevronDown className="w-3 h-3 text-neutral-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-neutral-200 py-1 min-w-[160px]">
            {LIFECYCLE_STAGES.map((stage) => (
              <button
                key={stage.id}
                onClick={() => {
                  onUpdate(org.org_id, stage.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2 ${
                  org.org_lifecycle_stage === stage.id ? 'bg-neutral-50' : ''
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                {stage.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Momentum dropdown component
function MomentumDropdown({
  org,
  onUpdate,
  disabled,
}: {
  org: PipelineOrg;
  onUpdate: (orgId: string, momentum: string | null) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="inline-flex items-center gap-1 hover:bg-neutral-100 rounded-lg p-1 transition-colors disabled:opacity-50"
      >
        <MomentumBadge momentum={org.deal_momentum} />
        <ChevronDown className="w-3 h-3 text-neutral-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-neutral-200 py-1 min-w-[140px]">
            {MOMENTUM_OPTIONS.map((momentum) => (
              <button
                key={momentum.id}
                onClick={() => {
                  onUpdate(org.org_id, momentum.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2 ${
                  org.deal_momentum === momentum.id ? 'bg-neutral-50' : ''
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: momentum.color }} />
                {momentum.label}
              </button>
            ))}
            {org.deal_momentum && (
              <>
                <div className="border-t border-neutral-100 my-1" />
                <button
                  onClick={() => {
                    onUpdate(org.org_id, null);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 text-neutral-500"
                >
                  Clear momentum
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Inline POC edit component
function InlinePOCEdit({
  org,
  onUpdate,
  disabled,
}: {
  org: PipelineOrg;
  onUpdate: (orgId: string, poc: string | null) => void;
  disabled?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(org.sales_poc || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedValue = value.trim();
    if (trimmedValue !== (org.sales_poc || '')) {
      onUpdate(org.org_id, trimmedValue || null);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setValue(org.sales_poc || '');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="w-full px-2 py-1 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
        placeholder="Enter POC name"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setValue(org.sales_poc || '');
        setIsEditing(true);
      }}
      disabled={disabled}
      className="text-left hover:bg-neutral-100 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors disabled:opacity-50 min-w-[100px]"
    >
      {org.sales_poc || <span className="text-neutral-400">Add POC</span>}
    </button>
  );
}

// Notes preview component (clickable to expand)
function NotesPreview({
  notes,
  isExpanded,
  onToggle,
}: {
  notes: string | null;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  if (!notes) return <span className="text-neutral-400">-</span>;

  const preview = notes.length > 50 ? notes.substring(0, 50) + '...' : notes;

  return (
    <button
      onClick={onToggle}
      className="text-left text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors max-w-[200px]"
    >
      <span className={isExpanded ? 'text-blue-600' : ''}>
        {isExpanded ? 'Collapse' : preview}
      </span>
    </button>
  );
}

// Expandable notes row
function NotesRow({ notes, isExpanded }: { notes: string | null; isExpanded: boolean }) {
  if (!isExpanded || !notes) return null;

  return (
    <tr className="bg-neutral-50">
      <td colSpan={8} className="px-4 py-3">
        <div className="text-sm text-neutral-600 whitespace-pre-wrap">{notes}</div>
      </td>
    </tr>
  );
}

// Bulk action bar component
function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkStageChange,
  onBulkMomentumChange,
  isLoading,
}: {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStageChange: (stage: string) => void;
  onBulkMomentumChange: (momentum: string | null) => void;
  isLoading: boolean;
}) {
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [showMomentumMenu, setShowMomentumMenu] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-3 px-4 py-3 bg-neutral-900 text-white rounded-2xl shadow-xl">
        {/* Selection Count */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <span className="font-medium">{selectedCount} selected</span>
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Stage Change Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowStageMenu(!showStageMenu);
              setShowMomentumMenu(false);
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50"
          >
            <span className="text-sm">Change Stage</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showStageMenu ? 'rotate-180' : ''}`} />
          </button>

          {showStageMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowStageMenu(false)} />
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden z-50">
                {LIFECYCLE_STAGES.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => {
                      onBulkStageChange(stage.id);
                      setShowStageMenu(false);
                    }}
                    disabled={isLoading}
                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-neutral-50 text-left transition-colors disabled:opacity-50"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm text-neutral-700">{stage.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Momentum Change Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowMomentumMenu(!showMomentumMenu);
              setShowStageMenu(false);
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50"
          >
            <span className="text-sm">Change Momentum</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showMomentumMenu ? 'rotate-180' : ''}`} />
          </button>

          {showMomentumMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMomentumMenu(false)} />
              <div className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden z-50">
                {MOMENTUM_OPTIONS.map((momentum) => (
                  <button
                    key={momentum.id}
                    onClick={() => {
                      onBulkMomentumChange(momentum.id);
                      setShowMomentumMenu(false);
                    }}
                    disabled={isLoading}
                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-neutral-50 text-left transition-colors disabled:opacity-50"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: momentum.color }} />
                    <span className="text-sm text-neutral-700">{momentum.label}</span>
                  </button>
                ))}
                <div className="border-t border-neutral-100" />
                <button
                  onClick={() => {
                    onBulkMomentumChange(null);
                    setShowMomentumMenu(false);
                  }}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 hover:bg-neutral-50 text-left text-sm text-neutral-500 transition-colors disabled:opacity-50"
                >
                  Clear momentum
                </button>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          disabled={isLoading}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Loading indicator */}
        {isLoading && (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}

export default function PipelineManagerPage() {
  const [filters, setFilters] = useState<PipelineFilters>({
    search: '',
    stage: '',
    sortBy: 'org_name',
    sortOrder: 'asc',
    page: 1,
    limit: 50,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isFetching, error } = usePipelineOrgs(filters);
  const updateMutation = useUpdatePipelineOrg();
  const bulkUpdateMutation = useBulkUpdatePipelineOrgs();

  // Check for access denied error
  const isAccessDenied = error?.message?.includes('Access denied') || error?.message?.includes('Leadership access');

  const organizations = data?.organizations || [];
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 };
  const stageCounts = data?.stageCounts || {};

  // Calculate total by stage for filter bar
  const stageStats = useMemo(() => {
    return LIFECYCLE_STAGES.map((stage) => ({
      ...stage,
      count: stageCounts[stage.id] || 0,
    }));
  }, [stageCounts]);

  // Clear selections and expanded notes when filters/page changes
  useEffect(() => {
    setSelectedIds(new Set());
    setExpandedId(null);
  }, [filters.search, filters.stage, filters.page]);

  // Check if all visible items are selected
  const allSelected = organizations.length > 0 && organizations.every((org) => selectedIds.has(org.org_id));
  const someSelected = organizations.some((org) => selectedIds.has(org.org_id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(organizations.map((org) => org.org_id)));
    }
  };

  const handleSelectOne = (orgId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  };

  const handleStageUpdate = async (orgId: string, newStage: string) => {
    const org = organizations.find((o) => o.org_id === orgId);
    const previousStage = org?.org_lifecycle_stage;

    try {
      await updateMutation.mutateAsync({
        orgId,
        updates: { org_lifecycle_stage: newStage },
      });

      const stageLabel = LIFECYCLE_STAGES.find((s) => s.id === newStage)?.label || newStage;
      enhancedToast.success(`Stage updated to ${stageLabel}`, {
        description: org?.org_name,
        onUndo: async () => {
          await updateMutation.mutateAsync({
            orgId,
            updates: { org_lifecycle_stage: previousStage || 'prospect' },
          });
          enhancedToast.info('Stage reverted');
        },
      });
    } catch {
      enhancedToast.error('Failed to update stage');
    }
  };

  const handleMomentumUpdate = async (orgId: string, newMomentum: string | null) => {
    const org = organizations.find((o) => o.org_id === orgId);
    const previousMomentum = org?.deal_momentum;

    try {
      await updateMutation.mutateAsync({
        orgId,
        updates: { deal_momentum: newMomentum },
      });

      const label = newMomentum
        ? MOMENTUM_OPTIONS.find((m) => m.id === newMomentum)?.label || newMomentum
        : 'cleared';
      enhancedToast.success(`Momentum ${newMomentum ? `set to ${label}` : 'cleared'}`, {
        description: org?.org_name,
        onUndo: async () => {
          await updateMutation.mutateAsync({
            orgId,
            updates: { deal_momentum: previousMomentum },
          });
          enhancedToast.info('Momentum reverted');
        },
      });
    } catch {
      enhancedToast.error('Failed to update momentum');
    }
  };

  const handlePOCUpdate = async (orgId: string, newPOC: string | null) => {
    const org = organizations.find((o) => o.org_id === orgId);
    const previousPOC = org?.sales_poc;

    try {
      await updateMutation.mutateAsync({
        orgId,
        updates: { sales_poc: newPOC },
      });

      enhancedToast.success(newPOC ? `POC updated to ${newPOC}` : 'POC cleared', {
        description: org?.org_name,
        onUndo: async () => {
          await updateMutation.mutateAsync({
            orgId,
            updates: { sales_poc: previousPOC },
          });
          enhancedToast.info('POC reverted');
        },
      });
    } catch {
      enhancedToast.error('Failed to update POC');
    }
  };

  const handleBulkStageChange = async (newStage: string) => {
    const orgIds = Array.from(selectedIds);
    const previousStages = new Map(
      organizations
        .filter((o) => selectedIds.has(o.org_id))
        .map((o) => [o.org_id, o.org_lifecycle_stage])
    );

    try {
      await bulkUpdateMutation.mutateAsync({
        orgIds,
        updates: { org_lifecycle_stage: newStage },
      });

      const stageLabel = LIFECYCLE_STAGES.find((s) => s.id === newStage)?.label || newStage;
      enhancedToast.success(`Updated ${orgIds.length} organizations to ${stageLabel}`, {
        onUndo: async () => {
          // Revert each org to its previous stage
          await Promise.all(
            orgIds.map((orgId) =>
              updateMutation.mutateAsync({
                orgId,
                updates: { org_lifecycle_stage: previousStages.get(orgId) || 'prospect' },
              })
            )
          );
          enhancedToast.info('Bulk stage change reverted');
        },
      });

      setSelectedIds(new Set());
    } catch {
      enhancedToast.error('Failed to bulk update stage');
    }
  };

  const handleBulkMomentumChange = async (newMomentum: string | null) => {
    const orgIds = Array.from(selectedIds);
    const previousMomentums = new Map(
      organizations
        .filter((o) => selectedIds.has(o.org_id))
        .map((o) => [o.org_id, o.deal_momentum])
    );

    try {
      await bulkUpdateMutation.mutateAsync({
        orgIds,
        updates: { deal_momentum: newMomentum },
      });

      const label = newMomentum
        ? MOMENTUM_OPTIONS.find((m) => m.id === newMomentum)?.label || newMomentum
        : 'cleared';
      enhancedToast.success(
        `${newMomentum ? `Set momentum to ${label}` : 'Cleared momentum'} for ${orgIds.length} organizations`,
        {
          onUndo: async () => {
            // Revert each org to its previous momentum
            await Promise.all(
              orgIds.map((orgId) =>
                updateMutation.mutateAsync({
                  orgId,
                  updates: { deal_momentum: previousMomentums.get(orgId) },
                })
              )
            );
            enhancedToast.info('Bulk momentum change reverted');
          },
        }
      );

      setSelectedIds(new Set());
    } catch {
      enhancedToast.error('Failed to bulk update momentum');
    }
  };

  const handleSort = (column: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (filters.sortBy !== column) return null;
    return filters.sortOrder === 'asc' ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  const isAnyLoading = updateMutation.isPending || bulkUpdateMutation.isPending;

  // Show access denied UI if user doesn't have leadership access
  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Access Denied</h1>
          <p className="text-neutral-600 max-w-md">
            You don&apos;t have permission to access the Pipeline Manager.
            This page is restricted to leadership team members.
          </p>
          <a
            href="/quote/admin"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            Back to Admin
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Pipeline Manager</h1>
            <p className="text-sm text-neutral-500 mt-1">
              {pagination.total} organizations
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search organizations, POC, notes..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300"
            />
          </div>

          <div className="relative">
            <select
              value={filters.stage || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, stage: e.target.value, page: 1 }))}
              className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300"
            >
              <option value="">All Stages</option>
              {LIFECYCLE_STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label} ({stageCounts[stage.id] || 0})
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        {/* Stage Summary Bar */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {stageStats.map((stage) => (
            <button
              key={stage.id}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  stage: prev.stage === stage.id ? '' : stage.id,
                  page: 1,
                }))
              }
              className={`flex-shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filters.stage === stage.id
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: filters.stage === stage.id ? '#fff' : stage.color }}
              />
              {stage.label}
              <span className={filters.stage === stage.id ? 'text-neutral-300' : 'text-neutral-400'}>
                {stage.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
            </div>
          ) : organizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <Building2 className="w-12 h-12 text-neutral-300 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-1">No organizations found</h3>
              <p className="text-sm text-neutral-500">
                {filters.search || filters.stage
                  ? 'Try adjusting your filters'
                  : 'Import organizations to get started'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900/10"
                    />
                  </th>
                  <th
                    className="px-4 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:text-neutral-700"
                    onClick={() => handleSort('org_name')}
                  >
                    <div className="flex items-center gap-1">
                      Organization
                      <SortIcon column="org_name" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:text-neutral-700"
                    onClick={() => handleSort('org_lifecycle_stage')}
                  >
                    <div className="flex items-center gap-1">
                      Stage
                      <SortIcon column="org_lifecycle_stage" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:text-neutral-700"
                    onClick={() => handleSort('sales_poc')}
                  >
                    <div className="flex items-center gap-1">
                      Sales POC
                      <SortIcon column="sales_poc" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:text-neutral-700"
                    onClick={() => handleSort('deal_momentum')}
                  >
                    <div className="flex items-center gap-1">
                      Momentum
                      <SortIcon column="deal_momentum" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer hover:text-neutral-700"
                    onClick={() => handleSort('deal_value')}
                  >
                    <div className="flex items-center gap-1">
                      Value
                      <SortIcon column="deal_value" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {organizations.map((org) => (
                  <React.Fragment key={org.org_id}>
                    <tr
                      className={`hover:bg-neutral-50/50 transition-colors ${getMomentumRowClass(org.deal_momentum)} ${
                        expandedId === org.org_id ? 'bg-neutral-50/50' : ''
                      } ${selectedIds.has(org.org_id) ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(org.org_id)}
                          onChange={() => handleSelectOne(org.org_id)}
                          className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900/10"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-neutral-900">{org.org_name}</div>
                        {org.region && <div className="text-xs text-neutral-500">{org.region}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <StageDropdown
                          org={org}
                          onUpdate={handleStageUpdate}
                          disabled={isAnyLoading}
                        />
                      </td>
                      <td className="px-4 py-4 text-neutral-600">
                        <InlinePOCEdit
                          org={org}
                          onUpdate={handlePOCUpdate}
                          disabled={isAnyLoading}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <MomentumDropdown
                          org={org}
                          onUpdate={handleMomentumUpdate}
                          disabled={isAnyLoading}
                        />
                      </td>
                      <td className="px-4 py-4">
                        {org.deal_value ? (
                          <span className="font-medium text-neutral-900">
                            ${org.deal_value.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-neutral-600">
                        {org.domain || <span className="text-neutral-400">-</span>}
                      </td>
                      <td className="px-4 py-4">
                        <NotesPreview
                          notes={org.notes}
                          isExpanded={expandedId === org.org_id}
                          onToggle={() => setExpandedId(expandedId === org.org_id ? null : org.org_id)}
                        />
                      </td>
                    </tr>
                    <NotesRow notes={org.notes} isExpanded={expandedId === org.org_id} />
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-neutral-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page! - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-neutral-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page! + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkStageChange={handleBulkStageChange}
        onBulkMomentumChange={handleBulkMomentumChange}
        isLoading={bulkUpdateMutation.isPending}
      />
    </div>
  );
}
