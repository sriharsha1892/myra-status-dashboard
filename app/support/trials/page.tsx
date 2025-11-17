'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import toast from 'react-hot-toast';
import { format, differenceInDays, addDays, formatDistanceToNow } from 'date-fns';
import Papa from 'papaparse';
import CreateOrganizationModal from '@/components/CreateOrganizationModal';
import Breadcrumbs from '@/components/Breadcrumbs';
import NavalLoadingBar from '@/components/NavalLoadingBar';
import { SkeletonCard } from '@/components/SkeletonCard';
import { TrialProgressBar } from '@/components/TrialProgressBar';
import { showTrialUpdatedToast, showBulkActionToast, showExportSuccessToast } from '@/utils/navalToasts';
import { createAccountManagerMap, resolveAccountManagerName, getInitials } from '@/lib/utils/accountManagerUtils';
import { authenticatedFetch } from '@/lib/api-client';

type TrialOrg = Database['public']['Tables']['trial_organizations']['Row'];
type TrialUser = Database['public']['Tables']['trial_users']['Row'];

interface OrgWithUsers extends TrialOrg {
  user_count: number;
  active_users: number;
}

const ITEMS_PER_PAGE = 50;

export default function TrialOrganizationsPage() {
  const { user, loading: authLoading, signOut, role, parent_company, is_super_admin } = useAuth();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrgWithUsers[]>([]);
  const [totalCount, setTotalCount] = useState(0); // Total count for pagination
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search query for better performance (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Bulk operations state
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());
  const [showBulkAccountManagerModal, setShowBulkAccountManagerModal] = useState(false);
  const [showBulkTrialDatesModal, setShowBulkTrialDatesModal] = useState(false);
  const [showBulkStageModal, setShowBulkStageModal] = useState(false);
  const [showQuickEditPanel, setShowQuickEditPanel] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Bulk operation form states
  const [bulkAccountManager, setBulkAccountManager] = useState('');
  const [bulkAccountManagerOther, setBulkAccountManagerOther] = useState('');
  const [bulkTrialStartDate, setBulkTrialStartDate] = useState('');
  const [bulkTrialEndDate, setBulkTrialEndDate] = useState('');
  const [onlyUpdateMissingDates, setOnlyUpdateMissingDates] = useState(false);
  const [bulkStage, setBulkStage] = useState<string>('');
  const [accountManagers, setAccountManagers] = useState<Array<{ user_id: string; email: string; full_name: string | null }>>([]);

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchOrganizations();
      fetchAccountManagers();
    }
  }, [user, currentPage]); // Re-fetch when page changes

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
  }, [debouncedSearchQuery, stageFilter, companyFilter]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      // Calculate range for server-side pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Build query with role-based filtering and join trial_users
      let query = supabase
        .from('trial_organizations')
        .select(`
          *,
          trial_users(current_stage)
        `, { count: 'exact' }); // Get total count for pagination

      // Account Managers can see all trials in their company (not just assigned ones)
      // No need to filter by account_manager_id

      // If not super admin: filter by parent company
      if (!is_super_admin && parent_company) {
        query = query.eq('parent_company', parent_company);
      }
      // If super admin: show all orgs (no company filter)

      const { data: orgs, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to); // SERVER-SIDE PAGINATION

      if (error) throw error;

      // Set total count for pagination controls
      setTotalCount(count || 0);

      // Process joined data
      // @ts-ignore - Supabase typing issue with dynamic columns
      const orgsWithUsers: OrgWithUsers[] = (orgs || []).map((org: any) => {
        const orgUsers = org.trial_users || [];
        return {
          ...org,
          user_count: orgUsers.length,
          active_users: orgUsers.filter((u: any) => u.current_stage === 'active').length,
          trial_users: undefined, // Remove the nested data to avoid confusion
        };
      });

      setOrganizations(orgsWithUsers);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

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

  // Memoized filtering logic
  const filteredOrgs = useMemo(() => {
    let filtered = [...organizations];

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

    return filtered;
  }, [organizations, debouncedSearchQuery, stageFilter, companyFilter]);

  // Server-side pagination - just return filtered orgs (already paginated by server)
  const paginatedOrgs = useMemo(() => {
    return filteredOrgs; // No client-side slicing - already paginated by Supabase
  }, [filteredOrgs]);

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
    setBulkProcessing(true);
    try {
      if (!bulkAccountManager) {
        toast.error('Please select an account manager');
        return;
      }

      // Find the selected manager's details
      const selectedManager = accountManagers.find(m => m.user_id === bulkAccountManager);

      if (!selectedManager) {
        toast.error('Selected account manager not found');
        return;
      }

      const managerDisplayName = selectedManager.full_name || selectedManager.email;

      console.log(`💾 Bulk updating ${selectedOrgIds.size} organizations with account manager:`, managerDisplayName);

      // Update account_manager field with user_id (UUID) so it can be resolved by the map
      const { error } = await supabase
        .from('trial_organizations')
        .update({
          account_manager: selectedManager.user_id,
          updated_at: new Date().toISOString(),
        })
        .in('org_id', Array.from(selectedOrgIds));

      if (error) throw error;

      showBulkActionToast('Assigned account manager to', selectedOrgIds.size);
      setShowBulkAccountManagerModal(false);
      setBulkAccountManager('');
      setSelectedOrgIds(new Set());
      await fetchOrganizations();
    } catch (error: any) {
      console.error('Error updating account managers:', error);
      toast.error('Failed to update account managers');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkUpdateTrialDates = async () => {
    setBulkProcessing(true);
    try {
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

      const { error } = await supabase
        .from('trial_organizations')
        // @ts-ignore - Supabase typing issue with dynamic columns
        .update({
          trial_start_date: bulkTrialStartDate,
          trial_end_date: bulkTrialEndDate,
        })
        .in('org_id', orgsToUpdate);

      if (error) throw error;

      showBulkActionToast('Updated trial dates for', orgsToUpdate.length);
      setShowBulkTrialDatesModal(false);
      setBulkTrialStartDate('');
      setBulkTrialEndDate('');
      setOnlyUpdateMissingDates(false);
      setSelectedOrgIds(new Set());
      await fetchOrganizations();
    } catch (error: any) {
      console.error('Error updating trial dates:', error);
      toast.error('Failed to update trial dates');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkChangeStage = async () => {
    setBulkProcessing(true);
    try {
      if (!bulkStage) {
        toast.error('Please select a stage');
        return;
      }

      const { error } = await supabase
        .from('trial_organizations')
        // @ts-ignore - Supabase typing issue with dynamic columns
        .update({ org_lifecycle_stage: bulkStage as any })
        .in('org_id', Array.from(selectedOrgIds));

      if (error) throw error;

      showBulkActionToast('Changed stage for', selectedOrgIds.size);
      setShowBulkStageModal(false);
      setBulkStage('');
      setSelectedOrgIds(new Set());
      await fetchOrganizations();
    } catch (error: any) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update stage');
    } finally {
      setBulkProcessing(false);
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
        <div className="text-sm text-gray-500">Loading...</div>
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
              <p className="text-xs text-gray-500 mt-0.5">Manage and track trial organizations</p>
            </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/support/trials/bulk-edit')}
              className="flex items-center gap-2 h-9 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span>Bulk Edit All</span>
            </button>
            {selectedOrgIds.size > 0 && (
              <button
                onClick={() => setShowQuickEditPanel(true)}
                className="flex items-center gap-2 h-9 px-4 bg-accent-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <>
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
                      <p className="text-xs text-gray-500 mt-1">Engagement &gt; 75%</p>
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
                      <p className="text-xs text-gray-500 mt-1">Engagement &lt; 30%</p>
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
                    onClick={() => router.push('/support/trials/new')}
                    className="group relative flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left"
                  >
                    <div className="p-2 rounded-lg bg-blue-600 text-white">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 mb-0.5">Add New Trial</h4>
                      <p className="text-xs text-gray-600">Guided form</p>
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
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search organizations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
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
                    className="h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Companies</option>
                    <option value="Mordor Intelligence">MI - Mordor Intelligence</option>
                    <option value="GMI">GMI</option>
                  </select>
                )}
              </div>

              {/* Organizations Card Grid - Modern & Engaging */}
              {filteredOrgs.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No organizations found</h3>
                  <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
                </div>
              ) : (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedOrgs.map((org) => {
                    const daysLeft = org.trial_end_date ? differenceInDays(new Date(org.trial_end_date), new Date()) : null;
                    const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
                    const isExpired = daysLeft !== null && daysLeft < 0;

                    // Get stage color for border accent
                    // Get stage gradient background
                    const getStageGradient = (stage: string) => {
                      switch (stage) {
                        case 'trial_active': return 'bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/80';
                        case 'trial_scheduled': return 'bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/80';
                        case 'trial_expired': return 'bg-gradient-to-br from-rose-50/80 via-white to-red-50/80';
                        case 'converted': return 'bg-gradient-to-br from-purple-50/80 via-white to-pink-50/80';
                        case 'not_converted': return 'bg-gradient-to-br from-gray-50/80 via-white to-slate-50/80';
                        default: return 'bg-gradient-to-br from-gray-50/80 via-white to-gray-50/80';
                      }
                    };

                    // Get stage shadow color
                    const getStageShadow = (stage: string) => {
                      switch (stage) {
                        case 'trial_active': return 'shadow-emerald-100/50 hover:shadow-emerald-200/50';
                        case 'trial_scheduled': return 'shadow-blue-100/50 hover:shadow-blue-200/50';
                        case 'trial_expired': return 'shadow-rose-100/50 hover:shadow-rose-200/50';
                        case 'converted': return 'shadow-purple-100/50 hover:shadow-purple-200/50';
                        case 'not_converted': return 'shadow-gray-100/50 hover:shadow-gray-200/50';
                        default: return 'shadow-gray-100/50 hover:shadow-gray-200/50';
                      }
                    };

                    // Get stage dot color
                    const getStageDotColor = (stage: string) => {
                      switch (stage) {
                        case 'trial_active': return 'bg-emerald-500';
                        case 'trial_scheduled': return 'bg-blue-500';
                        case 'trial_expired': return 'bg-rose-500';
                        case 'converted': return 'bg-purple-500';
                        case 'not_converted': return 'bg-gray-400';
                        default: return 'bg-gray-300';
                      }
                    };

                    return (
                      <div
                        key={org.org_id}
                        data-testid="org-card"
                        className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] backdrop-blur-sm border border-gray-200/50 shadow-lg ${getStageGradient(org.org_lifecycle_stage)} ${getStageShadow(org.org_lifecycle_stage)} hover:shadow-xl min-h-[320px] flex flex-col`}
                        style={{
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        {/* Selection Checkbox - Top Right */}
                        <div className="absolute top-4 right-4 z-10">
                          <input
                            type="checkbox"
                            checked={selectedOrgIds.has(org.org_id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectOrg(org.org_id);
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer transition-transform hover:scale-110"
                          />
                        </div>

                        {/* Card Body */}
                        <div className="p-6 space-y-4 flex-1">
                          {/* Header: Avatar + Name + Domain */}
                          <div className="flex items-start gap-3.5">
                            {/* Modern gradient avatar */}
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white/50">
                              <span className="text-base font-bold text-white">
                                {org.org_name.charAt(0).toUpperCase()}
                              </span>
                            </div>

                            {/* Name + Domain with better typography */}
                            <div className="flex-1 min-w-0 pt-0.5">
                              <h3 className="text-xl font-bold text-gray-900 mb-1 truncate leading-tight">
                                {org.org_name}
                              </h3>
                              <p className="text-xs font-medium text-gray-500 truncate">
                                {org.domain || 'No domain'}
                              </p>
                            </div>
                          </div>

                          {/* Status Row: Stage + Company as dots */}
                          <div className="flex items-center gap-4 text-sm">
                            {/* Stage with dot */}
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${getStageDotColor(org.org_lifecycle_stage)}`}></div>
                              <span className="text-gray-700 font-medium">{formatStage(org.org_lifecycle_stage)}</span>
                            </div>

                            {/* Separator */}
                            <div className="w-px h-3 bg-gray-300"></div>

                            {/* Last Activity */}
                            <span className="text-gray-600 text-xs">
                              {org.last_activity_date
                                ? `Active ${formatDistanceToNow(new Date(org.last_activity_date), { addSuffix: true })}`
                                : 'No activity yet'
                              }
                            </span>
                          </div>

                          {/* Days Left - Compact */}
                          {daysLeft !== null && (
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                isExpired ? 'bg-red-500' :
                                isExpiringSoon ? 'bg-amber-500' :
                                'bg-gray-400'
                              }`}></div>
                              <span className={`text-xs font-medium ${
                                isExpired ? 'text-red-700' :
                                isExpiringSoon ? 'text-amber-700' :
                                'text-gray-600'
                              }`}>
                                {isExpired ? 'Expired' :
                                 isExpiringSoon ? `${daysLeft} days left` :
                                 `${daysLeft} days remaining`}
                              </span>
                            </div>
                          )}

                          {/* Trial Progress Bar */}
                          <TrialProgressBar
                            trialStartDate={org.trial_start_date}
                            trialEndDate={org.trial_end_date}
                            engagementScore={org.engagement_score}
                            lastActivityDate={org.last_activity_date}
                            className="pt-3"
                          />

                          {/* Account Manager - Minimal */}
                          {(() => {
                            const accountManagerValue = org.account_manager_id || org.account_manager;
                            const manager = accountManagers.find(am => am.user_id === accountManagerValue);
                            const managerName = manager?.full_name || manager?.email?.split('@')[0];
                            const isAssigned = !!managerName;

                            return (
                              <div className="flex items-center gap-2.5 pt-3 border-t border-gray-100">
                                {isAssigned ? (
                                  <>
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <span className="text-[9px] font-semibold text-blue-700">
                                        {getInitials(managerName!)}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-gray-900 font-medium truncate">{managerName}</div>
                                      <div className="text-[10px] text-gray-500">Account Manager</div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-gray-400 font-medium">Unassigned</div>
                                      <div className="text-[10px] text-gray-400">Account Manager</div>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Card Footer - Modern */}
                        <div className="border-t border-white/50 px-6 py-4 backdrop-blur-sm bg-white/30">
                          <button
                            onClick={() => router.push(`/support/trials/${org.org_id}`)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-gray-700 hover:text-white bg-white/60 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md group/btn"
                          >
                            <span>View Details</span>
                            <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Manager</label>
                <select
                  value={bulkAccountManager}
                  onChange={(e) => setBulkAccountManager(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select account manager...</option>
                  {accountManagers.map((manager) => (
                    <option key={manager.user_id} value={manager.user_id}>
                      {manager.full_name || manager.email} ({manager.email})
                    </option>
                  ))}
                </select>
              </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trial Start Date</label>
                <input
                  type="date"
                  value={bulkTrialStartDate}
                  onChange={(e) => setBulkTrialStartDate(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trial End Date</label>
                <input
                  type="date"
                  value={bulkTrialEndDate}
                  onChange={(e) => setBulkTrialEndDate(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Stage</label>
                <select
                  value={bulkStage}
                  onChange={(e) => setBulkStage(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select stage...</option>
                  <option value="prospect">Prospect</option>
                  <option value="demo_scheduled">Demo Scheduled</option>
                  <option value="trial_active">Trial Active</option>
                  <option value="converted">Converted</option>
                  <option value="churned">Churned</option>
                </select>
              </div>

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
                  onClick={handleExportCSV}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 rounded-lg transition-all group"
                >
                  <span className="text-sm font-medium text-gray-900">Export to CSV</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={showCreateOrgModal}
        onClose={() => setShowCreateOrgModal(false)}
        onSuccess={fetchOrganizations}
      />
    </div>
  );
}
