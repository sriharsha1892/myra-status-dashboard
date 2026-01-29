'use client';

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { isQuoteAdminAuthenticated, setQuoteAdminAuthenticated } from '@/lib/quote/auth';
import { QuoteAdminAuthModal } from '@/components/quote/QuoteAdminAuthModal';
import { QuoteAdminTabs, type QuoteAdminTab } from './_components/QuoteAdminTabs';
import AddActionDropdown from './_components/AddActionDropdown';
import type { OrganizationInput } from '@/lib/quote/organization-types';
import type { OrgStatus, SalesPipelineEntry } from '@/lib/quote/pipeline-types';
import { formatValue } from '@/lib/quote/utils';
import {
  useQuoteOrganizations,
  useParentOrganizations,
  useUpdateOrganizationStatus,
  useCreateOrganization,
  useUpdateOrganization,
  useBulkUpdateOrganizations,
  quoteOrganizationsKeys,
} from '@/hooks/useQuoteOrganizations';

// Lazy load tab components
const PipelineTab = lazy(() => import('./_components/tabs/PipelineTab'));
const ImportTab = lazy(() => import('./_components/tabs/ImportTab'));

// Loading fallback for lazy-loaded tabs
function TabLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
    </div>
  );
}

function QuoteAdminContent() {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as QuoteAdminTab) || 'pipeline';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // React Query hooks
  const {
    data: orgsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuoteOrganizations({
    search: debouncedSearch,
    includeContacts: true,
    includeSubsidiaries: true,
    parentOnly: true,
  });

  const { data: parentOrgs = [] } = useParentOrganizations();
  const updateStatusMutation = useUpdateOrganizationStatus();
  const createOrgMutation = useCreateOrganization();
  const updateOrgMutation = useUpdateOrganization();
  const bulkUpdateMutation = useBulkUpdateOrganizations();

  const organizations = orgsData?.data || [];
  const stats = orgsData?.stats || null;
  const loading = isLoading || isFetching;

  const handleStatusChange = async (orgId: string, newStatus: OrgStatus) => {
    updateStatusMutation.mutate({ id: orgId, status: newStatus });
  };

  const handleSaveOrg = async (formData: OrganizationInput, orgId?: string) => {
    if (orgId) {
      await updateOrgMutation.mutateAsync({ id: orgId, updates: formData });
    } else {
      await createOrgMutation.mutateAsync(formData);
    }
  };

  const handleImport = async (importEntries: Partial<SalesPipelineEntry>[]) => {
    const response = await fetch('/api/quote/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: importEntries, created_by: 'admin' }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Import failed');
    queryClient.invalidateQueries({ queryKey: quoteOrganizationsKeys.all });
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleUpdateOrg = async (orgId: string, updates: Partial<OrganizationInput>) => {
    await updateOrgMutation.mutateAsync({ id: orgId, updates });
  };

  const handleBulkStatusChange = async (ids: string[], status: OrgStatus) => {
    await bulkUpdateMutation.mutateAsync({ ids, updates: { status } });
  };

  const totalValue = stats?.totalDealValue || 0;

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

          {/* Center - Search (only show on Pipeline tab) */}
          {activeTab === 'pipeline' && (
            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search organizations..."
                  className="w-full h-10 pl-11 pr-4 bg-neutral-100/80 border-0 rounded-full text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {/* Right */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="h-9 px-3 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <AddActionDropdown onRefresh={handleRefresh} parentOrgs={parentOrgs} />
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="bg-white border-b border-neutral-200/50">
        <div className="px-6 py-4 max-w-[2000px] mx-auto">
          <QuoteAdminTabs activeTab={activeTab} />
        </div>
      </div>

      {/* Main Content - Lazy loaded tabs */}
      <main className="px-6 py-6 max-w-[2000px] mx-auto">
        <Suspense fallback={<TabLoader />}>
          {activeTab === 'pipeline' && (
            <PipelineTab
              organizations={organizations}
              stats={stats}
              loading={isLoading}
              parentOrgs={parentOrgs}
              onStatusChange={handleStatusChange}
              onSaveOrg={handleSaveOrg}
              onUpdateOrg={handleUpdateOrg}
              onBulkStatusChange={handleBulkStatusChange}
              onRefresh={handleRefresh}
            />
          )}
          {activeTab === 'import' && (
            <ImportTab
              onImport={handleImport}
              onRefresh={handleRefresh}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
}

export default function QuoteAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setIsAuthenticated(isQuoteAdminAuthenticated());
    setAuthChecked(true);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setQuoteAdminAuthenticated();
    setIsAuthenticated(true);
  }, []);

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

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
      </div>
    }>
      <QuoteAdminContent />
    </Suspense>
  );
}
