'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import toast, { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import PlatformUsersTab from '@/components/PlatformUsersTab';
import TrialUsersTab from '@/components/TrialUsersTab';
import SupportQueriesTab from '@/components/SupportQueriesTab';
import EngagementTimelineTab from '@/components/EngagementTimelineTab';
import DealTrackingTab from '@/components/DealTrackingTab';
import DeleteOrganizationModal from '@/components/DeleteOrganizationModal';
import FeatureRequestsTab from '@/components/FeatureRequestsTab';
import FollowupSchedulingTab from '@/components/FollowupSchedulingTab';
import ActivityLogTab from '@/components/ActivityLogTab';

type TrialOrg = Database['public']['Tables']['trial_organizations']['Row'];
type TrialUser = Database['public']['Tables']['trial_users']['Row'];
type Activity = Database['public']['Tables']['user_activity_log']['Row'];
type DemoEvent = Database['public']['Tables']['demo_events']['Row'];
type MeetingNote = Database['public']['Tables']['meeting_notes']['Row'];

type TabType = 'overview' | 'users' | 'queries' | 'deals' | 'activity' | 'demos' | 'meetings' | 'features' | 'followups' | 'activitylog';

export default function OrganizationDetailPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orgId = params.id as string;

  const [organization, setOrganization] = useState<TrialOrg | null>(null);
  const [users, setUsers] = useState<TrialUser[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [demos, setDemos] = useState<DemoEvent[]>([]);
  const [meetings, setMeetings] = useState<MeetingNote[]>([]);
  const [accountManagers, setAccountManagers] = useState<any[]>([]);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);

  // Bulk operations state for users
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkMarkPrimaryModal, setShowBulkMarkPrimaryModal] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkUserStatus, setBulkUserStatus] = useState('');
  const [bulkPrimaryUserId, setBulkPrimaryUserId] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Form states
  const [editedOrg, setEditedOrg] = useState<Partial<TrialOrg>>({});
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    title_role: '',
    is_primary_contact: false,
  });
  const [newActivity, setNewActivity] = useState({
    user_id: '',
    activity_type: 'login' as 'login' | 'query_executed' | 'report_generated' | 'feature_used',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && orgId) {
      fetchOrganizationData();
    }
  }, [user, orgId]);

  const fetchOrganizationData = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      // Fetch organization
      const { data: org, error: orgError } = await supabase
        .from('trial_organizations')
        .select('*')
        .eq('org_id', orgId)
        .single();

      if (orgError) throw orgError;
      setOrganization(org);
      setEditedOrg(org);

      // Permission check: AMs can only access their own orgs
      if (role?.toLowerCase() === 'account_manager' && org.account_manager_id !== user?.id) {
        toast.error('You do not have permission to access this organization');
        router.push('/support/trials');
        return;
      }

      // Fetch account managers from API (users are stored in Supabase Auth, not a database table)
      try {
        console.log('🔍 Fetching account managers from API...');
        const response = await fetch('/api/admin/users');
        console.log('📡 API Response Status for account managers:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('📦 API Response Data:', data);
          const users = data.users || [];
          console.log(`👥 Total users from API: ${users.length}`, users);

          // Filter for admins and account managers
          const managers = users
            .filter((u: any) => {
              const role = u.role?.toLowerCase() || '';
              console.log(`Checking user ${u.email}: role="${role}"`);
              return role === 'admin' || role === 'account manager';
            })
            .map((u: any) => ({
              user_id: u.id,
              email: u.email,
              full_name: u.name,
            }))
            .sort((a: any, b: any) => (a.full_name || '').localeCompare(b.full_name || ''));

          console.log(`✅ Found ${managers.length} account managers:`, managers);

          if (managers.length === 0) {
            toast.error('No account managers found. Please ensure users have "Admin" or "Account Manager" roles.');
          }

          setAccountManagers(managers);
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to fetch account managers from API:', response.status, errorText);
          toast.error(`Failed to load account managers: ${response.status}`);
          setAccountManagers([]);
        }
      } catch (error) {
        console.error('💥 Error fetching account managers:', error);
        toast.error('Error loading account managers. Check console for details.');
        setAccountManagers([]);
      }

      // Fetch unique domains for dropdown
      try {
        const { data: allOrgs, error: domainsError } = await supabase
          .from('trial_organizations')
          .select('org_domain')
          .not('org_domain', 'is', null)
          .order('org_domain');

        if (!domainsError && allOrgs) {
          const uniqueDomains = Array.from(new Set(allOrgs.map(o => o.org_domain).filter(Boolean)));
          setAvailableDomains(uniqueDomains);
        }
      } catch (error) {
        console.error('Error fetching domains:', error);
      }

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('trial_users')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('org_id', orgId)
        .order('activity_timestamp', { ascending: false })
        .limit(50);

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Fetch demos
      const { data: demosData, error: demosError } = await supabase
        .from('demo_events')
        .select('*')
        .eq('org_id', orgId)
        .order('demo_date', { ascending: false });

      if (demosError) throw demosError;
      setDemos(demosData || []);

      // Fetch meetings
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('org_id', orgId)
        .order('meeting_date', { ascending: false });

      if (meetingsError) {
        console.log('Meetings table may not exist yet:', meetingsError);
        // Don't throw error if table doesn't exist - it needs to be created in Supabase
      } else {
        setMeetings(meetingsData || []);
      }
    } catch (error: any) {
      console.error('Error fetching organization data:', error);
      toast.error('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrganization = async () => {
    const supabase = createClient();
    try {
      // Only update editable fields, exclude immutable fields like org_id, created_at
      const updatePayload: any = {
        org_name: editedOrg.org_name,
        org_domain: editedOrg.org_domain,
        account_manager: editedOrg.account_manager,
        org_lifecycle_stage: editedOrg.org_lifecycle_stage,
        trial_start_date: editedOrg.trial_start_date,
        trial_end_date: editedOrg.trial_end_date,
        engagement_score: editedOrg.engagement_score,
        last_activity_date: editedOrg.last_activity_date,
        comments: editedOrg.comments,
        updated_at: new Date().toISOString(),
      };

      console.log('💾 Saving organization with payload:', updatePayload);

      const { error } = await supabase
        .from('trial_organizations')
        .update(updatePayload)
        .eq('org_id', orgId);

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Organization saved successfully');
      toast.success('Organization updated successfully');
      setOrganization({ ...organization!, ...editedOrg });
    } catch (error: any) {
      console.error('💥 Error updating organization:', error);
      toast.error(`Failed to update organization: ${error.message || 'Unknown error'}`);
    }
  };

  const handleAddUser = async () => {
    const supabase = createClient();
    try {
      // @ts-ignore - Supabase typing issue with dynamic columns
      const { error } = await supabase.from('trial_users').insert({
        org_id: orgId,
        ...newUser,
      });

      if (error) throw error;

      toast.success('User added successfully');
      setShowAddUserModal(false);
      setNewUser({ full_name: '', email: '', title_role: '', is_primary_contact: false });
      fetchOrganizationData();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
    }
  };

  const handleLogActivity = async () => {
    const supabase = createClient();
    try {
      // @ts-ignore - Supabase typing issue with dynamic columns
      const { error } = await supabase.from('user_activity_log').insert({
        org_id: orgId,
        user_id: newActivity.user_id,
        activity_type: newActivity.activity_type,
      });

      if (error) throw error;

      toast.success('Activity logged successfully');
      setShowActivityModal(false);
      setNewActivity({ user_id: '', activity_type: 'login' });
      fetchOrganizationData();
    } catch (error: any) {
      console.error('Error logging activity:', error);
      toast.error('Failed to log activity');
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    const supabase = createClient();
    try {
      const { error } = await supabase
        // -ignore - Supabase typing issue with dynamic columns

        .from('trial_users')
        // @ts-ignore - Supabase typing issue with dynamic columns
        // -ignore - Supabase typing issue with dynamic columns

        .update({ user_status: newStatus })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('User status updated');
      fetchOrganizationData();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  // Bulk operations handlers
  const handleSelectAllUsers = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.user_id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleBulkDeleteUsers = async () => {
    setBulkProcessing(true);
    const supabase = createClient();
    const userCountToDelete = selectedUserIds.size;
    const userIdsArray = Array.from(selectedUserIds);

    try {
      console.log(`Attempting to delete ${userCountToDelete} users:`, userIdsArray);
      console.log('User IDs to delete:', userIdsArray);

      const deleteQuery = supabase
        .from('trial_users')
        .delete()
        .in('user_id', userIdsArray);

      console.log('Delete query constructed');

      const { data, error, count } = await deleteQuery;

      console.log('Delete response:', { data, error, count });

      if (error) {
        console.error('❌ Supabase delete error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Deletion failed: ${error.message}`);
      }

      console.log(`✅ Successfully deleted ${count} users from database`);

      toast.success(`Deleted ${userCountToDelete} user${userCountToDelete !== 1 ? 's' : ''}`);
      setShowBulkDeleteModal(false);
      setSelectedUserIds(new Set());

      // Refresh the org data to reflect changes
      await fetchOrganizationData();
    } catch (error: any) {
      console.error('❌ Error deleting users:', error);
      toast.error(error?.message || 'Failed to delete users');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkMarkPrimary = async () => {
    setBulkProcessing(true);
    const supabase = createClient();
    try {
      if (!bulkPrimaryUserId) {
        toast.error('Please select a user to mark as primary');
        return;
      }

      // First, unset all primary contacts in this org
      const { error: unsetError } = await supabase
        // -ignore - Supabase typing issue with dynamic columns

        .from('trial_users')
        // @ts-ignore - Supabase typing issue with dynamic columns
        // -ignore - Supabase typing issue with dynamic columns

        .update({ is_primary_contact: false })
        .eq('org_id', orgId);

      if (unsetError) throw unsetError;

      // Then set the selected user as primary
      const { error: setPrimaryError } = await supabase
        // -ignore - Supabase typing issue with dynamic columns

        .from('trial_users')
        // @ts-ignore - Supabase typing issue with dynamic columns
        // -ignore - Supabase typing issue with dynamic columns

        .update({ is_primary_contact: true })
        .eq('user_id', bulkPrimaryUserId);

      if (setPrimaryError) throw setPrimaryError;

      toast.success('Primary contact updated');
      setShowBulkMarkPrimaryModal(false);
      setBulkPrimaryUserId('');
      setSelectedUserIds(new Set());
      await fetchOrganizationData();
    } catch (error: any) {
      console.error('Error updating primary contact:', error);
      toast.error('Failed to update primary contact');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkChangeStatus = async () => {
    setBulkProcessing(true);
    const supabase = createClient();
    try {
      if (!bulkUserStatus) {
        toast.error('Please select a status');
        return;
      }

      const { error } = await supabase
        // -ignore - Supabase typing issue with dynamic columns

        .from('trial_users')
        // @ts-ignore - Supabase typing issue with dynamic columns
        // -ignore - Supabase typing issue with dynamic columns

        .update({ user_status: bulkUserStatus as any })
        .in('user_id', Array.from(selectedUserIds));

      if (error) throw error;

      toast.success(`Updated ${selectedUserIds.size} user${selectedUserIds.size !== 1 ? 's' : ''}`);
      setShowBulkStatusModal(false);
      setBulkUserStatus('');
      setSelectedUserIds(new Set());
      await fetchOrganizationData();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setBulkProcessing(false);
    }
  };

  if (authLoading || loading || !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  const formatStage = (stage: string) => {
    return stage.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getUserByUserId = (userId: string) => {
    return users.find((u) => u.user_id === userId);
  };

  const selectedUsers = users.filter((u) => selectedUserIds.has(u.user_id));
  const hasPrimaryInSelection = selectedUsers.some((u) => u.is_primary_contact);
  const hasChampionInSelection = selectedUsers.some((u) => u.is_champion);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/support/trials')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {/* Logo */}
              {organization.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt={`${organization.org_name} logo`}
                  className="w-12 h-12 object-contain rounded-lg border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-lg border-2 border-gray-200 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                  <span className="text-lg font-bold text-gray-600">
                    {organization.org_name.split(' ').map((word) => word[0]).join('').toUpperCase().substring(0, 2)}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{organization.org_name}</h1>
                  {organization.org_url && (
                    <a
                      href={organization.org_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                      title="Visit website"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-gray-500">{organization.org_domain || 'No domain'}</p>
                  {organization.domain && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        {organization.domain}
                      </span>
                    </>
                  )}
                </div>
                {organization.description && (
                  <p className="text-sm text-gray-600 mt-1 max-w-2xl line-clamp-2">
                    {organization.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">
                Engagement: <span className="text-gray-900 font-bold">{organization.engagement_score}%</span>
              </span>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                title="Delete this organization"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'overview'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
              {activeTab === 'overview' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'users'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Trial Users ({users.length})
              {activeTab === 'users' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('queries')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'queries'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Support Queries
              {activeTab === 'queries' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('deals')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'deals'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Deals
              {activeTab === 'deals' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'activity'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Activity
              {activeTab === 'activity' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('demos')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'demos'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Demos
              {activeTab === 'demos' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('meetings')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'meetings'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Meetings
              {activeTab === 'meetings' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'features'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Feature Requests
              {activeTab === 'features' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('followups')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'followups'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Follow-ups
              {activeTab === 'followups' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('activitylog')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'activitylog'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Activity Log
              {activeTab === 'activitylog' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Organization Details</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
                  <input
                    type="text"
                    value={editedOrg.org_name || ''}
                    onChange={(e) => setEditedOrg({ ...editedOrg, org_name: e.target.value })}
                    className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
                  <select
                    value={editedOrg.org_domain || ''}
                    onChange={(e) => setEditedOrg({ ...editedOrg, org_domain: e.target.value })}
                    className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select domain...</option>
                    {availableDomains.map((domain) => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                    <option value="__custom__">+ Add new domain...</option>
                  </select>
                  {editedOrg.org_domain === '__custom__' && (
                    <input
                      type="text"
                      placeholder="Enter new domain (e.g., example.com)"
                      value=""
                      onChange={(e) => setEditedOrg({ ...editedOrg, org_domain: e.target.value })}
                      className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                      autoFocus
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Manager</label>
                  <select
                    value={editedOrg.account_manager || ''}
                    onChange={(e) => {
                      const managerName = e.target.value;
                      console.log('🔄 Account manager changed to:', managerName);
                      setEditedOrg({
                        ...editedOrg,
                        account_manager: managerName || null
                      });
                    }}
                    className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select account manager...</option>
                    {accountManagers.map((manager) => {
                      const displayName = `${manager.full_name} (${manager.email})`;
                      return (
                        <option key={manager.user_id} value={displayName}>
                          {displayName}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lifecycle Stage</label>
                  <select
                    value={editedOrg.org_lifecycle_stage || ''}
                    onChange={(e) => setEditedOrg({ ...editedOrg, org_lifecycle_stage: e.target.value as any })}
                    className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="demo_scheduled">Demo Scheduled</option>
                    <option value="trial_active">Trial Active</option>
                    <option value="converted">Converted</option>
                    <option value="churned">Churned</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trial Start Date</label>
                  <input
                    type="date"
                    value={editedOrg.trial_start_date || ''}
                    onChange={(e) => setEditedOrg({ ...editedOrg, trial_start_date: e.target.value })}
                    className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trial End Date</label>
                  <input
                    type="date"
                    value={editedOrg.trial_end_date || ''}
                    onChange={(e) => setEditedOrg({ ...editedOrg, trial_end_date: e.target.value })}
                    className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
                  <textarea
                    value={editedOrg.comments || ''}
                    onChange={(e) => setEditedOrg({ ...editedOrg, comments: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveOrganization}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trial Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <TrialUsersTab orgId={orgId} users={users} onRefresh={fetchOrganizationData} />
          </div>
        )}

        {/* Support Queries Tab */}
        {activeTab === 'queries' && (
          <div className="space-y-6">
            <SupportQueriesTab orgId={orgId} />
          </div>
        )}


        {/* Deal Tracking Tab */}
        {activeTab === 'deals' && (
          <div className="space-y-6">
            <DealTrackingTab orgId={orgId} />
          </div>
        )}

        {/* Activity Tab - Engagement Timeline */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <EngagementTimelineTab orgId={orgId} />
          </div>
        )}

        {/* Demos Tab */}
        {activeTab === 'demos' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Demo Events</h3>
              <button
                onClick={() => router.push('/support/trials/demos')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                View All Demos
              </button>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 overflow-hidden">
              {demos.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-12">No demos scheduled yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80 border-b border-gray-200">
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Demo ID</th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Date</th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Sales POC</th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Status</th>
                        <th className="text-left text-xs font-semibold text-gray-700 px-6 py-3">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {demos.map((demo) => {
                        const getStatusColor = (status: string) => {
                          switch (status) {
                            case 'scheduled': return 'text-blue-600 bg-blue-50';
                            case 'completed': return 'text-green-600 bg-green-50';
                            case 'cancelled': return 'text-red-600 bg-red-50';
                            default: return 'text-gray-600 bg-gray-50';
                          }
                        };

                        return (
                          <tr
                            key={demo.demo_id}
                            onClick={() => router.push(`/support/trials/demos/${demo.demo_id}`)}
                            className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4">
                              <p className="text-sm font-semibold text-gray-900">{demo.demo_id}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-900">
                                {format(new Date(demo.demo_date), 'MMM d, yyyy')}
                                {demo.demo_time && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    {demo.demo_time}
                                  </span>
                                )}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-900">{demo.sales_poc}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(demo.demo_status)}`}>
                                {demo.demo_status.charAt(0).toUpperCase() + demo.demo_status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {demo.demo_rating ? (
                                <div className="flex items-center gap-1">
                                  {[...Array(demo.demo_rating)].map((_, i) => (
                                    <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                    </svg>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">No rating</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Meetings Tab */}
        {activeTab === 'meetings' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Meeting History</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Total meetings: {meetings.length} |
                  Pending action items: {meetings.reduce((sum, m) => {
                    const actionItems = typeof m.action_items === 'string'
                      ? JSON.parse(m.action_items)
                      : m.action_items || [];
                    return sum + actionItems.filter((item: any) => item.status === 'pending').length;
                  }, 0)}
                  {meetings.length > 0 && ` | Last meeting: ${format(new Date(meetings[0].meeting_date), 'MMM d, yyyy')}`}
                </p>
              </div>
              <button
                onClick={() => router.push('/support/trials/meetings')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                View All Meetings
              </button>
            </div>

            <div className="space-y-4">
              {meetings.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-12 text-center">
                  <p className="text-gray-500">No meetings recorded yet</p>
                  <button
                    onClick={() => router.push('/support/trials/meetings')}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Add First Meeting
                  </button>
                </div>
              ) : (
                meetings.map((meeting) => {
                  const MEETING_TYPE_ICONS: Record<string, string> = {
                    demo: '🎯',
                    follow_up_call: '📞',
                    check_in: '✅',
                    technical_review: '🔧',
                    executive_briefing: '💼',
                    other: '📝',
                  };

                  const MEETING_TYPE_LABELS: Record<string, string> = {
                    demo: 'Demo',
                    follow_up_call: 'Follow-up Call',
                    check_in: 'Check-in',
                    technical_review: 'Technical Review',
                    executive_briefing: 'Executive Briefing',
                    other: 'Other',
                  };

                  const actionItems = typeof meeting.action_items === 'string'
                    ? JSON.parse(meeting.action_items)
                    : meeting.action_items || [];
                  const completedActions = actionItems.filter((item: any) => item.status === 'completed').length;
                  const totalActions = actionItems.length;
                  const icon = MEETING_TYPE_ICONS[meeting.meeting_type] || '📝';
                  const typeLabel = MEETING_TYPE_LABELS[meeting.meeting_type] || 'Meeting';

                  return (
                    <div
                      key={meeting.meeting_id}
                      onClick={() => router.push(`/support/trials/meetings/${meeting.meeting_id}`)}
                      className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/60 p-6 hover:shadow-lg cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-3xl">{icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {typeLabel}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600">
                              {format(new Date(meeting.meeting_date), 'MMM d, yyyy')}
                            </span>
                            {meeting.duration_minutes && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="text-sm text-gray-600">{meeting.duration_minutes} min</span>
                              </>
                            )}
                          </div>
                          <div className="text-sm text-gray-700 mb-1">
                            <span className="font-medium">Conducted by:</span> {meeting.conducted_by}
                          </div>
                          {meeting.meeting_summary && (
                            <p className="text-sm text-gray-600 mt-2">
                              {meeting.meeting_summary.length > 100
                                ? `${meeting.meeting_summary.substring(0, 100)}...`
                                : meeting.meeting_summary}
                            </p>
                          )}
                          {totalActions > 0 && (
                            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-xs">
                              <span className="font-medium">Action Items:</span>
                              <span className="text-green-600 font-semibold">{completedActions}</span>
                              <span className="text-gray-400">/</span>
                              <span className="text-gray-600 font-semibold">{totalActions}</span>
                            </div>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}


        {/* Feature Requests Tab */}
        {activeTab === 'features' && (
          <div className="space-y-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowBulkImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Bulk Import Past Requests</span>
              </button>
            </div>
            <FeatureRequestsTab orgId={orgId} />
          </div>
        )}

        {/* Follow-up Scheduling Tab */}
        {activeTab === 'followups' && (
          <div className="space-y-6">
            <FollowupSchedulingTab orgId={orgId} />
          </div>
        )}

        {/* Activity Log Tab */}
        {activeTab === 'activitylog' && (
          <div className="space-y-6">
            <ActivityLogTab orgId={orgId} />
          </div>
        )}
      </div>

      {/* Bulk Action Bar for Users */}
      {selectedUserIds.size > 0 && activeTab === 'users' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">{selectedUserIds.size}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkMarkPrimaryModal(true)}
                  className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 hover:border-gray-400"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Mark as Primary</span>
                </button>
                <button
                  onClick={() => setShowBulkStatusModal(true)}
                  className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 hover:border-gray-400"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <span>Change Status</span>
                </button>
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-red-50 text-gray-700 hover:text-red-600 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 hover:border-red-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete Users</span>
                </button>
                <button
                  onClick={() => setSelectedUserIds(new Set())}
                  className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 hover:border-gray-400"
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

      {/* Bulk Delete Users Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Delete Users</h3>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800">Warning: This action cannot be undone</p>
                  <p className="text-xs text-red-700 mt-1">
                    You are about to delete {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''}.
                    {hasPrimaryInSelection && ' This includes a primary contact.'}
                    {hasChampionInSelection && ' This includes a champion.'}
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                Users to be deleted:
                <ul className="mt-2 space-y-1">
                  {selectedUsers.slice(0, 5).map((u) => (
                    <li key={u.user_id} className="text-xs text-gray-500">• {u.full_name} ({u.email})</li>
                  ))}
                  {selectedUsers.length > 5 && (
                    <li className="text-xs text-gray-400">... and {selectedUsers.length - 5} more</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDeleteUsers}
                disabled={bulkProcessing}
                className="flex-1 h-10 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkProcessing ? 'Deleting...' : `Delete ${selectedUserIds.size} User${selectedUserIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Mark Primary Modal */}
      {showBulkMarkPrimaryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Mark as Primary Contact</h3>
              <button
                onClick={() => setShowBulkMarkPrimaryModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">Select One User</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Only one user can be marked as the primary contact. The current primary contact will be automatically unmarked.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Contact</label>
                <select
                  value={bulkPrimaryUserId}
                  onChange={(e) => setBulkPrimaryUserId(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a user...</option>
                  {selectedUsers.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkMarkPrimaryModal(false)}
                className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkMarkPrimary}
                disabled={bulkProcessing || !bulkPrimaryUserId}
                className="flex-1 h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkProcessing ? 'Updating...' : 'Mark as Primary'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Change Status Modal */}
      {showBulkStatusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Change User Status</h3>
              <button
                onClick={() => setShowBulkStatusModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                <select
                  value={bulkUserStatus}
                  onChange={(e) => setBulkUserStatus(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select status...</option>
                  <option value="invited">Invited</option>
                  <option value="access_enabled">Access Enabled</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="text-xs text-gray-500">
                This will update the status for {selectedUserIds.size} selected user{selectedUserIds.size !== 1 ? 's' : ''}.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkStatusModal(false)}
                className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkChangeStatus}
                disabled={bulkProcessing || !bulkUserStatus}
                className="flex-1 h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkProcessing ? 'Updating...' : `Update ${selectedUserIds.size} User${selectedUserIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title/Role</label>
                <input
                  type="text"
                  value={newUser.title_role}
                  onChange={(e) => setNewUser({ ...newUser, title_role: e.target.value })}
                  className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newUser.is_primary_contact}
                  onChange={(e) => setNewUser({ ...newUser, is_primary_contact: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-gray-700">Primary Contact</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={!newUser.full_name || !newUser.email}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Log Activity</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User *</label>
                <select
                  value={newActivity.user_id}
                  onChange={(e) => setNewActivity({ ...newActivity, user_id: e.target.value })}
                  className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select user...</option>
                  {users.map((singleUser) => (
                    <option key={singleUser.user_id} value={singleUser.user_id}>
                      {singleUser.full_name} ({singleUser.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type *</label>
                <select
                  value={newActivity.activity_type}
                  onChange={(e) => setNewActivity({ ...newActivity, activity_type: e.target.value as any })}
                  className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="login">Login</option>
                  <option value="query_executed">Query Executed</option>
                  <option value="report_generated">Report Generated</option>
                  <option value="feature_used">Feature Used</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowActivityModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogActivity}
                disabled={!newActivity.user_id}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Log Activity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Organization Modal */}
      <DeleteOrganizationModal
        isOpen={showDeleteModal}
        orgId={orgId}
        orgName={organization?.org_name || ''}
        userCount={users.length}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={() => {
          toast.success('Organization deleted successfully');
          router.push('/support/trials');
        }}
      />

      {/* Bulk Import Feature Requests Modal - Disabled */}
      {/* Component to be implemented */}
    </div>
  );
}
