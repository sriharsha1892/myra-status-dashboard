'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import toast, { Toaster } from 'react-hot-toast';
import { format, differenceInDays, addDays } from 'date-fns';
import Papa from 'papaparse';
import CreateOrganizationModal from '@/components/CreateOrganizationModal';
import Breadcrumbs from '@/components/Breadcrumbs';

type TrialOrg = Database['public']['Tables']['trial_organizations']['Row'];
type TrialUser = Database['public']['Tables']['trial_users']['Row'];

interface OrgWithUsers extends TrialOrg {
  user_count: number;
  active_users: number;
}

export default function TrialOrganizationsPage() {
  const { user, loading: authLoading, signOut, role } = useAuth();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrgWithUsers[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<OrgWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);

  // Bulk operations state
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());
  const [showBulkAccountManagerModal, setShowBulkAccountManagerModal] = useState(false);
  const [showBulkTrialDatesModal, setShowBulkTrialDatesModal] = useState(false);
  const [showBulkStageModal, setShowBulkStageModal] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Bulk operation form states
  const [bulkAccountManager, setBulkAccountManager] = useState('');
  const [bulkAccountManagerOther, setBulkAccountManagerOther] = useState('');
  const [bulkTrialStartDate, setBulkTrialStartDate] = useState('');
  const [bulkTrialEndDate, setBulkTrialEndDate] = useState('');
  const [onlyUpdateMissingDates, setOnlyUpdateMissingDates] = useState(false);
  const [bulkStage, setBulkStage] = useState<string>('');


  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchOrganizations();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [organizations, searchQuery, stageFilter]);

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
      // If Admin or Product: show all orgs (no filter needed)

      const { data: orgs, error: orgsError } = await query.order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Fetch users count for each org
      const { data: users, error: usersError } = await supabase
        .from('trial_users')
        .select('org_id, user_status');

      if (usersError) throw usersError;

      // Combine data
      // @ts-ignore - Supabase typing issue with dynamic columns
      const orgsWithUsers: OrgWithUsers[] = (orgs || []).map((org: any) => {
        const orgUsers = (users as any)?.filter((u: any) => u.org_id === org.org_id) || [];
        return {
          ...org,
          user_count: orgUsers.length,
          active_users: orgUsers.filter((u: any) => u.user_status === 'active').length,
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

  const applyFilters = () => {
    let filtered = [...organizations];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (org) =>
          org.org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.account_manager?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.org_domain?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Stage filter
    if (stageFilter !== 'all') {
      filtered = filtered.filter((org) => org.org_lifecycle_stage === stageFilter);
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
      const accountManager = bulkAccountManager === 'Other' ? bulkAccountManagerOther : bulkAccountManager;

      if (!accountManager) {
        toast.error('Please enter an account manager');
        return;
      }

      const { error } = await supabase
        .from('trial_organizations')
        // @ts-ignore - Supabase typing issue with dynamic columns
        .update({ account_manager: accountManager })
        .in('org_id', Array.from(selectedOrgIds));

      if (error) throw error;

      toast.success(`Updated ${selectedOrgIds.size} organizations`);
      setShowBulkAccountManagerModal(false);
      setBulkAccountManager('');
      setBulkAccountManagerOther('');
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

      toast.success(`Updated ${orgsToUpdate.length} organizations`);
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

      toast.success(`Updated ${selectedOrgIds.size} organizations`);
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

    toast.success(`Exported ${selectedOrgs.length} organizations`);
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
              onClick={() => router.push('/support/trials/new')}
              className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ New Trial Org</span>
            </button>
            <button
              onClick={() => router.push('/support/trials/import')}
              className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-gray-50 text-gray-700 hover:text-blue-600 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-200 hover:border-blue-300 active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Import Data</span>
            </button>
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
              </div>

              {/* Organizations Table */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-6 py-3 w-12">
                          <input
                            type="checkbox"
                            checked={selectedOrgIds.size === filteredOrgs.length && filteredOrgs.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Organization</th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Stage</th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Users</th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Engagement</th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Days Left</th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Account Manager</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredOrgs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                            No organizations found
                          </td>
                        </tr>
                      ) : (
                        filteredOrgs.map((org) => (
                          <tr
                            key={org.org_id}
                            className="hover:bg-blue-50/50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedOrgIds.has(org.org_id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleSelectOrg(org.org_id);
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td
                              className="px-6 py-4 cursor-pointer"
                              onClick={() => router.push(`/support/trials/${org.org_id}`)}
                            >
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{org.org_name}</p>
                                {org.org_domain && (
                                  <p className="text-xs text-gray-500 mt-0.5">{org.org_domain}</p>
                                )}
                              </div>
                            </td>
                            <td
                              className="px-6 py-4 cursor-pointer"
                              onClick={() => router.push(`/support/trials/${org.org_id}`)}
                            >
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStageColor(org.org_lifecycle_stage)}`}>
                                {formatStage(org.org_lifecycle_stage)}
                              </span>
                            </td>
                            <td
                              className="px-6 py-4 cursor-pointer"
                              onClick={() => router.push(`/support/trials/${org.org_id}`)}
                            >
                              <p className="text-sm text-gray-900">
                                {org.active_users}/{org.user_count} active
                              </p>
                            </td>
                            <td
                              className="px-6 py-4 cursor-pointer"
                              onClick={() => router.push(`/support/trials/${org.org_id}`)}
                            >
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getEngagementColor(org.engagement_score)}`}>
                                {org.engagement_score}%
                              </span>
                            </td>
                            <td
                              className="px-6 py-4 cursor-pointer"
                              onClick={() => router.push(`/support/trials/${org.org_id}`)}
                            >
                              <p className="text-sm text-gray-900">
                                {org.trial_end_date ? `${getDaysLeft(org.trial_end_date)} days` : '-'}
                              </p>
                            </td>
                            <td
                              className="px-6 py-4 cursor-pointer"
                              onClick={() => router.push(`/support/trials/${org.org_id}`)}
                            >
                              <p className="text-sm text-gray-900">{org.account_manager || '-'}</p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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
                  <option value="John Smith">John Smith</option>
                  <option value="Sarah Johnson">Sarah Johnson</option>
                  <option value="Michael Brown">Michael Brown</option>
                  <option value="Emily Davis">Emily Davis</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {bulkAccountManager === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Name</label>
                  <input
                    type="text"
                    value={bulkAccountManagerOther}
                    onChange={(e) => setBulkAccountManagerOther(e.target.value)}
                    placeholder="Enter account manager name..."
                    className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
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
                disabled={bulkProcessing || (!bulkAccountManager || (bulkAccountManager === 'Other' && !bulkAccountManagerOther))}
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

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={showCreateOrgModal}
        onClose={() => setShowCreateOrgModal(false)}
        onSuccess={fetchOrganizations}
      />
    </div>
  );
}
