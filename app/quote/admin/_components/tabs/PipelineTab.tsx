'use client';

import React, { useState } from 'react';
import { Plus, ChevronRight, LayoutGrid, List, Building2 } from 'lucide-react';
import OrganizationCard from '@/components/quote/OrganizationCard';
import OrganizationEditModal from '@/components/quote/OrganizationEditModal';
import OrgQuickPeek from '@/components/quote/OrgQuickPeek';
import EmptyState from '@/components/shared/EmptyState';
import BulkActionBar from '../BulkActionBar';
import { InlineEditNumber } from '@/components/InlineEdit';
import { enhancedToast } from '@/lib/toast/manager';
import type { Organization, OrganizationInput } from '@/lib/quote/organization-types';
import type { OrgStatus } from '@/lib/quote/pipeline-types';
import { ORG_STATUS_LABELS } from '@/lib/quote/pipeline-types';
import { ORG_STATUSES, formatValue, timeAgo, type OrgStats } from '@/lib/quote/utils';

interface PipelineTabProps {
  organizations: Organization[];
  stats: OrgStats | null;
  loading: boolean;
  parentOrgs: Organization[];
  onStatusChange: (orgId: string, newStatus: OrgStatus) => Promise<void>;
  onSaveOrg: (formData: OrganizationInput, orgId?: string) => Promise<void>;
  onUpdateOrg?: (orgId: string, updates: Partial<OrganizationInput>) => Promise<void>;
  onBulkStatusChange?: (ids: string[], status: OrgStatus) => Promise<void>;
  onRefresh: () => void;
}

export default function PipelineTab({
  organizations,
  stats,
  loading,
  parentOrgs,
  onStatusChange,
  onSaveOrg,
  onUpdateOrg,
  onBulkStatusChange,
  onRefresh,
}: PipelineTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<OrgStatus>>(new Set(['rejected']));
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Partial<Organization> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [peekOrgId, setPeekOrgId] = useState<string | null>(null);

  const toggleStatusVisibility = (statusId: OrgStatus) => {
    setHiddenStatuses(prev => {
      const next = new Set(prev);
      if (next.has(statusId)) next.delete(statusId);
      else next.add(statusId);
      return next;
    });
  };

  const handleStatusChangeWithUndo = async (org: Organization, newStatus: OrgStatus) => {
    const previousStatus = org.status;
    await onStatusChange(org.id, newStatus);

    enhancedToast.success(`Status updated to ${ORG_STATUS_LABELS[newStatus]}`, {
      description: org.display_name || org.name,
      onUndo: async () => {
        await onStatusChange(org.id, previousStatus);
        enhancedToast.info('Status reverted');
      },
    });
  };

  const handleDealValueChange = async (org: Organization, newValue: number) => {
    if (!onUpdateOrg) return;
    const previousValue = org.deal_value || 0;
    await onUpdateOrg(org.id, { deal_value: newValue });

    enhancedToast.success('Deal value updated', {
      description: `${org.display_name || org.name}: ${formatValue(newValue)}`,
      onUndo: async () => {
        await onUpdateOrg(org.id, { deal_value: previousValue });
        enhancedToast.info('Deal value reverted');
      },
    });
  };

  const handleSaveOrg = async (formData: OrganizationInput) => {
    await onSaveOrg(formData, editingOrg?.id);
    setShowEditModal(false);
    setEditingOrg(null);
  };

  const toggleSelection = (orgId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(orgId)) next.delete(orgId);
      else next.add(orgId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === organizations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(organizations.map(o => o.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkStatusChange = async (newStatus: OrgStatus) => {
    if (!onBulkStatusChange || selectedIds.size === 0) return;

    // Capture previous statuses for undo
    const previousStatuses = new Map<string, OrgStatus>();
    organizations.forEach(org => {
      if (selectedIds.has(org.id)) {
        previousStatuses.set(org.id, org.status);
      }
    });

    await onBulkStatusChange(Array.from(selectedIds), newStatus);

    enhancedToast.success(`Updated ${selectedIds.size} organizations to ${ORG_STATUS_LABELS[newStatus]}`, {
      onUndo: async () => {
        // Revert each org to its previous status
        for (const [id, prevStatus] of previousStatuses) {
          await onStatusChange(id, prevStatus);
        }
        enhancedToast.info('Bulk status change reverted');
      },
    });

    clearSelection();
  };

  const peekOrg = peekOrgId ? organizations.find(o => o.id === peekOrgId) : null;

  const visibleStatuses = ORG_STATUSES.filter(s => !hiddenStatuses.has(s.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* View Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl">
          <button
            onClick={() => setViewMode('board')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'board' ? (
        /* Kanban Board */
        <div className="flex gap-4 overflow-x-auto pb-6 -mx-6 px-6">
          {visibleStatuses.map(status => {
            const statusOrgs = organizations.filter(o => o.status === status.id);
            const statusValue = statusOrgs.reduce((sum, o) => sum + (o.deal_value || 0), 0);

            return (
              <div key={status.id} className="flex-shrink-0 w-[320px]">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <h2 className="font-semibold text-neutral-900">{status.label}</h2>
                    <span className="text-sm text-neutral-400">
                      {statusOrgs.length}
                    </span>
                  </div>
                  {statusValue > 0 && (
                    <span className="text-sm font-medium text-neutral-500">
                      {formatValue(statusValue)}
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {statusOrgs.map(org => (
                    <OrganizationCard
                      key={org.id}
                      org={org}
                      isExpanded={expandedId === org.id}
                      onToggle={() => setExpandedId(expandedId === org.id ? null : org.id)}
                      onStatusChange={(newStatus) => handleStatusChangeWithUndo(org, newStatus)}
                      onEdit={() => { setEditingOrg(org); setShowEditModal(true); }}
                    />
                  ))}

                  {statusOrgs.length === 0 && (
                    <EmptyState
                      icon={Building2}
                      title={`No ${status.label.toLowerCase()}`}
                      compact
                      action={{
                        label: 'Add organization',
                        onClick: () => {
                          setEditingOrg({ status: status.id });
                          setShowEditModal(true);
                        },
                      }}
                    />
                  )}

                  {/* Add Org Button (only show if there are orgs) */}
                  {statusOrgs.length > 0 && (
                    <button
                      onClick={() => {
                        setEditingOrg({ status: status.id });
                        setShowEditModal(true);
                      }}
                      className="w-full h-12 rounded-xl border-2 border-dashed border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 flex items-center justify-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Add organization
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Hidden Statuses Toggle */}
          {hiddenStatuses.size > 0 && (
            <div className="flex-shrink-0 w-[200px] flex items-start pt-10">
              <button
                onClick={() => setHiddenStatuses(new Set())}
                className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                Show {hiddenStatuses.size} hidden
              </button>
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden">
          {organizations.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No organizations yet"
              description="Add your first organization to get started with your pipeline."
              action={{
                label: 'Add Organization',
                onClick: () => {
                  setEditingOrg({ status: 'prospect' });
                  setShowEditModal(true);
                },
              }}
            />
          ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-4 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === organizations.length && organizations.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
                  />
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Organization</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Trial</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Value</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Contacts</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {organizations.map(org => {
                const status = ORG_STATUSES.find(s => s.id === org.status);
                const isSelected = selectedIds.has(org.id);
                return (
                  <tr
                    key={org.id}
                    className={`hover:bg-neutral-50/50 cursor-pointer transition-colors ${isSelected ? 'bg-violet-50/50' : ''}`}
                    onClick={() => setPeekOrgId(org.id)}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(org.id)}
                        className="w-4 h-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-neutral-900">{org.display_name || org.name}</div>
                      {org.industry && <div className="text-sm text-neutral-500">{org.industry}</div>}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                        style={{ backgroundColor: `${status?.color}15`, color: status?.color }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: status?.color }}
                        />
                        {status?.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {org.trial_status && org.trial_status !== 'not_requested' ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          org.trial_status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          org.trial_status === 'revoked' ? 'bg-purple-100 text-purple-700' :
                          org.trial_status === 'expired' ? 'bg-red-100 text-red-700' :
                          org.trial_status === 'inactive' ? 'bg-orange-100 text-orange-700' :
                          'bg-neutral-100 text-neutral-600'
                        }`}>
                          {org.trial_status.charAt(0).toUpperCase() + org.trial_status.slice(1)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      {onUpdateOrg ? (
                        <InlineEditNumber
                          value={org.deal_value || 0}
                          onSave={async (val) => handleDealValueChange(org, val)}
                          placeholder="$0"
                          className="font-semibold text-neutral-900"
                          min={0}
                        />
                      ) : (
                        <span className="font-semibold text-neutral-900">
                          {org.deal_value ? formatValue(org.deal_value) : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-neutral-600">
                      {org.contact_count || 0}
                    </td>
                    <td className="px-4 py-4 text-neutral-600">
                      {org.employee_name || '—'}
                    </td>
                    <td className="px-4 py-4 text-neutral-500">
                      {timeAgo(org.status_updated_at || org.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      )}

      {/* Status Filter Bar (Bottom) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-1 p-1.5 bg-white/90 backdrop-blur-xl rounded-2xl border border-neutral-200/50 shadow-xl shadow-neutral-900/10">
          {ORG_STATUSES.map(status => {
            const count = stats?.byStatus[status.id] || 0;
            const isHidden = hiddenStatuses.has(status.id);
            return (
              <button
                key={status.id}
                onClick={() => toggleStatusVisibility(status.id)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  isHidden
                    ? 'text-neutral-400 hover:text-neutral-600'
                    : 'text-neutral-700 bg-neutral-100'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${isHidden ? 'opacity-40' : ''}`}
                  style={{ backgroundColor: status.color }}
                />
                <span className="hidden sm:inline">{status.label}</span>
                <span className={`text-xs ${isHidden ? 'text-neutral-300' : 'text-neutral-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      <OrganizationEditModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingOrg(null); }}
        org={editingOrg}
        parentOrgs={parentOrgs}
        onSave={handleSaveOrg}
      />

      {/* Quick Peek Panel */}
      <OrgQuickPeek
        org={peekOrg || null}
        isOpen={!!peekOrgId}
        onClose={() => setPeekOrgId(null)}
        onEdit={(org) => {
          setPeekOrgId(null);
          setEditingOrg(org);
          setShowEditModal(true);
        }}
      />

      {/* Bulk Action Bar */}
      {onBulkStatusChange && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          onBulkStatusChange={handleBulkStatusChange}
        />
      )}
    </>
  );
}
