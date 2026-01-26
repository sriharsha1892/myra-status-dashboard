'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Target,
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  BarChart3,
  Calendar,
  Star,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  ChevronRight,
} from 'lucide-react';
import PipelineTrends from '@/components/quote/PipelineTrends';
import QuoteMsaTracking from '@/components/quote/QuoteMsaTracking';
import ExcelImportSection from '@/components/quote/ExcelImportSection';
import UsageInputParser from '@/components/quote/UsageInputParser';
import UsageMetricsSection from '@/components/quote/UsageMetricsSection';
import UsageReviewModal from '@/components/quote/UsageReviewModal';
import SyncResultModal from '@/components/quote/SyncResultModal';
import EmptyState from '@/components/shared/EmptyState';
import type { Organization } from '@/lib/quote/organization-types';
import { formatValue, formatDate, formatTime, type OrgStats } from '@/lib/quote/utils';
import { ORG_STATUS_LABELS, ORG_STATUS_COLORS } from '@/lib/quote/pipeline-types';
import { useDemoEvents, type DemoEvent } from '@/hooks/useDemoEvents';

// localStorage key for section states
const SECTION_STORAGE_KEY = 'reporting-tab-sections';

// Custom hook for localStorage-persisted collapsible state
function useCollapsibleState(sectionId: string, defaultOpen: boolean) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return defaultOpen;
    try {
      const stored = localStorage.getItem(SECTION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed[sectionId] ?? defaultOpen;
      }
    } catch {
      // Ignore parse errors
    }
    return defaultOpen;
  });

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const newValue = !prev;
      try {
        const stored = JSON.parse(localStorage.getItem(SECTION_STORAGE_KEY) || '{}');
        stored[sectionId] = newValue;
        localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(stored));
      } catch {
        // Ignore storage errors
      }
      return newValue;
    });
  }, [sectionId]);

  return [isOpen, toggle] as const;
}

interface ReportingTabProps {
  organizations: Organization[];
  stats: OrgStats | null;
  loading: boolean;
}

// Collapsible Section Component (with optional external state control)
function CollapsibleSection({
  title,
  icon: Icon,
  isOpen: externalIsOpen,
  onToggle: externalOnToggle,
  defaultOpen = true,
  children,
  headerRight,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen?: boolean;
  onToggle?: () => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  // Use internal state if no external control provided
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const onToggle = externalOnToggle || (() => setInternalIsOpen(!internalIsOpen));

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-neutral-500" />
          <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          {headerRight}
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-neutral-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-neutral-400" />
          )}
        </div>
      </button>
      {isOpen && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

function DemoCard({ demo }: { demo: DemoEvent }) {
  const orgName = demo.trial_organizations?.org_name || 'Unknown Org';
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          demo.demo_status === 'completed' ? 'bg-emerald-100' :
          demo.demo_status === 'cancelled' ? 'bg-red-100' : 'bg-blue-100'
        }`}>
          {demo.demo_status === 'completed' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : demo.demo_status === 'cancelled' ? (
            <XCircle className="w-5 h-5 text-red-600" />
          ) : (
            <Calendar className="w-5 h-5 text-blue-600" />
          )}
        </div>
        <div>
          <p className="font-medium text-neutral-900">{orgName}</p>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span>{formatDate(demo.demo_date)}</span>
            {demo.demo_time && (
              <>
                <span>·</span>
                <span>{formatTime(demo.demo_time)}</span>
              </>
            )}
            <span>·</span>
            <span>{demo.sales_poc}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {demo.demo_status === 'completed' && demo.demo_rating && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${star <= demo.demo_rating! ? 'text-amber-500 fill-amber-500' : 'text-neutral-300'}`}
              />
            ))}
          </div>
        )}
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[demo.demo_status]}`}>
          {demo.demo_status.charAt(0).toUpperCase() + demo.demo_status.slice(1)}
        </span>
      </div>
    </div>
  );
}

// Usage entry from bookmarklet
interface UsageEntry {
  title: string;
  user: string;
  date: string;
  cost: string;
}

// Status priority order for display
const STATUS_PRIORITY = ['intro', 'demo', 'trial', 'proposal', 'won', 'lost'];

export default function ReportingTab({ organizations, stats, loading }: ReportingTabProps) {
  const searchParams = useSearchParams();

  // URL param handling state
  const [showUsageReviewModal, setShowUsageReviewModal] = useState(false);
  const [usageEntries, setUsageEntries] = useState<UsageEntry[]>([]);
  const [showSyncResult, setShowSyncResult] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    title: string;
    summary: { created: number; updated: number; skipped: number; errors: number };
    details?: Array<{ type: 'created' | 'updated' | 'skipped' | 'error'; identifier: string; error?: string }>;
  } | null>(null);
  const [isCommittingUsage, setIsCommittingUsage] = useState(false);

  // Collapsible section states (persisted to localStorage)
  const [demosOpen, toggleDemos] = useCollapsibleState('demos', true);
  const [importOpen, toggleImport] = useCollapsibleState('import', false);

  // Status breakdown: show all toggle
  const [showAllStatuses, setShowAllStatuses] = useState(false);

  // Demo pagination state
  const [upcomingLimit, setUpcomingLimit] = useState(5);
  const [recentLimit, setRecentLimit] = useState(5);

  // Handle URL params from Office Script or Bookmarklet
  useEffect(() => {
    const syncType = searchParams.get('sync');
    const dataParam = searchParams.get('data');

    if (syncType && dataParam) {
      try {
        // Decode base64 data
        const decodedData = JSON.parse(decodeURIComponent(atob(dataParam)));

        if (syncType === 'myra' && Array.isArray(decodedData)) {
          // myRA usage data from bookmarklet
          setUsageEntries(decodedData as UsageEntry[]);
          setShowUsageReviewModal(true);

          // Clear URL params without page reload
          const url = new URL(window.location.href);
          url.searchParams.delete('sync');
          url.searchParams.delete('data');
          window.history.replaceState({}, '', url.toString());
        }
        // Excel sync is handled by ExcelImportSection component
      } catch (error) {
        console.error('Failed to parse sync data from URL:', error);
      }
    }
  }, [searchParams]);

  // Handle usage data commit
  const handleUsageCommit = useCallback(async (
    entries: UsageEntry[],
    userMappings: Array<{
      userName: string;
      orgId: string | null;
      orgName: string | null;
      isInternal: boolean;
      remembered: boolean;
    }>
  ) => {
    setIsCommittingUsage(true);

    try {
      const response = await fetch('/api/reporting/parse-usage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: entries.map(e => ({
            ...e,
            orgId: userMappings.find(m => m.userName === e.user)?.orgId,
            isInternal: userMappings.find(m => m.userName === e.user)?.isInternal || false,
          })),
          mappings: userMappings.filter(m => m.remembered).map(m => ({
            user_name: m.userName,
            org_id: m.orgId,
          })),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setShowUsageReviewModal(false);
        setSyncResult({
          title: 'myRA Usage Import',
          summary: {
            created: result.created || entries.length,
            updated: 0,
            skipped: result.skipped || 0,
            errors: result.errors?.length || 0,
          },
          details: entries.map(e => ({
            type: 'created' as const,
            identifier: `${e.user}: ${e.title || 'Untitled'}`,
          })),
        });
        setShowSyncResult(true);
      } else {
        console.error('Usage import failed:', result);
      }
    } catch (error) {
      console.error('Usage commit error:', error);
    } finally {
      setIsCommittingUsage(false);
    }
  }, []);

  const totalValue = stats?.totalDealValue || 0;
  const onboardedValue = organizations
    .filter(o => o.status === 'onboarded')
    .reduce((sum, o) => sum + (o.deal_value || 0), 0);
  const activeTrials = organizations.filter(o => o.trial_status === 'active').length;
  const pipelineValue = totalValue - onboardedValue;

  // Fetch demos
  const { data: allDemos = [], isLoading: demosLoading } = useDemoEvents();

  // Split demos into upcoming and recent (full arrays for pagination)
  const today = new Date().toISOString().split('T')[0];
  const upcomingDemos = allDemos.filter(d => d.demo_status === 'scheduled' && d.demo_date >= today);
  const recentDemos = allDemos.filter(d => d.demo_status !== 'scheduled' || d.demo_date < today);

  // Apply pagination limits
  const displayedUpcoming = upcomingDemos.slice(0, upcomingLimit);
  const displayedRecent = recentDemos.slice(0, recentLimit);
  const hasMoreUpcoming = upcomingDemos.length > upcomingLimit;
  const hasMoreRecent = recentDemos.length > recentLimit;

  // Calculate conversion rate
  const totalOrgs = stats?.total || 0;
  const onboardedCount = stats?.byStatus['onboarded'] || 0;
  const conversionRate = totalOrgs > 0 ? ((onboardedCount / totalOrgs) * 100).toFixed(1) : '0';

  // Demo stats
  const completedDemos = allDemos.filter(d => d.demo_status === 'completed').length;
  const scheduledDemos = allDemos.filter(d => d.demo_status === 'scheduled').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Stats (Full Width) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Onboarded Value */}
        <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Onboarded Value</p>
              <p className="text-2xl font-bold text-neutral-900">{formatValue(onboardedValue)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-emerald-600 font-medium">{onboardedCount} orgs</span>
            <span className="text-neutral-400">converted</span>
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Pipeline Value</p>
              <p className="text-2xl font-bold text-neutral-900">{formatValue(pipelineValue)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-violet-600 font-medium">{totalOrgs - onboardedCount} orgs</span>
            <span className="text-neutral-400">in pipeline</span>
          </div>
        </div>

        {/* Active Trials */}
        <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Active Trials</p>
              <p className="text-2xl font-bold text-neutral-900">{activeTrials}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-amber-600 font-medium">Live now</span>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-neutral-900">{conversionRate}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-600 font-medium">{totalOrgs} total</span>
            <span className="text-neutral-400">organizations</span>
          </div>
        </div>
      </div>

      {/* Row 2: Usage Metrics & Pipeline Trends (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* myRA Usage Metrics */}
        <UsageMetricsSection />

        {/* Pipeline Trends */}
        <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-neutral-500" />
            Pipeline Trends
          </h3>
          <PipelineTrends isOpen={true} onClose={() => {}} inline={true} />
        </div>
      </div>

      {/* Row 3: Status Breakdown & Quote/MSA Tracking (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-neutral-500" />
              Status Breakdown
            </h3>
            {(() => {
              // Calculate if there are more statuses beyond the priority list
              const allStatuses = Object.keys(stats?.byStatus || {});
              const remainingCount = allStatuses.filter(s => !STATUS_PRIORITY.includes(s)).length;
              const totalStatusCount = STATUS_PRIORITY.filter(s => stats?.byStatus[s] !== undefined).length + remainingCount;

              if (totalStatusCount > 6) {
                return (
                  <button
                    onClick={() => setShowAllStatuses(!showAllStatuses)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {showAllStatuses ? 'Show less' : `Show all (${totalStatusCount})`}
                    <ChevronRight className={`w-4 h-4 transition-transform ${showAllStatuses ? 'rotate-90' : ''}`} />
                  </button>
                );
              }
              return null;
            })()}
          </div>
          {/* Horizontal scroll container for mobile */}
          <div className="overflow-x-auto -mx-2 px-2 pb-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 min-w-[400px]">
              {(() => {
                // Order statuses by priority, then remaining
                const orderedStatuses = STATUS_PRIORITY
                  .filter(s => stats?.byStatus[s] !== undefined)
                  .map(s => [s, stats?.byStatus[s] || 0] as [string, number]);

                const remainingStatuses = Object.entries(stats?.byStatus || {})
                  .filter(([s]) => !STATUS_PRIORITY.includes(s));

                const allStatuses = [...orderedStatuses, ...remainingStatuses];
                const displayedStatuses = showAllStatuses ? allStatuses : allStatuses.slice(0, 6);

                return displayedStatuses.map(([status, count]) => {
                  const color = ORG_STATUS_COLORS[status as keyof typeof ORG_STATUS_COLORS] || '#6B7280';
                  const label = ORG_STATUS_LABELS[status as keyof typeof ORG_STATUS_LABELS] || status;
                  const percentage = totalOrgs > 0 ? ((count / totalOrgs) * 100).toFixed(0) : '0';

                  return (
                    <div key={status} className="text-center min-w-[100px]">
                      <div
                        className="w-full h-2 rounded-full mb-2"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            backgroundColor: color,
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>{count}</p>
                      <p className="text-xs text-neutral-500">{label}</p>
                      <p className="text-xs text-neutral-400">{percentage}%</p>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Quote/MSA Tracking */}
        <QuoteMsaTracking />
      </div>

      {/* Row 4: Demos (Collapsible with localStorage persistence) */}
      <CollapsibleSection
        title="Demo Management"
        icon={Calendar}
        isOpen={demosOpen}
        onToggle={toggleDemos}
        headerRight={
          <span className="text-sm text-neutral-500">
            {scheduledDemos} scheduled · {completedDemos} completed
          </span>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Demos */}
          <div className="bg-neutral-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Upcoming Demos
              </h4>
              <span className="text-xs text-neutral-500">
                {upcomingLimit < upcomingDemos.length
                  ? `${displayedUpcoming.length} of ${upcomingDemos.length}`
                  : `${upcomingDemos.length} scheduled`}
              </span>
            </div>
            {demosLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
              </div>
            ) : displayedUpcoming.length > 0 ? (
              <div className="space-y-3">
                {displayedUpcoming.map((demo) => (
                  <DemoCard key={demo.demo_id} demo={demo} />
                ))}
                {hasMoreUpcoming && (
                  <button
                    onClick={() => setUpcomingLimit(prev => prev + 10)}
                    className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Load 10 more (showing {displayedUpcoming.length} of {upcomingDemos.length})
                  </button>
                )}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No upcoming demos"
                description="Schedule a demo to see it here."
                compact
              />
            )}
          </div>

          {/* Recent Demos */}
          <div className="bg-neutral-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Recent Demos
              </h4>
              <span className="text-xs text-neutral-500">
                {recentLimit < recentDemos.length
                  ? `${displayedRecent.length} of ${recentDemos.length}`
                  : `${recentDemos.length} completed`}
              </span>
            </div>
            {demosLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
              </div>
            ) : displayedRecent.length > 0 ? (
              <div className="space-y-3">
                {displayedRecent.map((demo) => (
                  <DemoCard key={demo.demo_id} demo={demo} />
                ))}
                {hasMoreRecent && (
                  <button
                    onClick={() => setRecentLimit(prev => prev + 10)}
                    className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Load 10 more (showing {displayedRecent.length} of {recentDemos.length})
                  </button>
                )}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle}
                title="No demo history"
                description="Completed demos will appear here."
                compact
              />
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Row 5: Data Import Tools (Collapsible with localStorage persistence) */}
      <CollapsibleSection
        title="Data Import Tools"
        icon={FileSpreadsheet}
        isOpen={importOpen}
        onToggle={toggleImport}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExcelImportSection />
          <UsageInputParser />
        </div>
      </CollapsibleSection>

      {/* Usage Review Modal (from bookmarklet) */}
      <UsageReviewModal
        isOpen={showUsageReviewModal}
        onClose={() => {
          setShowUsageReviewModal(false);
          setUsageEntries([]);
        }}
        usageEntries={usageEntries}
        organizations={organizations.map(o => ({
          id: o.id || '',
          org_name: o.org_name,
        }))}
        existingMappings={[]} // TODO: Fetch from DB
        onCommit={handleUsageCommit}
        isCommitting={isCommittingUsage}
      />

      {/* Sync Result Modal */}
      {syncResult && (
        <SyncResultModal
          isOpen={showSyncResult}
          onClose={() => {
            setShowSyncResult(false);
            setSyncResult(null);
          }}
          onSyncAnother={() => {
            setShowSyncResult(false);
            setSyncResult(null);
          }}
          title={syncResult.title}
          summary={syncResult.summary}
          details={syncResult.details}
        />
      )}
    </div>
  );
}
