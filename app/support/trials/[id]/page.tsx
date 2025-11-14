'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';
import { differenceInDays, format } from 'date-fns';
import { authenticatedFetch } from '@/lib/api-client';
import {
  Building2,
  Users,
  FileText,
  Edit3,
  X,
  Plus,
  ExternalLink,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Trash2,
  MessageSquare,
  Folder,
  Headphones,
  Activity,
  Target,
  UserCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

import LoadingState from '@/components/LoadingState';
import Avatar, { AvatarGroup } from '@/components/Avatar';
import ActivityFeed from '@/components/support/ActivityFeed';
import AINewsPanel from '@/components/support/AINewsPanel';
import Breadcrumbs from '@/components/Breadcrumbs';
import DeleteOrganizationModal from '@/components/DeleteOrganizationModal';
import UnifiedNotesPanel from '@/components/UnifiedNotesPanel';
import DocumentLibrary2027 from '@/components/DocumentLibrary2027';
import SupportQueriesTab from '@/components/SupportQueriesTab';
import TrialExtensionsTab from '@/components/TrialExtensionsTab';
import OverviewTab from '@/components/OverviewTab';
import LogActivityModal from '@/components/LogActivityModal';
import PeopleEngagementTab from '@/components/PeopleEngagementTab';
import UnifiedTimelineTab from '@/components/UnifiedTimelineTab';

type TabType = 'overview' | 'peopleEngagement' | 'timeline' | 'support';

const LIFECYCLE_STAGES = [
  { value: 'prospect', label: 'Prospect', color: 'text-gray-600 bg-gray-100' },
  { value: 'trial_pending', label: 'Trial Pending', color: 'text-blue-600 bg-blue-100' },
  { value: 'trial_active', label: 'Trial Active', color: 'text-green-600 bg-green-100' },
  { value: 'trial_expired', label: 'Trial Expired', color: 'text-amber-600 bg-amber-100' },
  { value: 'customer', label: 'Customer', color: 'text-accent-600 bg-accent-100' },
  { value: 'lost', label: 'Lost', color: 'text-red-600 bg-red-100' },
];

const USER_STAGES = [
  { value: 'invited', label: 'Invited' },
  { value: 'low_activity', label: 'Low Activity' },
  { value: 'active', label: 'Active' },
  { value: 'power_user', label: 'Power User' },
  { value: 'dormant', label: 'Dormant' },
];

const DOMAIN_OPTIONS = [
  { value: 'AAD', label: 'AAD' },
  { value: 'AF&B', label: 'AF&B' },
  { value: 'E&C', label: 'E&C' },
  { value: 'HC', label: 'HC' },
  { value: 'NEO', label: 'NEO' },
  { value: 'TMT', label: 'TMT' },
  { value: 'Unassigned', label: 'Unassigned' },
];

export default function TrialOrgPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orgId = params.id as string;
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [organization, setOrganization] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [accountManagers, setAccountManagers] = useState<any[]>([]);

  // Modal states
  const [showEditOrgModal, setShowEditOrgModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Form states
  const [orgForm, setOrgForm] = useState<any>({});
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: '',
    current_stage: 'invited',
    freshsales_url: '',
  });

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  // Fetch data
  useEffect(() => {
    if (user && orgId) {
      fetchData();
    }
  }, [user, orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch organization
      const { data: org, error: orgError } = await supabase
        .from('trial_organizations')
        .select('*')
        .eq('org_id', orgId)
        .single();

      if (orgError) throw orgError;

      // Fetch account manager details separately if account_manager exists
      if (org && org.account_manager) {
        const { data: amData } = await supabase
          .from('users')
          .select('user_id, username, email, full_name')
          .eq('user_id', org.account_manager)
          .single();

        if (amData) {
          org.account_manager_name = amData.full_name || amData.username || amData.email;
        }
      }

      setOrganization(org);
      setOrgForm(org);

      // Fetch users
      const { data: usersData } = await supabase
        .from('trial_users')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      setUsers(usersData || []);

      // Fetch activities (mock for now - combine meetings, tickets, notes)
      const { data: meetings } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('org_id', orgId)
        .order('meeting_date', { ascending: false });

      const { data: tickets } = await supabase
        .from('trial_support_queries')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      // Transform to unified activity format
      const meetingActivities = (meetings || []).map((m: any) => ({
        id: m.meeting_id,
        type: 'meeting',
        title: `Meeting with ${m.conducted_by || 'team'}`,
        content: m.notes,
        created_at: m.meeting_date,
        created_by_name: m.conducted_by,
      }));

      const ticketActivities = (tickets || []).map((t: any) => ({
        id: t.query_id,
        type: 'ticket',
        title: t.query_text || 'Support ticket',
        content: t.comments,
        created_at: t.created_at,
        priority: t.priority,
        status: t.status,
      }));

      const allActivities = [...meetingActivities, ...ticketActivities]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivities(allActivities);

      // Fetch account managers via API (bypasses RLS, requires auth)
      const managersResponse = await authenticatedFetch('/api/account-managers');
      const { managers } = await managersResponse.json();

      setAccountManagers(managers || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrg = async () => {
    try {
      const { error } = await supabase
        .from('trial_organizations')
        .update(orgForm)
        .eq('org_id', orgId);

      if (error) throw error;

      setOrganization(orgForm);
      setShowEditOrgModal(false);
      toast.success('Organization updated successfully');
    } catch (error: any) {
      console.error('Error updating org:', error);
      toast.error('Failed to update organization');
    }
  };

  const handleAddUser = async () => {
    if (!userForm.name || !userForm.email) {
      toast.error('Name and email are required');
      return;
    }

    try {
      const { error } = await supabase.from('trial_users').insert({
        org_id: orgId,
        ...userForm,
        account_manager: organization?.account_manager || '',
      });

      if (error) throw error;

      toast.success('User added successfully');
      setShowAddUserModal(false);
      setUserForm({ name: '', email: '', role: '', current_stage: 'invited', freshsales_url: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('trial_users')
        .update({
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
          current_stage: editingUser.current_stage,
          freshsales_url: editingUser.freshsales_url,
        })
        .eq('user_id', editingUser.user_id);

      if (error) throw error;

      toast.success('User updated successfully');
      setEditingUser(null);
      fetchData();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const { error } = await supabase
        .from('trial_users')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('User deleted successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  if (authLoading || loading) {
    return <LoadingState message="Loading trial organization..." />;
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">Organization not found</p>
          <button
            onClick={() => router.push('/support/trials')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Trials
          </button>
        </div>
      </div>
    );
  }

  const daysLeft = differenceInDays(new Date(organization.trial_end_date), new Date());
  const activeUsers = users.filter(u => u.current_stage === 'active').length;
  const lifecycleStage = LIFECYCLE_STAGES.find(s => s.value === organization.org_lifecycle_stage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { maxWidth: '500px' },
          success: { duration: 3000 },
          error: { duration: 4000 },
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <Breadcrumbs items={[
            { label: 'Dashboard', href: '/support/dashboard' },
            { label: 'Trial Organizations', href: '/support/trials' },
            { label: organization.org_name }
          ]} />
        </div>
        {/* Glassmorphism Header */}
        <div className="mb-8 p-8 rounded-3xl backdrop-blur-xl bg-white/70 border border-white/40 shadow-2xl relative overflow-hidden">
          {/* Background gradient animation */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse" />

          <div className="relative z-10">
            {/* Top row */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                {organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={`${organization.org_name} logo`}
                    className="w-20 h-20 rounded-2xl object-contain bg-white border-2 border-white/60 shadow-lg"
                    onError={(e) => {
                      // Fallback to Avatar if image fails to load
                      e.currentTarget.style.display = 'none';
                      const avatar = e.currentTarget.nextElementSibling;
                      if (avatar) avatar.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <Avatar
                  name={organization.org_name}
                  size="xl"
                  type="org"
                  className={organization.logo_url ? 'hidden' : ''}
                />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{organization.org_name}</h1>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${lifecycleStage?.color}`}>
                      {lifecycleStage?.label}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-700">
                      {organization.domain}
                    </span>
                    <span className="text-sm text-gray-600">
                      AM: <span className="font-medium">{organization.account_manager_name || organization.account_manager || 'Unassigned'}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEditOrgModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 backdrop-blur-sm text-gray-700 text-sm font-medium border border-gray-200/60 hover:bg-white hover:shadow-lg transition-all duration-200"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Details
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Organization
                </button>
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Trial Status</p>
                    <p className="text-lg font-bold text-blue-900">
                      {daysLeft >= 0 ? `${daysLeft} days left` : 'Expired'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-green-600 font-medium">Active Users</p>
                    <p className="text-lg font-bold text-green-900">{activeUsers} / {users.length}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-accent-50 to-purple-100/50 border border-accent-200/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-accent-600 font-medium">Activities</p>
                    <p className="text-lg font-bold text-purple-900">{activities.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation - 4 Consolidated Tabs */}
        <div className="mb-6 p-2 rounded-2xl backdrop-blur-xl bg-white/60 border border-white/40 inline-flex gap-2 flex-wrap">
          {([
            { id: 'overview', label: 'Overview', icon: Building2, description: 'Trial details & health' },
            { id: 'peopleEngagement', label: 'People & Engagement', icon: Users, description: 'Stakeholders, users & activity' },
            { id: 'timeline', label: 'Activity & Insights', icon: Activity, description: 'Timeline events, notes, and activity tracking' },
            { id: 'support', label: 'Support & Success', icon: Headphones, description: 'Customer support queries' },
          ] as const).map(({ id, label, icon: Icon, description }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`
                flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-300
                ${activeTab === id
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-accent-500/30 scale-105'
                  : 'text-gray-600 hover:bg-white/80'
                }
              `}
              title={description}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {activeTab === 'overview' && (
            <OverviewTab
              organization={organization}
              orgId={orgId}
            />
          )}

          {activeTab === 'peopleEngagement' && (
            <PeopleEngagementTab
              orgId={orgId}
              users={users}
              onAddUser={() => setShowAddUserModal(true)}
              onEditUser={setEditingUser}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {activeTab === 'timeline' && (
            <UnifiedTimelineTab
              orgId={orgId}
              activities={activities}
              users={users}
              organization={organization}
              onAddActivity={() => setShowAddActivityModal(true)}
            />
          )}

          {activeTab === 'support' && (
            <SupportQueriesTab orgId={orgId} />
          )}
        </div>
      </div>

      {/* Edit Org Modal */}
      {showEditOrgModal && (
        <Modal title="Edit Organization" onClose={() => setShowEditOrgModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name *</label>
                <input
                  type="text"
                  value={orgForm.org_name || ''}
                  onChange={(e) => setOrgForm({ ...orgForm, org_name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Domain *</label>
                <select
                  value={orgForm.domain || ''}
                  onChange={(e) => setOrgForm({ ...orgForm, domain: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DOMAIN_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Manager *</label>
                <select
                  value={orgForm.account_manager || ''}
                  onChange={(e) => setOrgForm({ ...orgForm, account_manager: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Account Manager</option>
                  {accountManagers.map(am => (
                    <option key={am.user_id} value={am.user_id}>
                      {am.full_name || am.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lifecycle Stage *</label>
                <select
                  value={orgForm.org_lifecycle_stage || ''}
                  onChange={(e) => setOrgForm({ ...orgForm, org_lifecycle_stage: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LIFECYCLE_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trial Start *</label>
                <input
                  type="date"
                  value={orgForm.trial_start_date || ''}
                  onChange={(e) => setOrgForm({ ...orgForm, trial_start_date: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trial End *</label>
                <input
                  type="date"
                  value={orgForm.trial_end_date || ''}
                  onChange={(e) => setOrgForm({ ...orgForm, trial_end_date: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Organization URL</label>
              <input
                type="url"
                value={orgForm.org_url || ''}
                onChange={(e) => setOrgForm({ ...orgForm, org_url: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
              <input
                type="url"
                value={orgForm.logo_url || ''}
                onChange={(e) => setOrgForm({ ...orgForm, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {orgForm.logo_url && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Logo Preview:</p>
                  <img
                    src={orgForm.logo_url}
                    alt="Logo preview"
                    className="w-16 h-16 rounded-lg object-contain bg-white border border-gray-200"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.alt = 'Invalid logo URL';
                      e.currentTarget.className = 'w-16 h-16 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-500 text-xs';
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sales POC</label>
              <input
                type="text"
                value={orgForm.sales_poc || ''}
                onChange={(e) => setOrgForm({ ...orgForm, sales_poc: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={orgForm.description || ''}
                onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditOrgModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateOrg}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <Modal title="Add User" onClose={() => setShowAddUserModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <input
                type="text"
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                placeholder="Product Manager"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stage</label>
              <select
                value={userForm.current_stage}
                onChange={(e) => setUserForm({ ...userForm, current_stage: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {USER_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Freshsales URL</label>
              <input
                type="url"
                value={userForm.freshsales_url}
                onChange={(e) => setUserForm({ ...userForm, freshsales_url: e.target.value })}
                placeholder="https://myra.freshsales.io/contacts/..."
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              >
                Add User
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <Modal title="Edit User" onClose={() => setEditingUser(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <input
                type="text"
                value={editingUser.role || ''}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stage</label>
              <select
                value={editingUser.current_stage}
                onChange={(e) => setEditingUser({ ...editingUser, current_stage: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {USER_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Freshsales URL</label>
              <input
                type="url"
                value={editingUser.freshsales_url || ''}
                onChange={(e) => setEditingUser({ ...editingUser, freshsales_url: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Log Activity Modal */}
      <LogActivityModal
        isOpen={showAddActivityModal}
        onClose={() => setShowAddActivityModal(false)}
        orgId={orgId}
        users={users}
        onActivityLogged={fetchData}
      />

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
    </div>
  );
}

// Users Tab Component
function UsersTab({ users, onAddUser, onEditUser, onDeleteUser }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Users ({users.length})</h3>
        <button
          onClick={onAddUser}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-medium shadow-lg shadow-accent-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12 px-6 rounded-2xl backdrop-blur-xl bg-white/60 border border-white/40">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-sm text-gray-600 font-medium mb-1">No users yet</p>
          <p className="text-xs text-gray-500">Add your first user to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map((user: any) => (
            <div
              key={user.user_id}
              className="p-6 rounded-2xl backdrop-blur-xl bg-white/80 border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar name={user.name} size="lg" stage={user.current_stage} />
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">{user.name}</h4>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {user.role && (
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          {user.role}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        user.current_stage === 'active' ? 'bg-green-100 text-green-700' :
                        user.current_stage === 'onboarding' ? 'bg-accent-100 text-accent-700' :
                        user.current_stage === 'invited' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {user.current_stage}
                      </span>
                      {user.freshsales_url && (
                        <a
                          href={user.freshsales_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Freshsales
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditUser(user)}
                    className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteUser(user.user_id)}
                    className="px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Details Tab Component
function DetailsTab({ organization }: any) {
  return (
    <div className="space-y-6">
      <div className="p-8 rounded-2xl backdrop-blur-xl bg-white/80 border border-white/40 shadow-lg">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Organization Details</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-600">Organization Name</label>
            <p className="text-base text-gray-900 mt-1">{organization.org_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Domain</label>
            <p className="text-base text-gray-900 mt-1">{organization.domain}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Account Manager</label>
            <p className="text-base text-gray-900 mt-1">{organization.account_manager}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Sales POC</label>
            <p className="text-base text-gray-900 mt-1">{organization.sales_poc || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Trial Period</label>
            <p className="text-base text-gray-900 mt-1">
              {format(new Date(organization.trial_start_date), 'MMM d, yyyy')} - {format(new Date(organization.trial_end_date), 'MMM d, yyyy')}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Organization URL</label>
            {organization.org_url ? (
              <a href={organization.org_url} target="_blank" rel="noopener noreferrer" className="text-base text-blue-600 hover:underline mt-1 flex items-center gap-1">
                {organization.org_url}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <p className="text-base text-gray-900 mt-1">-</p>
            )}
          </div>
          {organization.description && (
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-600">Description</label>
              <p className="text-base text-gray-900 mt-1">{organization.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* AI & LLM News Panel - Feature Flag Controlled */}
      {process.env.NEXT_PUBLIC_NEWS_LENS === 'on' && (
        <AINewsPanel orgId={organization.org_id} orgName={organization.org_name} />
      )}
    </div>
  );
}

// Modal Component
function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
