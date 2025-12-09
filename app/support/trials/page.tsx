'use client';

import { useState, useEffect, useMemo, useRef, useCallback, useDeferredValue } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useQueryClient } from '@tanstack/react-query';
import { useTrialOrganizations, useInvalidateTrialOrganizations, useBulkUpdateTrialOrganizations, trialOrganizationsKeys, type OrgWithUsers } from '@/hooks/useTrialOrganizations';
import { useRealtimeTrialOrganizations, useRealtimeTrialUsers } from '@/hooks/useRealtimeTrialOrganizations';
import { usePrefetchTrialDetail } from '@/hooks/usePrefetchTrialDetail';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import toast from 'react-hot-toast';
import { format, differenceInDays, addDays, formatDistanceToNow } from 'date-fns';
import Papa from 'papaparse';
import Breadcrumbs from '@/components/Breadcrumbs';

// Lazy load modals for code splitting - they're only shown when triggered
const CreateOrganizationModal = dynamic(() => import('@/components/CreateOrganizationModal'), {
  loading: () => null, // Modal has its own loading state
});
const AddProspectModal = dynamic(() => import('@/components/trial/AddProspectModal'), {
  loading: () => null,
});
const BulkImportProspectsModal = dynamic(() => import('@/components/BulkImportProspectsModal'), {
  loading: () => null,
});
import NavalLoadingBar from '@/components/NavalLoadingBar';
import { SkeletonTrialGrid } from '@/components/skeletons';
import { TrialProgressBar } from '@/components/TrialProgressBar';
import { TrialCard } from '@/components/trials/TrialCard';
import { BatchEnrichmentModal } from '@/components/enrichment';
import { Sparkles } from 'lucide-react';
import { VirtualizedTrialGrid } from '@/components/trials/VirtualizedTrialGrid';
import { showTrialUpdatedToast, showBulkActionToast, showExportSuccessToast } from '@/utils/navalToasts';
import { createAccountManagerMap, resolveAccountManagerName, getInitials } from '@/lib/utils/accountManagerUtils';
import { authenticatedFetch } from '@/lib/api-client';
import { FormInput, FormSelect } from '@/components/forms';
import type { SelectOption } from '@/components/forms';
import { ORG_LIFECYCLE_STAGES } from '@/lib/validation/schemas/trialOrganization';
import {
  getActivityStatus,
  getRecencyMetrics,
  formatLastActivity,
  getDaysUntilExpiry,
  isExpiringSoon,
  getCompletenessStatus,
  type ActivityStatus,
} from '@/lib/trial-org-recency';
import QuickActivityLog from '@/components/trial/QuickActivityLog';
import { TrialTabs, useTrialTab, type TrialTabType } from '@/components/trial/TrialTabs';
import { ProspectsList } from '@/components/trial/ProspectsList';
import { ProspectKanban } from '@/components/trial/ProspectKanban';

// Lazy load bulk modals - only loaded when bulk actions are triggered
const BulkActivityLog = dynamic(() => import('@/components/trial/BulkActivityLog'), {
  loading: () => null,
});
const ActivityExport = dynamic(() => import('@/components/trial/ActivityExport'), {
  loading: () => null,
});
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePagePerformance } from '@/lib/hooks/usePagePerformance';
import { EngagementTierIcon } from '@/components/trials/EngagementTierBadge';

type TrialOrg = Database['public']['Tables']['trial_organizations']['Row'];
type TrialUser = Database['public']['Tables']['trial_users']['Row'];

const ITEMS_PER_PAGE = 50;

export default function TrialOrganizationsPage() {
  // Track page performance
  usePagePerformance('trials');

  const { user, loading: authLoading, signOut, role, parent_company, is_super_admin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab navigation for prospect lifecycle
  const activeTab = useTrialTab();

  // Initialize filters from URL params for persistence
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [stageFilter, setStageFilter] = useState<string>(searchParams.get('stage') || 'all');
  const [companyFilter, setCompanyFilter] = useState<string>(searchParams.get('company') || 'all');
  const [accountManagerFilter, setAccountManagerFilter] = useState<string>(searchParams.get('am') || 'all');
  const [trialStatusFilter, setTrialStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [activityFilter, setActivityFilter] = useState<string>(searchParams.get('activity') || 'all');
  const [expiryFilter, setExpiryFilter] = useState<string>(searchParams.get('expiry') || 'all');
  const [completenessFilter, setCompletenessFilter] = useState<string>(searchParams.get('completeness') || 'all');
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [showAddProspectModal, setShowAddProspectModal] = useState(false);
  const [showBulkImportProspectsModal, setShowBulkImportProspectsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('order') as 'asc' | 'desc') || 'desc');

  // Search input ref for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search query for better performance (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useKeyboardShortcuts([
    {
      key: 'k',
      metaKey: true,
      callback: () => searchInputRef.current?.focus(),
      description: 'Focus search input',
    },
    {
      key: 'k',
      ctrlKey: true,
      callback: () => searchInputRef.current?.focus(),
      description: 'Focus search input',
    },
  ]);

  // Bulk operations state
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());
  const [showBulkAccountManagerModal, setShowBulkAccountManagerModal] = useState(false);
  const [showBulkTrialDatesModal, setShowBulkTrialDatesModal] = useState(false);
  const [showBulkStageModal, setShowBulkStageModal] = useState(false);
  const [showBulkTrialStatusModal, setShowBulkTrialStatusModal] = useState(false);
  const [showBulkTrialExtensionModal, setShowBulkTrialExtensionModal] = useState(false);
  const [showBulkActivityLogModal, setShowBulkActivityLogModal] = useState(false);
  const [showActivityExportModal, setShowActivityExportModal] = useState(false);
  const [showBatchEnrichmentModal, setShowBatchEnrichmentModal] = useState(false);
  const [exportSelectedOnly, setExportSelectedOnly] = useState(false);
  const [showQuickEditPanel, setShowQuickEditPanel] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Bulk operation form states
  const [bulkAccountManager, setBulkAccountManager] = useState('');
  const [bulkAccountManagerOther, setBulkAccountManagerOther] = useState('');
  const [bulkTrialStartDate, setBulkTrialStartDate] = useState('');
  const [bulkTrialEndDate, setBulkTrialEndDate] = useState('');
  const [onlyUpdateMissingDates, setOnlyUpdateMissingDates] = useState(false);
  const [bulkStage, setBulkStage] = useState<string>('');
  const [bulkTrialStatus, setBulkTrialStatus] = useState<string>('');
  const [extensionDays, setExtensionDays] = useState<number>(7);
  const [accountManagers, setAccountManagers] = useState<Array<{ user_id: string; email: string; full_name: string | null }>>([]);

  // View mode for prospects tab (list or kanban)
  const [prospectViewMode, setProspectViewMode] = useState<'list' | 'kanban'>('kanban');

  const supabase = createClient();

  // React Query hooks for data management
  const queryClient = useQueryClient();
  const bulkUpdateMutation = useBulkUpdateTrialOrganizations();
  const invalidateTrialOrgs = useInvalidateTrialOrganizations();

  // Helper function for optimistic updates using React Query cache
  const updateCacheOptimistically = useCallback((
    orgIds: Set<string> | string[],
    updates: Partial<OrgWithUsers>
  ) => {
    const idSet = orgIds instanceof Set ? orgIds : new Set(orgIds);
    queryClient.setQueriesData(
      { queryKey: trialOrganizationsKeys.lists() },
      (old: { organizations: OrgWithUsers[]; totalCount: number } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          organizations: old.organizations.map((org) =>
            idSet.has(org.org_id) ? { ...org, ...updates } : org
          ),
        };
      }
    );
  }, [queryClient]);

  // React Query hook for fetching trial organizations with automatic caching
  const queryFilters = useMemo(() => ({
    sortBy,
    sortOrder,
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
    is_super_admin,
    parent_company,
  }), [sortBy, sortOrder, currentPage, is_super_admin, parent_company]);

  const {
    data: queryData,
    isLoading: loading,
    error: queryError,
  } = useTrialOrganizations(queryFilters);

  // Derived state from React Query
  const organizations = queryData?.organizations ?? [];
  const totalCount = queryData?.totalCount ?? 0;

  // Prefetch detail page data on card hover for instant navigation
  const prefetchTrialDetail = usePrefetchTrialDetail();

  // Enable real-time updates - automatically refreshes when database changes
  useRealtimeTrialOrganizations(true);
  useRealtimeTrialUsers(true); // User changes affect org user counts

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchAccountManagers();
    }
  }, [user]); // Only fetch account managers once

  // Update trial end date when start date changes
  useEffect(() => {
    if (bulkTrialStartDate) {
      const endDate = addDays(new Date(bulkTrialStartDate), 14);
      setBulkTrialEndDate(format(endDate, 'yyyy-MM-dd'));
    }
  }, [bulkTrialStartDate]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, stageFilter, companyFilter, accountManagerFilter, trialStatusFilter, activityFilter, expiryFilter, completenessFilter]);

  // Update URL params when filters change (for bookmarking/sharing)
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (stageFilter !== 'all') params.set('stage', stageFilter);
    if (companyFilter !== 'all') params.set('company', companyFilter);
    if (accountManagerFilter !== 'all') params.set('am', accountManagerFilter);
    if (trialStatusFilter !== 'all') params.set('status', trialStatusFilter);
    if (activityFilter !== 'all') params.set('activity', activityFilter);
    if (expiryFilter !== 'all') params.set('expiry', expiryFilter);
    if (completenessFilter !== 'all') params.set('completeness', completenessFilter);
    if (currentPage > 1) params.set('page', String(currentPage));
    if (sortBy !== 'created_at') params.set('sort', sortBy);
    if (sortOrder !== 'desc') params.set('order', sortOrder);

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [searchQuery, stageFilter, companyFilter, accountManagerFilter, trialStatusFilter, activityFilter, expiryFilter, completenessFilter, currentPage, sortBy, sortOrder]);

  const fetchAccountManagers = async () => {
    try {
      // Fetch from API to bypass RLS issues (with authentication)
      const response = await authenticatedFetch('/api/account-managers');
      const { managers } = await response.json();

      if (!managers) {
        setAccountManagers([]);
        return;
      }

      setAccountManagers(managers);
    } catch (error: any) {
      console.error('Error fetching account managers:', error);
      setAccountManagers([]);
    }
  };

  // Calculate tab counts for the tabs UI (before other filters, using all organizations)
  const tabCounts = useMemo(() => {
    const counts = {
      prospects: 0,
      activeTrials: 0,
      pipeline: 0,
      customers: 0,
    };

    for (const org of organizations) {
      // Type assertion for new fields (will exist after migration)
      const isProspect = (org as any).is_prospect === true;
      const dealOutcome = (org as any).deal_outcome;
      const trialStatus = org.trial_status;

      if (isProspect) {
        counts.prospects++;
      } else if (dealOutcome === 'won') {
        counts.customers++;
      } else if (['ended', 'expired'].includes(trialStatus || '')) {
        counts.pipeline++;
      } else if (['active', 'pending', 'paused'].includes(trialStatus || '')) {
        counts.activeTrials++;
      }
    }

    return counts;
  }, [organizations]);

  // Memoized filtering logic
  const filteredOrgs = useMemo(() => {
    let filtered = [...organizations];

    // Tab filter (prospect lifecycle) - applied first
    if (activeTab === 'prospects') {
      filtered = filtered.filter((org) => (org as any).is_prospect === true);
    } else if (activeTab === 'active_trials') {
      filtered = filtered.filter((org) =>
        (org as any).is_prospect !== true &&
        ['active', 'pending', 'paused'].includes(org.trial_status || '')
      );
    } else if (activeTab === 'pipeline') {
      filtered = filtered.filter((org) =>
        (org as any).is_prospect !== true &&
        !(org as any).deal_outcome &&
        ['ended', 'expired'].includes(org.trial_status || '')
      );
    } else if (activeTab === 'customers') {
      filtered = filtered.filter((org) =>
        (org as any).is_prospect !== true &&
        (org as any).deal_outcome === 'won'
      );
    }

    // Search filter (using debounced query)
    if (debouncedSearchQuery) {
      filtered = filtered.filter(
        (org) =>
          org.org_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          org.account_manager?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          org.domain?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    // Stage filter
    if (stageFilter !== 'all') {
      filtered = filtered.filter((org) => org.org_lifecycle_stage === stageFilter);
    }

    // Company filter
    if (companyFilter !== 'all') {
      filtered = filtered.filter((org) => org.parent_company === companyFilter);
    }

    // Account Manager filter
    if (accountManagerFilter !== 'all') {
      filtered = filtered.filter((org) => org.account_manager === accountManagerFilter);
    }

    // Trial Status filter
    if (trialStatusFilter !== 'all') {
      filtered = filtered.filter((org) => org.trial_status === trialStatusFilter);
    }

    // Activity filter (based on last_activity_at)
    if (activityFilter !== 'all') {
      filtered = filtered.filter((org) => {
        const activityStatus = getActivityStatus(org.last_activity_at);
        return activityStatus === activityFilter;
      });
    }

    // Expiry filter
    if (expiryFilter !== 'all') {
      filtered = filtered.filter((org) => {
        if (expiryFilter === 'expiring_soon') {
          return isExpiringSoon(org.trial_end_date, 7);
        } else if (expiryFilter === 'expiring_14days') {
          return isExpiringSoon(org.trial_end_date, 14);
        } else if (expiryFilter === 'expiring_30days') {
          return isExpiringSoon(org.trial_end_date, 30);
        }
        return true;
      });
    }

    // Completeness filter (data quality)
    if (completenessFilter !== 'all') {
      filtered = filtered.filter((org) => {
        const status = getCompletenessStatus(org.completeness_score || 0);
        return status === completenessFilter;
      });
    }

    return filtered;
  }, [organizations, activeTab, debouncedSearchQuery, stageFilter, companyFilter, accountManagerFilter, trialStatusFilter, activityFilter, expiryFilter, completenessFilter]);

  // Defer filtered results to keep UI responsive during heavy filtering
  const deferredFilteredOrgs = useDeferredValue(filteredOrgs);
  const isFiltering = deferredFilteredOrgs !== filteredOrgs;

  // Server-side pagination - just return filtered orgs (already paginated by server)
  const paginatedOrgs = useMemo(() => {
    return deferredFilteredOrgs; // No client-side slicing - already paginated by Supabase
  }, [deferredFilteredOrgs]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE); // Use totalCount from server

  // Bulk operations handlers
  const handleSelectAll = () => {
    if (selectedOrgIds.size === filteredOrgs.length) {
      setSelectedOrgIds(new Set());
    } else {
      setSelectedOrgIds(new Set(filteredOrgs.map((org) => org.org_id)));
    }
  };

  const handleSelectOrg = (orgId: string) => {
    const newSelected = new Set(selectedOrgIds);
    if (newSelected.has(orgId)) {
      newSelected.delete(orgId);
    } else {
      newSelected.add(orgId);
    }
    setSelectedOrgIds(newSelected);
  };

  const handleBulkAssignAccountManager = async () => {
    if (!bulkAccountManager) {
      toast.error('Please select an account manager');
      return;
    }

    const selectedManager = accountManagers.find(m => m.user_id === bulkAccountManager);
    if (!selectedManager) {
      toast.error('Selected account manager not found');
      return;
    }

    const orgIdsArray = Array.from(selectedOrgIds);
    const updates = {
      account_manager: selectedManager.user_id,
      updated_at: new Date().toISOString(),
    };

    // Optimistic update using React Query cache
    updateCacheOptimistically(selectedOrgIds, updates);

    // Close modal and clear selection immediately for better UX
    setShowBulkAccountManagerModal(false);
    setBulkAccountManager('');
    setSelectedOrgIds(new Set());
    showBulkActionToast('Assigned account manager to', orgIdsArray.length);

    // Perform actual mutation in background
    try {
      const { error } = await supabase
        .from('trial_organizations')
        .update(updates)
        .in('org_id', orgIdsArray);

      if (error) {
        // Refetch to get correct state on error
        invalidateTrialOrgs();
        toast.error('Failed to update account managers');
        console.error('Error updating account managers:', error);
      }
    } catch (error: any) {
      // Refetch to get correct state on error
      invalidateTrialOrgs();
      toast.error('Failed to update account managers');
      console.error('Error updating account managers:', error);
    }
  };

  const handleBulkUpdateTrialDates = async () => {
    if (!bulkTrialStartDate || !bulkTrialEndDate) {
      toast.error('Please enter both start and end dates');
      return;
    }

    let orgsToUpdate = Array.from(selectedOrgIds);

    if (onlyUpdateMissingDates) {
      const orgsWithMissingDates = organizations.filter(
        (org) => selectedOrgIds.has(org.org_id) && (!org.trial_start_date || !org.trial_end_date)
      );
      orgsToUpdate = orgsWithMissingDates.map((org) => org.org_id);
    }

    if (orgsToUpdate.length === 0) {
      toast.error('No organizations need date updates');
      return;
    }

    const updates = {
      trial_start_date: bulkTrialStartDate,
      trial_end_date: bulkTrialEndDate,
    };

    // Optimistic update using React Query cache
    updateCacheOptimistically(orgsToUpdate, updates);

    // Close modal and clear state immediately
    setShowBulkTrialDatesModal(false);
    setBulkTrialStartDate('');
    setBulkTrialEndDate('');
    setOnlyUpdateMissingDates(false);
    setSelectedOrgIds(new Set());
    showBulkActionToast('Updated trial dates for', orgsToUpdate.length);

    // Perform actual mutation
    try {
      const { error } = await supabase
        .from('trial_organizations')
        .update(updates)
        .in('org_id', orgsToUpdate);

      if (error) {
        invalidateTrialOrgs();
        toast.error('Failed to update trial dates');
        console.error('Error updating trial dates:', error);
      }
    } catch (error: any) {
      invalidateTrialOrgs();
      toast.error('Failed to update trial dates');
      console.error('Error updating trial dates:', error);
    }
  };

  const handleBulkChangeStage = async () => {
    if (!bulkStage) {
      toast.error('Please select a stage');
      return;
    }

    const orgIdsArray = Array.from(selectedOrgIds);
    const updates = { org_lifecycle_stage: bulkStage as any };

    // Optimistic update using React Query cache
    updateCacheOptimistically(selectedOrgIds, updates);

    // Close modal and clear state immediately
    setShowBulkStageModal(false);
    setBulkStage('');
    setSelectedOrgIds(new Set());
    showBulkActionToast('Changed stage for', orgIdsArray.length);

    // Perform actual mutation
    try {
      const { error } = await supabase
        .from('trial_organizations')
        .update(updates)
        .in('org_id', orgIdsArray);

      if (error) {
        invalidateTrialOrgs();
        toast.error('Failed to update stage');
        console.error('Error updating stage:', error);
      }
    } catch (error: any) {
      invalidateTrialOrgs();
      toast.error('Failed to update stage');
      console.error('Error updating stage:', error);
    }
  };

  const handleBulkChangeTrialStatus = async () => {
    if (!bulkTrialStatus) {
      toast.error('Please select a trial status');
      return;
    }

    const orgIdsArray = Array.from(selectedOrgIds);
    const updates = { trial_status: bulkTrialStatus };

    // Optimistic update using React Query cache
    updateCacheOptimistically(selectedOrgIds, updates);

    // Close modal and clear state immediately
    setShowBulkTrialStatusModal(false);
    setBulkTrialStatus('');
    setSelectedOrgIds(new Set());
    showBulkActionToast('Changed trial status for', orgIdsArray.length);

    // Perform actual mutation
    try {
      const { error } = await supabase
        .from('trial_organizations')
        .update(updates)
        .in('org_id', orgIdsArray);

      if (error) {
        invalidateTrialOrgs();
        toast.error('Failed to update trial status');
        console.error('Error updating trial status:', error);
      }
    } catch (error: any) {
      invalidateTrialOrgs();
      toast.error('Failed to update trial status');
      console.error('Error updating trial status:', error);
    }
  };

  const handleBulkExtendTrial = async () => {
    if (!extensionDays || extensionDays <= 0) {
      toast.error('Please enter a valid number of days');
      return;
    }

    // Get selected organizations with current trial_end_date
    const orgsToExtend = organizations.filter((org) => selectedOrgIds.has(org.org_id));
    const orgsWithEndDate = orgsToExtend.filter((org) => org.trial_end_date);

    if (orgsWithEndDate.length === 0) {
      toast.error('None of the selected organizations have trial end dates');
      return;
    }

    // Calculate new end dates for each org
    const orgUpdates = orgsWithEndDate.map(org => {
      const currentEndDate = new Date(org.trial_end_date!);
      const newEndDate = addDays(currentEndDate, extensionDays);
      return {
        org_id: org.org_id,
        trial_end_date: format(newEndDate, 'yyyy-MM-dd'),
      };
    });

    // Optimistic update using React Query cache - update each org's trial_end_date
    const updatesMap = new Map(orgUpdates.map(u => [u.org_id, u.trial_end_date]));
    queryClient.setQueriesData(
      { queryKey: trialOrganizationsKeys.lists() },
      (old: { organizations: OrgWithUsers[]; totalCount: number } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          organizations: old.organizations.map((org) => {
            const newEndDate = updatesMap.get(org.org_id);
            return newEndDate ? { ...org, trial_end_date: newEndDate } : org;
          }),
        };
      }
    );

    // Close modal and clear state immediately
    const countExtended = orgsWithEndDate.length;
    setShowBulkTrialExtensionModal(false);
    setExtensionDays(7);
    setSelectedOrgIds(new Set());
    showBulkActionToast(`Extended trial by ${extensionDays} days for`, countExtended);

    // Perform actual mutations
    try {
      const updatePromises = orgUpdates.map(update =>
        supabase
          .from('trial_organizations')
          .update({ trial_end_date: update.trial_end_date, updated_at: new Date().toISOString() })
          .eq('org_id', update.org_id)
      );

      const results = await Promise.all(updatePromises);
      const hasError = results.some(r => r.error);

      if (hasError) {
        invalidateTrialOrgs();
        toast.error('Failed to extend some trials');
        console.error('Error extending trials:', results.filter(r => r.error));
      }
    } catch (error: any) {
      invalidateTrialOrgs();
      toast.error('Failed to extend trial');
      console.error('Error extending trial:', error);
    }
  };

  const handleExportCSV = () => {
    const selectedOrgs = organizations.filter((org) => selectedOrgIds.has(org.org_id));

    const csvData = selectedOrgs.map((org) => ({
      'Org Name': org.org_name,
      'Domain': org.domain || '',
      'Account Manager': resolveAccountManagerName(org.account_manager, new Map()) || '',
      'Stage': formatStage(org.org_lifecycle_stage),
      'Trial Start': org.trial_start_date ? format(new Date(org.trial_start_date), 'yyyy-MM-dd') : '',
      'Trial End': org.trial_end_date ? format(new Date(org.trial_end_date), 'yyyy-MM-dd') : '',
      'Engagement Score': org.engagement_score,
      'Total Users': org.user_count,
      'Active Users': org.active_users,
      'Last Activity': org.last_activity_date ? format(new Date(org.last_activity_date), 'yyyy-MM-dd') : '',
      'Comments': org.comments || '',
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `trials-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showExportSuccessToast({ customMessage: `Exported ${selectedOrgs.length} trial organizations` });
  };

  // Calculate metrics
  const activeTrials = organizations.filter((org) => org.org_lifecycle_stage === 'trial_active').length;
  const hotLeads = organizations.filter((org) => org.engagement_score > 75).length;
  const atRisk = organizations.filter((org) => org.engagement_score < 30 && org.org_lifecycle_stage === 'trial_active').length;

  const getDaysLeft = (endDate: string | null) => {
    if (!endDate) return null;
    const days = differenceInDays(new Date(endDate), new Date());
    return days > 0 ? days : 0;
  };

  const getEngagementColor = (score: number) => {
    if (score >= 60) return 'text-green-600 bg-green-50';
    if (score >= 30) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'trial_active': return 'text-blue-600 bg-blue-50';
      case 'demo_scheduled': return 'text-accent-600 bg-accent-50';
      case 'converted': return 'text-green-600 bg-green-50';
      case 'churned': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatStage = (stage: string) => {
    return stage.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const isBackwardStageChange = (newStage: string) => {
    const stageOrder = ['prospect', 'demo_scheduled', 'trial_active', 'converted'];
    const selectedOrgs = organizations.filter((org) => selectedOrgIds.has(org.org_id));
    return selectedOrgs.some((org) => {
      const currentIndex = stageOrder.indexOf(org.org_lifecycle_stage);
      const newIndex = stageOrder.indexOf(newStage);
      return currentIndex > newIndex && currentIndex !== -1 && newIndex !== -1;
    });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Naval Loading Bar */}
      <NavalLoadingBar isLoading={loading || bulkProcessing} context="trials" />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-8 py-4 shadow-sm sticky top-0 z-10">
          <Breadcrumbs items={[
            { label: 'Dashboard', href: '/support/dashboard' },
            { label: 'Trial Organizations' }
          ]} />
          <div className="flex items-center justify-between mt-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Trial Organizations</h2>
              <p className="text-xs text-gray-600 mt-0.5">Manage and track trial organizations</p>
            </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/support/trials/bulk-edit')}
              className="flex items-center gap-2 h-9 px-4 bg-green-700 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span>Bulk Edit All</span>
            </button>
            <button
              onClick={() => {
                setExportSelectedOnly(false);
                setShowActivityExportModal(true);
              }}
              className="flex items-center gap-2 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export Activities</span>
            </button>
            {selectedOrgIds.size > 0 && (
              <button
                onClick={() => setShowQuickEditPanel(true)}
                className="flex items-center gap-2 h-9 px-4 bg-accent-800 hover:bg-purple-900 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Quick Edit ({selectedOrgIds.size})</span>
              </button>
            )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {loading ? (
            <SkeletonTrialGrid count={6} />
          ) : (
            <>
              {/* Tab Navigation for Prospect Lifecycle */}
              <TrialTabs activeTab={activeTab} counts={tabCounts} />

              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 hover:shadow-xl hover:shadow-gray-900/5 transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Active Trials</p>
                      <p className="text-3xl font-bold text-gray-900">{activeTrials}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 hover:shadow-xl hover:shadow-gray-900/5 transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Hot Leads</p>
                      <p className="text-3xl font-bold text-gray-900">{hotLeads}</p>
                      <p className="text-xs text-gray-600 mt-1">Engagement &gt; 75%</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 hover:shadow-xl hover:shadow-gray-900/5 transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">At Risk</p>
                      <p className="text-3xl font-bold text-gray-900">{atRisk}</p>
                      <p className="text-xs text-gray-600 mt-1">Engagement &lt; 30%</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Capture - Space Optimized */}
              <div className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Paste & Extract - HERO FEATURE */}
                  <button
                    onClick={() => router.push('/support/trials/parse')}
                    className="group relative sm:col-span-2 flex items-center gap-4 p-5 rounded-xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 hover:border-purple-400 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-left overflow-hidden"
                  >
                    {/* Animated background sparkles */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 via-blue-100/20 to-indigo-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative p-3 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg group-hover:shadow-purple-500/50 transition-shadow duration-300">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>

                    <div className="relative flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-bold text-gray-900">Paste & Extract</h4>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full shadow-sm animate-pulse">NEW</span>
                      </div>
                      <p className="text-xs text-gray-700 font-medium">Copy emails or notes - auto-extracts all trial data</p>
                      <p className="text-[11px] text-purple-600 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Save 10+ minutes per trial
                      </p>
                    </div>

                    <svg className="relative w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Add New Trial - Primary Action */}
                  <button
                    onClick={() => setShowCreateOrgModal(true)}
                    className="group relative flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left"
                  >
                    <div className="p-2 rounded-lg bg-blue-600 text-white">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 mb-0.5">Add New Trial</h4>
                      <p className="text-xs text-gray-600">Quick modal form</p>
                    </div>
                    <svg className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Bulk Edit - Admin Only */}
                  {(role === 'Admin' || is_super_admin) && selectedOrgIds.size > 0 && (
                    <button
                      onClick={() => setShowQuickEditPanel(true)}
                      className="group relative flex items-center gap-3 p-4 rounded-xl border border-green-200 bg-green-50 hover:border-green-300 hover:shadow-sm transition-all duration-200 text-left"
                    >
                      <div className="p-2 rounded-lg bg-green-100 text-green-700 group-hover:bg-green-200 transition-colors duration-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-semibold text-gray-900">Bulk Edit</h4>
                          <span className="text-[10px] font-bold text-green-700 bg-green-200 px-1.5 py-0.5 rounded">{selectedOrgIds.size}</span>
                        </div>
                        <p className="text-xs text-gray-600">Update selected trials</p>
                      </div>
                      <svg className="w-4 h-4 text-green-600 group-hover:translate-x-0.5 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-4 mb-6">
                {/* First Row - Search and Primary Filters */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search organizations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search organizations"
                      className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    aria-label="Filter by stage"
                    className="h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Stages</option>
                    <option value="prospect">Prospect</option>
                    <option value="demo_scheduled">Demo Scheduled</option>
                    <option value="trial_active">Trial Active</option>
                    <option value="converted">Converted</option>
                    <option value="churned">Churned</option>
                  </select>
                  {is_super_admin && (
                    <select
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      aria-label="Filter by company"
                      className="h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Companies</option>
                      <option value="Mordor Intelligence">MI - Mordor Intelligence</option>
                      <option value="GMI">GMI</option>
                    </select>
                  )}
                </div>

                {/* Sort Control */}
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</label>
                  <select
                    id="sort-select"
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field);
                      setSortOrder(order as 'asc' | 'desc');
                    }}
                    className="h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="created_at-desc">Newest First</option>
                    <option value="created_at-asc">Oldest First</option>
                    <option value="org_name-asc">Name (A-Z)</option>
                    <option value="org_name-desc">Name (Z-A)</option>
                    <option value="trial_end_date-asc">Trial Expiry (Soonest)</option>
                    <option value="trial_end_date-desc">Trial Expiry (Latest)</option>
                    <option value="last_activity_at-desc">Recently Active</option>
                    <option value="last_activity_at-asc">Least Active</option>
                    <option value="completeness_score-desc">Completeness (High-Low)</option>
                    <option value="completeness_score-asc">Completeness (Low-High)</option>
                  </select>
                </div>
              </div>

                {/* Second Row - Advanced Filters */}
                <div className="flex items-center gap-4">
                  <select
                    value={accountManagerFilter}
                    onChange={(e) => setAccountManagerFilter(e.target.value)}
                    aria-label="Filter by account manager"
                    className="h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Account Managers</option>
                    {accountManagers.map((am) => (
                      <option key={am.user_id} value={am.user_id}>
                        {am.full_name || am.email}
                      </option>
                    ))}
                  </select>
                  <select
                    value={trialStatusFilter}
                    onChange={(e) => setTrialStatusFilter(e.target.value)}
                    aria-label="Filter by trial status"
                    className="h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Trial Statuses</option>
                    <option value="requested">Requested</option>
                    <option value="approved">Approved</option>
                    <option value="active">Active</option>
                    <option value="extended">Extended</option>
                    <option value="expired">Expired</option>
                    <option value="converted">Converted</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value)}
                    aria-label="Filter by activity level"
                    className="h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Activity Levels</option>
                    <option value="active">Active (&lt;7 days)</option>
                    <option value="quiet">Quiet (7-14 days)</option>
                    <option value="stale">Stale (14-30 days)</option>
                    <option value="dormant">Dormant (30+ days)</option>
                    <option value="never_active">No Activity</option>
                  </select>
                  <select
                    value={expiryFilter}
                    onChange={(e) => setExpiryFilter(e.target.value)}
                    aria-label="Filter by expiry date"
                    className="h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Expiry Dates</option>
                    <option value="expiring_soon">Expiring in 7 days</option>
                    <option value="expiring_14days">Expiring in 14 days</option>
                    <option value="expiring_30days">Expiring in 30 days</option>
                  </select>
                  <select
                    value={completenessFilter}
                    onChange={(e) => setCompletenessFilter(e.target.value)}
                    aria-label="Filter by data completeness"
                    className="h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Data Quality</option>
                    <option value="complete">Complete (70%+)</option>
                    <option value="partial">Partial (40-69%)</option>
                    <option value="incomplete">Incomplete (&lt;40%)</option>
                  </select>

                  {/* Add Prospect Button & View Mode Toggle - Only for Prospects Tab */}
                  {activeTab === 'prospects' && (
                    <div className="flex items-center gap-3 ml-auto">
                      <button
                        onClick={() => setShowAddProspectModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Prospect
                      </button>
                      <button
                        onClick={() => setShowBulkImportProspectsModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-300 shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import CSV
                      </button>
                      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setProspectViewMode('kanban')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                          prospectViewMode === 'kanban'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Kanban View"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                        Kanban
                      </button>
                      <button
                        onClick={() => setProspectViewMode('list')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                          prospectViewMode === 'list'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="List View"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        List
                      </button>
                      </div>
                    </div>
                  )}
                </div>

              {/* Organizations Card Grid - Modern & Engaging */}
              {filteredOrgs.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-12 text-center animate-fade-in">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                    <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {searchQuery || stageFilter !== 'all' || accountManagerFilter !== 'all' || activityFilter !== 'all'
                      ? "No organizations found"
                      : role?.toLowerCase() === 'account_manager'
                        ? "No trials assigned yet"
                        : "No organizations found"
                    }
                  </h3>
                  <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                    {searchQuery || stageFilter !== 'all' || accountManagerFilter !== 'all' || activityFilter !== 'all' ?
                      "No organizations match your current filters. Try adjusting your search or filter criteria." :
                      role?.toLowerCase() === 'account_manager' ?
                        "You don't have any trials assigned to you yet. Ask your admin to assign trials, or create a new one using Paste & Extract." :
                        "Get started by adding your first trial organization."
                    }
                  </p>
                  {(searchQuery || stageFilter !== 'all' || accountManagerFilter !== 'all' || activityFilter !== 'all' || completenessFilter !== 'all') ? (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStageFilter('all');
                        setAccountManagerFilter('all');
                        setActivityFilter('all');
                        setExpiryFilter('all');
                        setCompletenessFilter('all');
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Clear All Filters
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={() => router.push('/support/trials/parse')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Paste & Extract
                      </button>
                      <button
                        onClick={() => setShowCreateOrgModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-all duration-200 border border-gray-300"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Manual Entry
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                {/* Conditional rendering based on active tab */}
                {activeTab === 'prospects' ? (
                  // Prospects view with list/kanban toggle
                  prospectViewMode === 'kanban' ? (
                    <ProspectKanban
                      prospects={paginatedOrgs.map(org => ({
                        org_id: org.org_id,
                        org_name: org.org_name,
                        prospect_stage: org.prospect_stage || undefined,
                        prospect_source: org.prospect_source || undefined,
                        icp_fit_score: org.icp_fit_score || undefined,
                        created_at: org.created_at || new Date().toISOString(),
                        last_activity_at: org.last_activity_date,
                        account_manager: org.account_manager,
                        domain: org.org_domain,
                      }))}
                      onStageChange={async (orgId, newStage) => {
                        // OPTIMIZATION: Validate stage before update
                        const VALID_STAGES = ['cold_lead', 'contacted', 'responded', 'screening', 'demo_scheduled', 'demo_done', 'disqualified'];
                        if (!VALID_STAGES.includes(newStage)) {
                          toast.error('Invalid prospect stage');
                          return;
                        }
                        try {
                          const { error } = await supabase
                            .from('trial_organizations')
                            .update({ prospect_stage: newStage })
                            .eq('org_id', orgId);
                          if (error) throw error;
                          invalidateTrialOrgs();
                          toast.success(`Moved to ${newStage.replace(/_/g, ' ')}`);
                        } catch (err) {
                          toast.error('Failed to update stage');
                        }
                      }}
                      onQuickAction={async (action, orgId) => {
                        const org = paginatedOrgs.find(o => o.org_id === orgId);
                        const orgName = org?.org_name || '';

                        if (action === 'convert_to_trial') {
                          router.push(`/support/trials/${orgId}?action=convert`);
                          return;
                        }

                        if (action === 'add_note') {
                          router.push(`/support/trials/${orgId}`);
                          return;
                        }

                        let commandText = '';
                        if (action === 'log_outreach') {
                          commandText = `Log outreach email for ${orgName}`;
                        } else if (action === 'schedule_demo') {
                          commandText = `Schedule demo for ${orgName}`;
                        }

                        if (commandText) {
                          try {
                            const response = await fetch('/api/command/process', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                commands: [commandText],
                                auto_execute_high_confidence: true,
                                session_context: {
                                  focused_org_id: orgId,
                                  focused_org_name: orgName,
                                },
                              }),
                            });

                            if (response.ok) {
                              const data = await response.json();
                              if (data.results?.[0]?.executionResult?.success) {
                                toast.success(data.results[0].executionResult.summary || 'Action completed');
                                invalidateTrialOrgs();
                              } else {
                                toast.error('Action could not be completed');
                              }
                            }
                          } catch (err) {
                            toast.error('Failed to process action');
                          }
                        }
                      }}
                    />
                  ) : (
                    <ProspectsList
                      prospects={paginatedOrgs.map(org => ({
                        org_id: org.org_id,
                        org_name: org.org_name,
                        prospect_stage: org.prospect_stage || undefined,
                        prospect_source: org.prospect_source || undefined,
                        icp_fit_score: org.icp_fit_score || undefined,
                        created_at: org.created_at || new Date().toISOString(),
                        last_activity_at: org.last_activity_date,
                        account_manager: org.account_manager,
                        domain: org.org_domain,
                        description: org.comments, // Using comments as description
                      }))}
                      selectedIds={selectedOrgIds}
                      onSelectionChange={setSelectedOrgIds}
                      onQuickAction={async (action, orgId) => {
                        // Find the org name for command context
                        const org = paginatedOrgs.find(o => o.org_id === orgId);
                        const orgName = org?.org_name || '';

                        if (action === 'convert_to_trial') {
                          router.push(`/support/trials/${orgId}?action=convert`);
                          return;
                        }

                        if (action === 'create_prospect') {
                          setShowCreateOrgModal(true);
                          return;
                        }

                        // Map quick actions to command strings
                        let commandText = '';
                        if (action === 'log_outreach') {
                          commandText = `Log outreach email for ${orgName}`;
                        } else if (action === 'schedule_demo') {
                          commandText = `Schedule demo for ${orgName}`;
                        }

                        if (commandText) {
                          try {
                            const response = await fetch('/api/command/process', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                commands: [commandText],
                                auto_execute_high_confidence: true,
                                session_context: {
                                  focused_org_id: orgId,
                                  focused_org_name: orgName,
                                },
                              }),
                            });

                            if (response.ok) {
                              const data = await response.json();
                              if (data.results?.[0]?.executionResult?.success) {
                                toast.success(data.results[0].executionResult.summary || 'Action completed');
                                invalidateTrialOrgs();
                              } else {
                                toast.error('Action could not be completed');
                              }
                            } else {
                              toast.error('Failed to process action');
                            }
                          } catch (err) {
                            console.error('Quick action error:', err);
                            toast.error('Failed to process action');
                          }
                        }
                      }}
                    />
                  )
                ) : (
                  // Standard trial grid for other tabs
                  <VirtualizedTrialGrid
                    organizations={paginatedOrgs}
                    selectedOrgIds={selectedOrgIds}
                    onSelect={handleSelectOrg}
                    accountManagers={accountManagers}
                    formatStage={formatStage}
                    onActivityLogged={() => invalidateTrialOrgs()}
                    onPrefetch={prefetchTrialDetail}
                  />
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing {totalCount > 0 ? ((currentPage - 1) * ITEMS_PER_PAGE) + 1 : 0} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} organizations
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                  currentPage === page
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="px-2 text-gray-400">...</span>;
                          }
                          return null;
                        })}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* Bulk Action Bar */}
      {selectedOrgIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">{selectedOrgIds.size}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedOrgIds.size} organization{selectedOrgIds.size !== 1 ? 's' : ''} selected
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkAccountManagerModal(true)}
                  className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 hover:border-gray-400"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Assign Manager</span>
                </button>
                <button
                  onClick={() => setShowBulkTrialDatesModal(true)}
                  className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 hover:border-gray-400"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Update Dates</span>
                </button>
                <button
                  onClick={() => setShowBulkStageModal(true)}
                  className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 hover:border-gray-400"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <span>Change Stage</span>
                </button>
                <button
                  onClick={() => setShowBulkTrialStatusModal(true)}
                  className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 hover:border-gray-400"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Trial Status</span>
                </button>
                <button
                  onClick={() => setShowBulkTrialExtensionModal(true)}
                  className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 hover:border-gray-400"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Extend Trial</span>
                </button>
                <button
                  onClick={() => setShowBulkActivityLogModal(true)}
                  className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 hover:border-gray-400"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Log Activity</span>
                </button>
                <button
                  onClick={() => setShowBatchEnrichmentModal(true)}
                  className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Enrich Data</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 hover:border-gray-400"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setSelectedOrgIds(new Set())}
                  className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-red-50 text-gray-700 hover:text-red-600 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 hover:border-red-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Account Manager Modal */}
      {showBulkAccountManagerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Assign Account Manager</h3>
              <button
                onClick={() => setShowBulkAccountManagerModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <FormSelect
                label="Account Manager"
                required
                options={accountManagers.map((manager) => ({
                  value: manager.user_id,
                  label: `${manager.full_name || manager.email} (${manager.email})`,
                }))}
                value={bulkAccountManager}
                onChange={(e) => setBulkAccountManager(e.target.value)}
                placeholder="Select account manager..."
                helperText={`Assign an account manager to ${selectedOrgIds.size} selected organization${selectedOrgIds.size !== 1 ? 's' : ''}`}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkAccountManagerModal(false)}
                className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssignAccountManager}
                disabled={bulkProcessing || !bulkAccountManager}
                className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkProcessing ? 'Applying...' : `Apply to ${selectedOrgIds.size} org${selectedOrgIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Trial Dates Modal */}
      {showBulkTrialDatesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Update Trial Dates</h3>
              <button
                onClick={() => setShowBulkTrialDatesModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <FormInput
                label="Trial Start Date"
                type="date"
                required
                value={bulkTrialStartDate}
                onChange={(e) => setBulkTrialStartDate(e.target.value)}
                helperText="The trial period will start on this date"
              />

              <FormInput
                label="Trial End Date"
                type="date"
                required
                value={bulkTrialEndDate}
                onChange={(e) => setBulkTrialEndDate(e.target.value)}
                helperText="Auto-populated as 14 days from start date"
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="onlyMissing"
                  checked={onlyUpdateMissingDates}
                  onChange={(e) => setOnlyUpdateMissingDates(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="onlyMissing" className="text-sm text-gray-700">
                  Only update orgs with missing dates
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkTrialDatesModal(false)}
                className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpdateTrialDates}
                disabled={bulkProcessing || !bulkTrialStartDate || !bulkTrialEndDate}
                className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkProcessing ? 'Applying...' : `Apply to ${selectedOrgIds.size} org${selectedOrgIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Change Stage Modal */}
      {showBulkStageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Change Stage</h3>
              <button
                onClick={() => setShowBulkStageModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <FormSelect
                label="New Stage"
                required
                options={[
                  { value: 'prospect', label: 'Prospect' },
                  { value: 'demo_scheduled', label: 'Demo Scheduled' },
                  { value: 'trial_active', label: 'Trial Active' },
                  { value: 'converted', label: 'Converted' },
                  { value: 'churned', label: 'Churned' },
                ]}
                value={bulkStage}
                onChange={(e) => setBulkStage(e.target.value)}
                placeholder="Select stage..."
                helperText={`Change lifecycle stage for ${selectedOrgIds.size} selected organization${selectedOrgIds.size !== 1 ? 's' : ''}`}
              />

              {bulkStage && isBackwardStageChange(bulkStage) && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Warning: Backward Stage Change</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Some organizations will be moved to an earlier stage. This is unusual and may need review.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkStageModal(false)}
                className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkChangeStage}
                disabled={bulkProcessing || !bulkStage}
                className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkProcessing ? 'Applying...' : `Apply to ${selectedOrgIds.size} org${selectedOrgIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Change Trial Status Modal */}
      {showBulkTrialStatusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Change Trial Status</h3>
              <button
                onClick={() => setShowBulkTrialStatusModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <FormSelect
                label="Trial Status"
                required
                options={[
                  { value: 'requested', label: 'Requested' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'active', label: 'Active' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'expired', label: 'Expired' },
                ]}
                value={bulkTrialStatus}
                onChange={(e) => setBulkTrialStatus(e.target.value)}
                placeholder="Select trial status..."
                helperText={`Update trial status for ${selectedOrgIds.size} selected organization${selectedOrgIds.size !== 1 ? 's' : ''}`}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkTrialStatusModal(false)}
                className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkChangeTrialStatus}
                disabled={bulkProcessing || !bulkTrialStatus}
                className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkProcessing ? 'Applying...' : `Apply to ${selectedOrgIds.size} org${selectedOrgIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Trial Extension Modal */}
      {showBulkTrialExtensionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Extend Trial Period</h3>
              <button
                onClick={() => setShowBulkTrialExtensionModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <FormInput
                label="Extension Days"
                type="number"
                required
                value={extensionDays.toString()}
                onChange={(e) => setExtensionDays(parseInt(e.target.value) || 0)}
                helperText={`Extend trial end date by this many days for ${selectedOrgIds.size} selected organization${selectedOrgIds.size !== 1 ? 's' : ''}`}
                min="1"
                max="365"
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Only organizations with existing trial end dates will be extended. Organizations without trial end dates will be skipped.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkTrialExtensionModal(false)}
                className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkExtendTrial}
                disabled={bulkProcessing || !extensionDays || extensionDays <= 0}
                className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkProcessing ? 'Applying...' : `Extend ${selectedOrgIds.size} org${selectedOrgIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Panel - Slide in from right */}
      {showQuickEditPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowQuickEditPanel(false)}
          />

          {/* Sliding Panel */}
          <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Quick Edit</h3>
                  <p className="text-xs text-gray-600">{selectedOrgIds.size} organizations selected</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickEditPanel(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Changes will be applied to all {selectedOrgIds.size} selected organizations
                </p>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Bulk Actions</h4>

                <button
                  onClick={() => setShowBulkAccountManagerModal(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 hover:border-purple-300 hover:bg-accent-50 rounded-lg transition-all group"
                >
                  <span className="text-sm font-medium text-gray-900">Assign Account Manager</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => setShowBulkTrialDatesModal(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 hover:border-purple-300 hover:bg-accent-50 rounded-lg transition-all group"
                >
                  <span className="text-sm font-medium text-gray-900">Update Trial Dates</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => setShowBulkStageModal(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 hover:border-purple-300 hover:bg-accent-50 rounded-lg transition-all group"
                >
                  <span className="text-sm font-medium text-gray-900">Change Stage</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => setShowBulkTrialStatusModal(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 hover:border-purple-300 hover:bg-accent-50 rounded-lg transition-all group"
                >
                  <span className="text-sm font-medium text-gray-900">Change Trial Status</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => setShowBulkTrialExtensionModal(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition-all group"
                >
                  <span className="text-sm font-medium text-gray-900">Extend Trial Period</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                <button
                  onClick={() => setShowBulkActivityLogModal(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-lg transition-all group"
                >
                  <span className="text-sm font-medium text-gray-900">Log Activity to All</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 rounded-lg transition-all group"
                >
                  <span className="text-sm font-medium text-gray-900">Export Orgs to CSV</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>

                <button
                  onClick={() => {
                    setExportSelectedOnly(true);
                    setShowActivityExportModal(true);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-lg transition-all group"
                >
                  <span className="text-sm font-medium text-gray-900">Export Activities Report</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button
                onClick={() => {
                  setSelectedOrgIds(new Set());
                  setShowQuickEditPanel(false);
                }}
                className="w-full h-10 px-4 bg-white hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg transition-all border border-gray-300"
              >
                Clear Selection & Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bulk Activity Log Modal */}
      {showBulkActivityLogModal && (
        <BulkActivityLog
          selectedOrgIds={selectedOrgIds}
          organizationNames={new Map(organizations.map(org => [org.org_id, org.org_name]))}
          onSuccess={() => {
            invalidateTrialOrgs();
            setSelectedOrgIds(new Set());
          }}
          onClose={() => setShowBulkActivityLogModal(false)}
        />
      )}

      {/* Batch Enrichment Modal */}
      {showBatchEnrichmentModal && (
        <BatchEnrichmentModal
          orgIds={Array.from(selectedOrgIds)}
          orgNames={new Map(organizations.map(org => [org.org_id, org.org_name]))}
          onClose={() => setShowBatchEnrichmentModal(false)}
          onComplete={() => {
            setShowBatchEnrichmentModal(false);
            setSelectedOrgIds(new Set());
            invalidateTrialOrgs();
          }}
        />
      )}

      {/* Activity Export Modal */}
      {showActivityExportModal && (
        <ActivityExport
          organizationIds={exportSelectedOnly ? Array.from(selectedOrgIds) : undefined}
          onClose={() => setShowActivityExportModal(false)}
        />
      )}

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={showCreateOrgModal}
        onClose={() => setShowCreateOrgModal(false)}
        onSuccess={invalidateTrialOrgs}
      />

      {/* Add Prospect Modal */}
      <AddProspectModal
        isOpen={showAddProspectModal}
        onClose={() => setShowAddProspectModal(false)}
        onSuccess={invalidateTrialOrgs}
      />

      {/* Bulk Import Prospects Modal */}
      <BulkImportProspectsModal
        isOpen={showBulkImportProspectsModal}
        onClose={() => setShowBulkImportProspectsModal(false)}
        onSuccess={invalidateTrialOrgs}
      />
    </div>
  );
}
