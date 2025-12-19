'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Upload,
  Clock,
  Target,
  DollarSign,
  LayoutGrid,
  List,
  Building2,
  Users,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { isQuoteAdminAuthenticated, setQuoteAdminAuthenticated } from '@/lib/quote/auth';
import { QuoteAdminAuthModal } from '@/components/quote/QuoteAdminAuthModal';
import ImportModal from '@/components/quote/ImportModal';
import OrganizationCard from '@/components/quote/OrganizationCard';
import OrganizationEditModal from '@/components/quote/OrganizationEditModal';
import PipelineTrends from '@/components/quote/PipelineTrends';
import type { Organization, OrganizationInput } from '@/lib/quote/organization-types';
import type { OrgStatus } from '@/lib/quote/pipeline-types';
import { ORG_STATUS_LABELS, ORG_STATUS_COLORS } from '@/lib/quote/pipeline-types';
import type { SalesPipelineEntry } from '@/lib/quote/pipeline-types';

const ORG_STATUSES: { id: OrgStatus; label: string; color: string }[] = [
  { id: 'prospect', label: 'Prospect', color: '#6B7280' },
  { id: 'demo_done', label: 'Demo Done', color: '#3B82F6' },
  { id: 'trial_access', label: 'Trial Access', color: '#F59E0B' },
  { id: 'negotiation', label: 'Negotiation', color: '#8B5CF6' },
  { id: 'onboarded', label: 'Onboarded', color: '#10B981' },
  { id: 'rejected', label: 'Rejected', color: '#EF4444' },
];

function formatValue(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface OrgStats {
  total: number;
  byStatus: Record<string, number>;
  byTrialStatus: Record<string, number>;
  totalDealValue: number;
}

export default function QuoteAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Partial<Organization> | null>(null);
  const [showTrends, setShowTrends] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<OrgStatus>>(new Set(['rejected']));
  const [parentOrgs, setParentOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    setIsAuthenticated(isQuoteAdminAuthenticated());
    setAuthChecked(true);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setQuoteAdminAuthenticated();
    setIsAuthenticated(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('includeContacts', 'true');
      params.set('includeSubsidiaries', 'true');
      params.set('parentOnly', 'true');

      const response = await fetch(`/api/quote/organizations?${params.toString()}`);
      const data = await response.json();

      if (!data.error) {
        setOrganizations(data.data || []);
        setStats(data.stats);
        // Also fetch all parent orgs for the edit modal
        const parentRes = await fetch('/api/quote/organizations?parentOnly=true');
        const parentData = await parentRes.json();
        if (!parentData.error) {
          setParentOrgs(parentData.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, fetchData]);

  const handleStatusChange = async (orgId: string, newStatus: OrgStatus) => {
    // Optimistic update
    setOrganizations(prev => prev.map(org =>
      org.id === orgId ? { ...org, status: newStatus, status_updated_at: new Date().toISOString() } : org
    ));

    try {
      await fetch('/api/quote/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orgId,
          updates: { status: newStatus },
        }),
      });
      fetchData(); // Refresh to get updated stats
    } catch (err) {
      console.error('Failed to update status:', err);
      fetchData(); // Revert on error
    }
  };

  const handleSaveOrg = async (formData: OrganizationInput) => {
    const isCreate = !editingOrg?.id;
    const response = await fetch('/api/quote/organizations', {
      method: isCreate ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        isCreate
          ? formData
          : { id: editingOrg!.id, updates: formData }
      ),
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || 'Failed to save');
    setShowEditModal(false);
    setEditingOrg(null);
    fetchData();
  };

  const handleImport = async (importEntries: Partial<SalesPipelineEntry>[]) => {
    const response = await fetch('/api/quote/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: importEntries, created_by: 'admin' }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Import failed');
    fetchData();
  };

  const toggleStatusVisibility = (statusId: OrgStatus) => {
    setHiddenStatuses(prev => {
      const next = new Set(prev);
      if (next.has(statusId)) next.delete(statusId);
      else next.add(statusId);
      return next;
    });
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <QuoteAdminAuthModal onSuccess={handleAuthSuccess} />;
  }

  const totalValue = stats?.totalDealValue || 0;
  const onboardedValue = organizations
    .filter(o => o.status === 'onboarded')
    .reduce((sum, o) => sum + (o.deal_value || 0), 0);
  const activeTrials = organizations.filter(o => o.trial_status === 'active').length;
  const visibleStatuses = ORG_STATUSES.filter(s => !hiddenStatuses.has(s.id));

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200/50">
        <div className="px-6 h-16 flex items-center justify-between max-w-[2000px] mx-auto">
          {/* Left */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-neutral-900">Organizations</h1>
                <p className="text-xs text-neutral-500">{stats?.total || 0} orgs · {formatValue(totalValue)}</p>
              </div>
            </div>
          </div>

          {/* Center - Search */}
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                placeholder="Search organizations..."
                className="w-full h-10 pl-11 pr-4 bg-neutral-100/80 border-0 rounded-full text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData()}
              className="h-9 px-3 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowTrends(true)}
              className="h-9 px-3 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Trends</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="h-9 px-3 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={() => { setEditingOrg({}); setShowEditModal(true); }}
              className="h-9 px-4 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/20"
            >
              <Plus className="w-4 h-4" />
              New Org
            </button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b border-neutral-200/50">
        <div className="px-6 py-4 max-w-[2000px] mx-auto">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-neutral-900">{formatValue(onboardedValue)}</p>
                <p className="text-xs text-neutral-500">Onboarded value</p>
              </div>
            </div>
            <div className="w-px h-10 bg-neutral-200" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-neutral-900">{formatValue(totalValue - onboardedValue)}</p>
                <p className="text-xs text-neutral-500">In pipeline</p>
              </div>
            </div>
            <div className="w-px h-10 bg-neutral-200" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-neutral-900">{activeTrials}</p>
                <p className="text-xs text-neutral-500">Active trials</p>
              </div>
            </div>
            <div className="w-px h-10 bg-neutral-200" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-neutral-900">{stats?.total || 0}</p>
                <p className="text-xs text-neutral-500">Total organizations</p>
              </div>
            </div>

            {/* View Toggle */}
            <div className="ml-auto flex items-center gap-1 p-1 bg-neutral-100 rounded-xl">
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
        </div>
      </div>

      {/* Modals */}
      <ImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImport} />
      <PipelineTrends isOpen={showTrends} onClose={() => setShowTrends(false)} />
      <OrganizationEditModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingOrg(null); }}
        org={editingOrg}
        parentOrgs={parentOrgs}
        onSave={handleSaveOrg}
      />

      {/* Main Content */}
      <main className="px-6 py-6 max-w-[2000px] mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
          </div>
        ) : viewMode === 'board' ? (
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
                        onStatusChange={(newStatus) => handleStatusChange(org.id, newStatus)}
                        onEdit={() => { setEditingOrg(org); setShowEditModal(true); }}
                      />
                    ))}

                    {statusOrgs.length === 0 && (
                      <div className="h-32 rounded-2xl border-2 border-dashed border-neutral-200 flex items-center justify-center">
                        <p className="text-sm text-neutral-400">No organizations</p>
                      </div>
                    )}

                    {/* Add Org Button */}
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
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Organization</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Trial</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Contacts</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {organizations.map(org => {
                  const status = ORG_STATUSES.find(s => s.id === org.status);
                  return (
                    <tr
                      key={org.id}
                      className="hover:bg-neutral-50/50 cursor-pointer transition-colors"
                      onClick={() => { setEditingOrg(org); setShowEditModal(true); }}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-neutral-900">{org.display_name || org.name}</div>
                        {org.industry && <div className="text-sm text-neutral-500">{org.industry}</div>}
                      </td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                        <span className="font-semibold text-neutral-900">
                          {org.deal_value ? formatValue(org.deal_value) : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-600">
                        {org.contact_count || 0}
                      </td>
                      <td className="px-6 py-4 text-neutral-600">
                        {org.employee_name || '—'}
                      </td>
                      <td className="px-6 py-4 text-neutral-500">
                        {timeAgo(org.status_updated_at || org.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

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
    </div>
  );
}
