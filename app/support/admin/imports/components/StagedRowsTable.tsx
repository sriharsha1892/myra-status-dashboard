'use client';

/**
 * StagedRowsTable Component - Glassmorphism Edition
 *
 * Paginated, editable table for viewing and editing staged import rows.
 * Features: status filtering, inline editing, bulk selection/deletion, pagination.
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { EditableCell } from './EditableCell';
import { OrgSelector } from './OrgSelector';

// ============================================================================
// Types
// ============================================================================

interface StagingRecord {
  staging_id: string;
  batch_id: string;
  row_number: number;
  raw_data: Record<string, unknown>;
  parsed_data?: Record<string, unknown>;
  entity_type: string;
  status: string;
  error_message?: string;
}

type StatusFilter = 'all' | 'pending' | 'parsed' | 'validated' | 'needs_org' | 'import_failed' | 'validation_failed' | 'imported' | 'skipped';

interface StagedRowsTableProps {
  batchId: string;
  entityType: string;
  onRowUpdate?: () => void;
}

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    parsed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    validated: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    needs_org: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    importing: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    imported: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    import_failed: 'bg-red-500/20 text-red-300 border-red-500/30',
    validation_failed: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    parse_failed: 'bg-red-500/20 text-red-300 border-red-500/30',
    skipped: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  };

  return (
    <span className={cn(
      'px-2 py-0.5 text-[10px] font-medium rounded-full border whitespace-nowrap backdrop-blur-sm',
      styles[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    )}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function StagedRowsTable({ batchId, entityType, onRowUpdate }: StagedRowsTableProps) {
  // State
  const [rows, setRows] = useState<StagingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Filtering
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get visible columns based on entity type
  const getColumns = useCallback(() => {
    switch (entityType) {
      case 'organization':
        return ['org_name', 'website_url', 'domain_category', 'contact_email'];
      case 'status_update':
        return ['org_name', 'new_status', 'reason'];
      case 'activity':
        return ['org_name', 'activity_type', 'subject', 'activity_date'];
      case 'myra_usage':
        return ['org_name', 'user_name', 'title', 'timestamp', 'cost'];
      case 'prospect':
        return ['name', 'org_name', 'email', 'title', 'source'];
      default:
        return ['org_name'];
    }
  }, [entityType]);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        batchId,
        action: 'rows',
        status: statusFilter,
        limit: String(pageSize),
        offset: String(page * pageSize),
      });

      const res = await fetch(`/api/admin/imports?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [batchId, statusFilter, page, pageSize]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
    setSelectedIds(new Set());
  }, [statusFilter]);

  // ============================================================================
  // Row Actions
  // ============================================================================

  const handleCellSave = async (stagingId: string, fieldKey: string, newValue: unknown) => {
    const row = rows.find((r) => r.staging_id === stagingId);
    if (!row) return;

    const newRawData = {
      ...row.raw_data,
      [fieldKey]: newValue,
    };

    const res = await fetch('/api/admin/imports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_row',
        stagingId,
        updates: { raw_data: newRawData },
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }

    // Update local state
    setRows((prev) =>
      prev.map((r) =>
        r.staging_id === stagingId
          ? { ...r, raw_data: newRawData, status: 'pending', error_message: undefined }
          : r
      )
    );

    onRowUpdate?.();
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(`Delete ${selectedIds.size} selected rows?`);
    if (!confirmed) return;

    try {
      const res = await fetch('/api/admin/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_rows',
          batchId,
          stagingIds: Array.from(selectedIds),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setSelectedIds(new Set());
      fetchRows();
      onRowUpdate?.();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleAssignOrg = async (stagingId: string, orgId: string, orgName: string) => {
    try {
      const res = await fetch('/api/admin/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_org',
          stagingId,
          orgId,
          orgName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      // Update local state - change status to validated
      setRows((prev) =>
        prev.map((r) =>
          r.staging_id === stagingId
            ? {
                ...r,
                status: 'validated',
                error_message: undefined,
                parsed_data: {
                  ...r.parsed_data,
                  org_id: orgId,
                  org_name: orgName,
                  org_resolved: true,
                },
              }
            : r
        )
      );

      onRowUpdate?.();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggleSelect = (stagingId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(stagingId)) {
        next.delete(stagingId);
      } else {
        next.add(stagingId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.staging_id)));
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const columns = getColumns();
  const totalPages = Math.ceil(total / pageSize);

  const statusFilters: StatusFilter[] = [
    'all', 'pending', 'parsed', 'validated', 'needs_org', 'import_failed', 'validation_failed', 'imported', 'skipped'
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Status Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-xl transition-all duration-300',
                statusFilter === status
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/80'
              )}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="px-4 py-1.5 text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-all"
          >
            Delete {selectedIds.size} selected
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] border-b border-white/[0.08]">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/30"
                  />
                </th>
                <th className="w-12 px-3 py-3 text-left text-[10px] font-medium text-white/40 uppercase tracking-wider">
                  #
                </th>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-3 text-left text-[10px] font-medium text-white/40 uppercase tracking-wider">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
                <th className="w-28 px-3 py-3 text-left text-[10px] font-medium text-white/40 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-medium text-white/40 uppercase tracking-wider">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + 4} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3 text-white/40">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 4} className="px-4 py-12 text-center text-white/40">
                    No rows found
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.staging_id}
                    className={cn(
                      'transition-all duration-200',
                      'hover:bg-white/[0.04]',
                      selectedIds.has(row.staging_id) && 'bg-purple-500/10'
                    )}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.staging_id)}
                        onChange={() => toggleSelect(row.staging_id)}
                        className="rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/30"
                      />
                    </td>
                    <td className="px-3 py-2 text-white/40 text-xs">{row.row_number}</td>
                    {columns.map((col) => (
                      <td key={col} className="px-1 py-2 max-w-[200px]">
                        {/* Show OrgSelector for prospects needing org assignment */}
                        {entityType === 'prospect' && col === 'org_name' && row.status === 'needs_org' ? (
                          <OrgSelector
                            selectedOrgId={row.parsed_data?.org_id as string | undefined}
                            selectedOrgName={row.parsed_data?.org_name as string | undefined}
                            suggestedOrgName={row.raw_data.org_name as string}
                            onSelect={(org) => handleAssignOrg(row.staging_id, org.orgId, org.orgName)}
                            placeholder="Assign org..."
                          />
                        ) : (
                          <EditableCell
                            value={row.raw_data[col] as string}
                            fieldKey={col}
                            stagingId={row.staging_id}
                            onSave={handleCellSave}
                          />
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2 text-xs text-red-400 max-w-[200px] truncate" title={row.error_message}>
                      {row.error_message || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-white/40">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                page === 0
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
              )}
            >
              Previous
            </button>
            <span className="px-4 py-2 text-white/50">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                page >= totalPages - 1
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
