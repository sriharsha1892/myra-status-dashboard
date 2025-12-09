'use client';

/**
 * ProspectsList - Pipedrive-inspired list view for pre-trial prospects
 * Features: Rich row cards, sortable columns, selection, pipeline summary
 */

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  PROSPECT_STAGES,
  getActiveStages,
} from '@/lib/prospects/config';
import ProspectRowCard, { type ProspectRowData } from '@/components/prospect/ProspectRowCard';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Plus,
  Users,
  Target,
  Layers,
} from 'lucide-react';

interface ProspectsListProps {
  prospects: ProspectRowData[];
  onQuickAction?: (action: string, orgId: string) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onAddProspect?: () => void;
}

type SortField = 'org_name' | 'prospect_stage' | 'icp_fit_score' | 'last_activity_at' | 'created_at';
type SortOrder = 'asc' | 'desc';

// Column definition for sortable headers
interface ColumnDef {
  key: SortField;
  label: string;
  width: string;
  sortable: boolean;
  align?: 'left' | 'center' | 'right';
}

const COLUMNS: ColumnDef[] = [
  { key: 'org_name', label: 'Organization', width: 'flex-1 min-w-[200px]', sortable: true },
  { key: 'prospect_stage', label: 'Stage', width: 'w-[130px]', sortable: true },
  { key: 'icp_fit_score', label: 'ICP', width: 'w-[60px]', sortable: true, align: 'center' },
  { key: 'created_at', label: 'Source', width: 'w-[80px]', sortable: false },
  { key: 'last_activity_at', label: 'Activity', width: 'w-[100px]', sortable: true },
];

// Pipeline stats summary component
function PipelineSummary({ prospects }: { prospects: ProspectRowData[] }) {
  const stats = useMemo(() => {
    const avgICP = prospects.filter(p => p.icp_fit_score != null).length > 0
      ? Math.round(
          prospects.filter(p => p.icp_fit_score != null)
            .reduce((sum, p) => sum + (p.icp_fit_score || 0), 0) /
          prospects.filter(p => p.icp_fit_score != null).length
        )
      : 0;
    const withActivity = prospects.filter(p => p.last_activity_at).length;

    return { avgICP, withActivity };
  }, [prospects]);

  return (
    <div className="flex items-center gap-6 px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Layers className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Prospects</p>
          <p className="text-sm font-bold text-gray-900">{prospects.length}</p>
        </div>
      </div>

      <div className="h-8 w-px bg-gray-200" />

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
          <Target className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Avg ICP Score</p>
          <p className="text-sm font-bold text-violet-600">{stats.avgICP > 0 ? `${stats.avgICP}%` : '-'}</p>
        </div>
      </div>

      <div className="h-8 w-px bg-gray-200" />

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
          <Users className="w-4 h-4 text-green-600" />
        </div>
        <div>
          <p className="text-xs text-gray-500">With Activity</p>
          <p className="text-sm font-bold text-green-600">{stats.withActivity}</p>
        </div>
      </div>
    </div>
  );
}

// Sortable column header
function SortableHeader({
  column,
  sortBy,
  sortOrder,
  onSort,
}: {
  column: ColumnDef;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}) {
  const isActive = sortBy === column.key;

  return (
    <button
      onClick={() => column.sortable && onSort(column.key)}
      disabled={!column.sortable}
      className={cn(
        'flex items-center gap-1 text-xs font-medium uppercase tracking-wider',
        column.sortable && 'hover:text-gray-900 cursor-pointer',
        isActive ? 'text-blue-600' : 'text-gray-500',
        column.align === 'right' && 'justify-end',
        column.align === 'center' && 'justify-center'
      )}
    >
      <span>{column.label}</span>
      {column.sortable && (
        <span className="ml-0.5">
          {isActive ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-40" />
          )}
        </span>
      )}
    </button>
  );
}

// Empty state component
function EmptyState({ onAddProspect }: { onAddProspect?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No prospects yet</h3>
      <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
        Start building your pipeline by adding prospects from cold outreach, inbound leads, or referrals.
      </p>
      {onAddProspect && (
        <button
          onClick={onAddProspect}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add First Prospect
        </button>
      )}
    </div>
  );
}

export function ProspectsList({
  prospects,
  onQuickAction,
  selectedIds = new Set(),
  onSelectionChange,
  onAddProspect,
}: ProspectsListProps) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [stageFilter, setStageFilter] = useState<string | null>(null);

  // Get active stages for filter dropdown
  const activeStages = useMemo(() => getActiveStages(), []);

  // Sort and filter prospects
  const sortedProspects = useMemo(() => {
    let filtered = [...prospects];

    // Apply stage filter
    if (stageFilter) {
      filtered = filtered.filter(p => p.prospect_stage === stageFilter);
    }

    // Sort
    return filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'org_name':
          comparison = a.org_name.localeCompare(b.org_name);
          break;
        case 'prospect_stage':
          const stageOrder = PROSPECT_STAGES.reduce((acc, s, i) => ({ ...acc, [s.value]: i }), {} as Record<string, number>);
          comparison = (stageOrder[a.prospect_stage || 'cold_lead'] || 0) - (stageOrder[b.prospect_stage || 'cold_lead'] || 0);
          break;
        case 'icp_fit_score':
          comparison = (a.icp_fit_score || 0) - (b.icp_fit_score || 0);
          break;
        case 'last_activity_at':
          const aTime = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
          const bTime = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
          comparison = aTime - bTime;
          break;
        case 'created_at':
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [prospects, sortBy, sortOrder, stageFilter]);

  const handleSort = useCallback((field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }, [sortBy]);

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;

    if (selectedIds.size === sortedProspects.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(sortedProspects.map(p => p.org_id)));
    }
  }, [sortedProspects, selectedIds, onSelectionChange]);

  const handleSelectOne = useCallback((orgId: string, selected: boolean) => {
    if (!onSelectionChange) return;

    const newIds = new Set(selectedIds);
    if (selected) {
      newIds.add(orgId);
    } else {
      newIds.delete(orgId);
    }
    onSelectionChange(newIds);
  }, [selectedIds, onSelectionChange]);

  const handleRowClick = useCallback((orgId: string) => {
    router.push(`/support/trials/${orgId}`);
  }, [router]);

  // Empty state
  if (prospects.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <EmptyState onAddProspect={onAddProspect} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Pipeline Summary */}
      <PipelineSummary prospects={sortedProspects} />

      {/* Filters Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {/* Stage Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={stageFilter || ''}
              onChange={(e) => setStageFilter(e.target.value || null)}
              className="text-sm border-0 bg-transparent text-gray-600 focus:ring-0 cursor-pointer"
            >
              <option value="">All Stages</option>
              {activeStages.map(stage => (
                <option key={stage.value} value={stage.value}>
                  {stage.emoji} {stage.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selection info */}
        {selectedIds.size > 0 && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">{selectedIds.size}</span> selected
          </div>
        )}
      </div>

      {/* Column Headers */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200">
        {/* Checkbox column */}
        {onSelectionChange && (
          <div className="flex-shrink-0 w-5">
            <input
              type="checkbox"
              checked={selectedIds.size === sortedProspects.length && sortedProspects.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Avatar spacer */}
        <div className="flex-shrink-0 w-8" />

        {/* Sortable columns */}
        {COLUMNS.map(col => (
          <div key={col.key} className={col.width}>
            <SortableHeader
              column={col}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          </div>
        ))}

        {/* Owner column (not sortable) */}
        <div className="w-[80px] text-xs font-medium text-gray-500 uppercase tracking-wider">
          Owner
        </div>

        {/* Actions column spacer */}
        <div className="w-[140px]" />
      </div>

      {/* Prospect Rows */}
      <div className="divide-y divide-gray-100">
        {sortedProspects.map((prospect, index) => (
          <ProspectRowCard
            key={prospect.org_id}
            prospect={prospect}
            onClick={() => handleRowClick(prospect.org_id)}
            onQuickAction={onQuickAction}
            isSelected={selectedIds.has(prospect.org_id)}
            onSelectChange={(selected) => handleSelectOne(prospect.org_id, selected)}
            showSelection={!!onSelectionChange}
            className={cn(
              index === 0 && 'rounded-t-none',
              index === sortedProspects.length - 1 && 'rounded-b-xl'
            )}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {sortedProspects.length} of {prospects.length} prospect{prospects.length !== 1 ? 's' : ''}
          </span>
          {stageFilter && (
            <button
              onClick={() => setStageFilter(null)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProspectsList;
