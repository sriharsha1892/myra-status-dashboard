'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import toast, { Toaster } from 'react-hot-toast';
import { format, differenceInDays, addDays } from 'date-fns';
import Papa from 'papaparse';
import CreateOrganizationModal from '@/components/CreateOrganizationModal';
import Breadcrumbs from '@/components/Breadcrumbs';
import NavalLoadingBar from '@/components/NavalLoadingBar';
import { showTrialUpdatedToast, showBulkActionToast, showExportSuccessToast } from '@/utils/navalToasts';

type TrialOrg = Database['public']['Tables']['trial_organizations']['Row'];
type TrialUser = Database['public']['Tables']['trial_users']['Row'];

interface OrgWithUsers extends TrialOrg {
  user_count: number;
  active_users: number;
}

export default function TrialOrganizationsPage() {
  const { user, loading: authLoading, signOut, role, parent_company, is_super_admin } = useAuth();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrgWithUsers[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<OrgWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);

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
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [organizations, debouncedSearchQuery, stageFilter, companyFilter]);

  // Update trial end date when start date changes
  useEffect(() => {
    if (bulkTrialStartDate) {
      const endDate = addDays(new Date(bulkTrialStartDate), 14);
      setBulkTrialEndDate(format(endDate, 'yyyy-MM-dd'));
    }
  }, [bulkTrialStartDate]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      // Build query with role-based filtering
      let query = supabase
        .from('trial_organizations')
        .select('*');

      // If Account Manager: only show their orgs
      if (role?.toLowerCase() === 'account_manager') {
        query = query.eq('account_manager_id', user?.id);
      }

      // If not super admin: filter by parent company
      if (!is_super_admin && parent_company) {
        query = query.eq('parent_company', parent_company);
      }
      // If super admin: show all orgs (no company filter)

      const { data: orgs, error: orgsError } = await query.order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Fetch users count for each org
      const { data: users, error: usersError } = await supabase
        .from('trial_users')
        .select('org_id, current_stage');

      if (usersError) throw usersError;

      // Combine data
      // @ts-ignore - Supabase typing issue with dynamic columns
      const orgsWithUsers: OrgWithUsers[] = (orgs || []).map((org: any) => {
        const orgUsers = (users as any)?.filter((u: any) => u.org_id === org.org_id) || [];
        return {
          ...org,
          user_count: orgUsers.length,
          active_users: orgUsers.filter((u: any) => u.current_stage === 'active').length,
        };
      });

      setOrganizations(orgsWithUsers);
      setFilteredOrgs(orgsWithUsers);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, email, full_name')
        .in('role', ['admin', 'account_manager'])
        .order('full_name', { ascending: true });

      if (error) throw error;
      // @ts-ignore - Supabase typing issue
      setAccountManagers(data || []);
    } catch (error: any) {
      console.error('Error fetching account managers:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...organizations];

    // Search filter (using debounced query)
    if (debouncedSearchQuery) {
      filtered = filtered.filter(
        (org) =>
          org.org_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          org.account_manager?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          org.org_domain?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
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

    setFilteredOrgs(filtered);
  };

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

      // Update account_manager field - just name, no email
      const managerDisplayName = selectedManager.full_name || selectedManager.email;

      console.log(`💾 Bulk updating ${selectedOrgIds.size} organizations with account manager:`, managerDisplayName);

      const { error } = await supabase
        .from('trial_organizations')
        .update({
          account_manager: managerDisplayName,
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
      'Domain': org.org_domain || '',
      'Account Manager': org.account_manager || '',
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
      case 'demo_scheduled': return 'text-purple-600 bg-purple-50';
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
                className="flex items-center gap-2 h-9 px-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
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
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm font-medium text-gray-600">Loading organizations...</p>
              </div>
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

              {/* Quick Capture Hub */}
              <div className="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-100/60 p-8">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-400/10 to-blue-400/10 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Quick Capture Hub</h3>
                      <p className="text-sm text-gray-600">Fast, flexible ways to add trial data</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Tool 1: Text Intel Parser */}
                    <button
                      onClick={() => router.push('/support/trials/parse')}
                      className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-purple-200 hover:border-purple-400 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1 text-left"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">Smart</span>
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900 mb-1">Text Parser</h4>
                          <p className="text-xs text-gray-600 leading-relaxed">Paste emails, meeting notes, or call summaries to auto-extract trial data</p>
                        </div>
                        <div className="flex items-center gap-2 text-purple-600 text-sm font-medium">
                          <span>Parse Now</span>
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Tool 2: Import from Spreadsheet */}
                    <button
                      onClick={() => router.push('/support/admin/trial-orgs-import')}
                      className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-amber-200 hover:border-amber-400 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/20 hover:-translate-y-1 text-left"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Bulk</span>
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900 mb-1">Import CSV/Excel</h4>
                          <p className="text-xs text-gray-600 leading-relaxed">Upload spreadsheets with flexible column mapping for bulk imports</p>
                        </div>
                        <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                          <span>Import Now</span>
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Tool 3: Quick Add (Manual Form) */}
                    <button
                      onClick={() => router.push('/support/trials/new')}
                      className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 text-left"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Manual</span>
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900 mb-1">Quick Add</h4>
                          <p className="text-xs text-gray-600 leading-relaxed">Create a single trial org with a simple guided form</p>
                        </div>
                        <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                          <span>Add Trial</span>
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Tool 4: Bulk Actions on Selected */}
                    <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-200 hover:border-green-400 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20 text-left">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </div>
                          {selectedOrgIds.size > 0 && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-600 text-white animate-pulse">
                              {selectedOrgIds.size} selected
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900 mb-1">Bulk Update</h4>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {selectedOrgIds.size > 0
                              ? `Update ${selectedOrgIds.size} selected trial${selectedOrgIds.size > 1 ? 's' : ''} at once`
                              : 'Select trials below to enable batch operations'}
                          </p>
                        </div>
                        {selectedOrgIds.size > 0 ? (
                          <button
                            onClick={() => setShowQuickEditPanel(true)}
                            className="flex items-center gap-2 text-green-600 text-sm font-medium"
                          >
                            <span>Edit Selected</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <span>No trials selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Helpful Tip */}
                  <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                    <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm">
                      <span className="font-semibold text-blue-900">Pro tip:</span>
                      <span className="text-blue-700"> Use <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-xs">Text Parser</span> for quick updates from emails and meeting notes. It recognizes 30+ ask-myra.ai jargon terms automatically!</span>
                    </div>
                  </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrgs.map((org) => {
                    const daysLeft = org.trial_end_date ? differenceInDays(new Date(org.trial_end_date), new Date()) : null;
                    const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
                    const isExpired = daysLeft !== null && daysLeft < 0;

                    return (
                      <div
                        key={org.org_id}
                        className="group relative bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-200 overflow-hidden"
                      >
                        {/* Selection Checkbox - Top Left */}
                        <div className="absolute top-3 left-3 z-10">
                          <input
                            type="checkbox"
                            checked={selectedOrgIds.has(org.org_id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectOrg(org.org_id);
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                        </div>

                        {/* Card Header with gradient */}
                        <div className="relative h-20 bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
                          <div className="absolute -bottom-8 left-4">
                            <div className="w-16 h-16 bg-white rounded-xl shadow-lg border-4 border-white flex items-center justify-center">
                              <span className="text-2xl font-bold text-blue-600">
                                {org.org_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="pt-10 p-4 space-y-3">
                          {/* Organization Name & Domain */}
                          <div>
                            <h3 className="text-base font-bold text-gray-900 mb-1 truncate">
                              {org.org_name}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">
                              {org.org_domain || 'No domain'}
                            </p>
                          </div>

                          {/* Stage Badge & Company Badge */}
                          <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStageColor(org.org_lifecycle_stage)}`}>
                              {formatStage(org.org_lifecycle_stage)}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              org.parent_company === 'GMI'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {org.parent_company}
                            </span>
                          </div>

                          {/* Engagement Score with Progress Bar */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-600">Engagement</span>
                              <span className={`text-xs font-bold ${
                                org.engagement_score >= 75 ? 'text-green-600' :
                                org.engagement_score >= 50 ? 'text-blue-600' :
                                org.engagement_score >= 30 ? 'text-amber-600' :
                                'text-red-600'
                              }`}>
                                {org.engagement_score}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  org.engagement_score >= 75 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                  org.engagement_score >= 50 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                  org.engagement_score >= 30 ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                                  'bg-gradient-to-r from-red-500 to-red-600'
                                }`}
                                style={{ width: `${org.engagement_score}%` }}
                              />
                            </div>
                          </div>

                          {/* Users Count */}
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <span className="text-sm text-gray-700">
                              <span className="font-semibold text-gray-900">{org.active_users}</span> / {org.user_count} active
                            </span>
                          </div>

                          {/* Days Left */}
                          {daysLeft !== null && (
                            <div className={`flex items-center gap-2 p-2 rounded-lg ${
                              isExpired ? 'bg-red-50' :
                              isExpiringSoon ? 'bg-amber-50' :
                              'bg-gray-50'
                            }`}>
                              <svg className={`w-4 h-4 ${
                                isExpired ? 'text-red-600' :
                                isExpiringSoon ? 'text-amber-600' :
                                'text-gray-400'
                              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className={`text-xs font-medium ${
                                isExpired ? 'text-red-700' :
                                isExpiringSoon ? 'text-amber-700' :
                                'text-gray-700'
                              }`}>
                                {isExpired ? 'Expired' :
                                 isExpiringSoon ? `${daysLeft} days left` :
                                 `${daysLeft} days left`}
                              </span>
                            </div>
                          )}

                          {/* Account Manager */}
                          {org.account_manager_id && (
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <span className="text-xs text-gray-600 truncate">
                                {accountManagers.find(am => am.user_id === org.account_manager_id)?.full_name || 'Assigned'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Footer - Action Buttons */}
                        <div className="border-t border-gray-100 p-3 bg-gray-50 flex gap-2">
                          <button
                            onClick={() => router.push(`/support/trials/${org.org_id}`)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                className="flex-1 h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="flex-1 h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="flex-1 h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
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
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-lg transition-all group"
                >
                  <span className="text-sm font-medium text-gray-900">Assign Account Manager</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => setShowBulkTrialDatesModal(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-lg transition-all group"
                >
                  <span className="text-sm font-medium text-gray-900">Update Trial Dates</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => setShowBulkStageModal(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-lg transition-all group"
                >
                  <span className="text-sm font-medium text-gray-900">Change Stage</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
