'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { authenticatedFetch } from '@/lib/api-client';

type TrialUser = {
  user_id: string;
  org_id: string;
  name: string;
  email: string;
  role: string | null;
  current_stage: string;
  account_manager: string;
};

type TrialOrg = {
  org_id: string;
  org_name: string;
  domain: string;
  parent_company: string;
  org_url: string | null;
  logo_url: string | null;
  description: string | null;
  trial_status: string;
  org_lifecycle_stage: string;
  trial_request_date: string | null;
  trial_access_provided_date: string | null;
  trial_expiry_date: string | null;
  account_manager_id: string | null;
  sales_poc: string | null;
  users: TrialUser[];
};

const DOMAINS = ['TMT', 'AF&B', 'E&C', 'HC', 'NEO', 'AAD', 'Unassigned'];
const PARENT_COMPANIES = ['Mordor Intelligence', 'GMI'];
const TRIAL_STATUSES = ['requested', 'in_progress', 'active', 'completed', 'expired'];
const LIFECYCLE_STAGES = ['prospect', 'trial_pending', 'trial_active', 'trial_expired', 'customer', 'lost'];
const USER_STAGES = ['invited', 'low_activity', 'active', 'power_user', 'dormant'];

type AccountManager = {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
};

export default function BulkEditPage() {
  const { parent_company, is_super_admin } = useAuth();
  const [orgs, setOrgs] = useState<TrialOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [accountManagers, setAccountManagers] = useState<AccountManager[]>([]);
  const [changes, setChanges] = useState<{
    orgs: Map<string, Partial<TrialOrg>>;
    users: Map<string, Partial<TrialUser>>;
  }>({
    orgs: new Map(),
    users: new Map(),
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'user' | 'org' | null;
    id: string | null;
    name: string;
  }>({ type: null, id: null, name: '' });
  const [addUserModal, setAddUserModal] = useState<{
    isOpen: boolean;
    orgId: string | null;
    orgName: string;
  }>({ isOpen: false, orgId: null, orgName: '' });
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: '',
    current_stage: 'invited',
    account_manager: '',
  });
  const [autoTagging, setAutoTagging] = useState(false);
  const [autoTagResult, setAutoTagResult] = useState<{
    isOpen: boolean;
    summary?: {
      total: number;
      succeeded: number;
      failed: number;
      total_tags_added: number;
    };
    results?: Array<{
      org_name: string;
      new_tags: string[];
      confidence: number;
      success: boolean;
      error?: string;
    }>;
  }>({ isOpen: false });

  useEffect(() => {
    loadData();
    loadAccountManagers();
  }, []);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();

    try {
      // Fetch trial organizations (with company filtering for non-super-admins)
      let orgsQuery = supabase
        .from('trial_organizations')
        .select('*')
        .order('org_name');

      // Filter by parent company if not super admin
      if (!is_super_admin && parent_company) {
        orgsQuery = orgsQuery.eq('parent_company', parent_company);
      }

      const { data: orgsData, error: orgsError } = await orgsQuery;

      if (orgsError) throw orgsError;

      // Fetch all trial users
      const { data: usersData, error: usersError } = await supabase
        .from('trial_users')
        .select('*')
        .order('name');

      if (usersError) throw usersError;

      // Group users by org_id
      const usersByOrg = new Map<string, TrialUser[]>();
      usersData?.forEach((user) => {
        if (!usersByOrg.has(user.org_id)) {
          usersByOrg.set(user.org_id, []);
        }
        usersByOrg.get(user.org_id)!.push(user);
      });

      // Combine orgs with their users
      const orgsWithUsers = orgsData?.map((org) => ({
        ...org,
        users: usersByOrg.get(org.org_id) || [],
      })) || [];

      setOrgs(orgsWithUsers);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load trial organizations');
    } finally {
      setLoading(false);
    }
  }

  async function loadAccountManagers() {
    try {
      const response = await authenticatedFetch('/api/account-managers');
      if (!response.ok) throw new Error('Failed to fetch account managers');

      const data = await response.json();
      setAccountManagers(data.managers || []);
    } catch (error) {
      console.error('Error loading account managers:', error);
      toast.error('Failed to load account managers list');
    }
  }

  function toggleOrg(orgId: string) {
    const newExpanded = new Set(expandedOrgs);
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId);
    } else {
      newExpanded.add(orgId);
    }
    setExpandedOrgs(newExpanded);
  }

  function expandAll() {
    setExpandedOrgs(new Set(orgs.map(o => o.org_id)));
  }

  function collapseAll() {
    setExpandedOrgs(new Set());
  }

  function updateOrgField(orgId: string, field: keyof TrialOrg, value: any) {
    const currentChanges = changes.orgs.get(orgId) || {};
    const newOrgChanges = new Map(changes.orgs);
    newOrgChanges.set(orgId, { ...currentChanges, [field]: value });

    setChanges({ ...changes, orgs: newOrgChanges });

    // Update local state for immediate UI feedback
    setOrgs(orgs.map(org =>
      org.org_id === orgId ? { ...org, [field]: value } : org
    ));
  }

  function updateUserField(userId: string, field: keyof TrialUser, value: any) {
    const currentChanges = changes.users.get(userId) || {};
    const newUserChanges = new Map(changes.users);
    newUserChanges.set(userId, { ...currentChanges, [field]: value });

    setChanges({ ...changes, users: newUserChanges });

    // Update local state for immediate UI feedback
    setOrgs(orgs.map(org => ({
      ...org,
      users: org.users.map(user =>
        user.user_id === userId ? { ...user, [field]: value } : user
      ),
    })));
  }

  async function deleteUser(userId: string) {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('trial_users')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // Remove from local state
      setOrgs(orgs.map(org => ({
        ...org,
        users: org.users.filter(u => u.user_id !== userId),
      })));

      // Remove from changes if it was pending
      const newUserChanges = new Map(changes.users);
      newUserChanges.delete(userId);
      setChanges({ ...changes, users: newUserChanges });

      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  }

  async function deleteOrganization(orgId: string) {
    const supabase = createClient();
    const org = orgs.find(o => o.org_id === orgId);

    if (!org) return;

    // Check if org has users
    if (org.users.length > 0) {
      if (!confirm(`This organization has ${org.users.length} user(s). Deleting it will also delete all users. Continue?`)) {
        return;
      }
    }

    try {
      // Delete all users first
      if (org.users.length > 0) {
        const { error: usersError } = await supabase
          .from('trial_users')
          .delete()
          .eq('org_id', orgId);

        if (usersError) throw usersError;
      }

      // Delete organization
      const { error: orgError } = await supabase
        .from('trial_organizations')
        .delete()
        .eq('org_id', orgId);

      if (orgError) throw orgError;

      // Remove from local state
      setOrgs(orgs.filter(o => o.org_id !== orgId));

      // Remove from changes if it was pending
      const newOrgChanges = new Map(changes.orgs);
      newOrgChanges.delete(orgId);
      const newUserChanges = new Map(changes.users);
      org.users.forEach(user => newUserChanges.delete(user.user_id));
      setChanges({ orgs: newOrgChanges, users: newUserChanges });

      toast.success('Organization deleted successfully');
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('Failed to delete organization');
    }
  }

  async function addUser() {
    if (!addUserModal.orgId) return;

    // Validate required fields
    if (!newUserForm.name || !newUserForm.email) {
      toast.error('Name and email are required');
      return;
    }

    const supabase = createClient();

    try {
      const { data: newUser, error } = await supabase
        .from('trial_users')
        .insert({
          org_id: addUserModal.orgId,
          name: newUserForm.name,
          email: newUserForm.email,
          role: newUserForm.role || null,
          current_stage: newUserForm.current_stage,
          account_manager: newUserForm.account_manager,
          invited_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setOrgs(orgs.map(org =>
        org.org_id === addUserModal.orgId
          ? { ...org, users: [...org.users, newUser] }
          : org
      ));

      // Reset form and close modal
      setNewUserForm({
        name: '',
        email: '',
        role: '',
        current_stage: 'invited',
        account_manager: '',
      });
      setAddUserModal({ isOpen: false, orgId: null, orgName: '' });

      toast.success('User added successfully');
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
    }
  }

  // Map frontend field names to database column names
  function mapOrgFieldsToDb(updates: Partial<TrialOrg>) {
    const dbUpdates: any = {};

    // Map only the fields that exist in the actual database schema
    if ('org_name' in updates) dbUpdates.org_name = updates.org_name;
    if ('domain' in updates) dbUpdates.org_domain = updates.domain;
    // Store account manager UUID in account_manager field for proper resolution
    if ('account_manager_id' in updates) dbUpdates.account_manager = updates.account_manager_id;

    // Convert old lifecycle stage values to new ones
    if ('org_lifecycle_stage' in updates) {
      let stage = updates.org_lifecycle_stage;
      // Automatically convert old values to new values
      if (stage === 'converted') stage = 'customer';
      if (stage === 'churned') stage = 'lost';
      if (stage === 'demo_scheduled') stage = 'trial_pending';
      dbUpdates.org_lifecycle_stage = stage;
    }

    if ('trial_access_provided_date' in updates) dbUpdates.trial_start_date = updates.trial_access_provided_date;
    if ('trial_expiry_date' in updates) dbUpdates.trial_end_date = updates.trial_expiry_date;
    if ('comments' in updates) dbUpdates.comments = updates.comments;

    // Add updated_at timestamp
    dbUpdates.updated_at = new Date().toISOString();

    return dbUpdates;
  }

  function mapUserFieldsToDb(updates: Partial<TrialUser>) {
    const dbUpdates: any = {};

    // These fields use the same names in the database (no mapping needed)
    if ('name' in updates) dbUpdates.name = updates.name;
    if ('email' in updates) dbUpdates.email = updates.email;
    if ('role' in updates) dbUpdates.role = updates.role;
    if ('current_stage' in updates) dbUpdates.current_stage = updates.current_stage;
    if ('account_manager' in updates) dbUpdates.account_manager = updates.account_manager;

    return dbUpdates;
  }

  async function autoTagOrganizations() {
    if (autoTagging) return;

    if (!confirm(`Auto-tag ${orgs.length} organizations with AI?\n\nThis will analyze each organization and generate relevant tags using AI. It may take 2-5 seconds per organization.`)) {
      return;
    }

    setAutoTagging(true);
    toast.loading(`Auto-tagging ${orgs.length} organizations...`, { id: 'auto-tag' });

    try {
      const response = await authenticatedFetch('/api/trials/bulk-operations/auto-tag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          org_ids: orgs.map(org => org.org_id),
          mode: 'selected',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Auto-tagging failed');
      }

      // Show success toast
      toast.success(
        `Auto-tagged ${result.summary.succeeded} organizations (${result.summary.total_tags_added} tags added)`,
        { id: 'auto-tag' }
      );

      // Show detailed results modal
      setAutoTagResult({
        isOpen: true,
        summary: result.summary,
        results: result.results,
      });

      // Reload data to show updated tags
      await loadData();
    } catch (error: any) {
      console.error('Auto-tagging error:', error);
      toast.error(error.message || 'Failed to auto-tag organizations', { id: 'auto-tag' });
    } finally {
      setAutoTagging(false);
    }
  }

  async function saveChanges() {
    setSaving(true);
    const supabase = createClient();
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // Update organizations
      for (const [orgId, updates] of changes.orgs.entries()) {
        console.log('==== ORG UPDATE DEBUG ====');
        console.log('Org ID:', orgId);
        console.log('Original updates:', JSON.stringify(updates, null, 2));

        const dbUpdates = mapOrgFieldsToDb(updates);

        console.log('Mapped dbUpdates:', JSON.stringify(dbUpdates, null, 2));

        if (Object.keys(dbUpdates).length > 0) {
          const { data, error } = await supabase
            .from('trial_organizations')
            .update(dbUpdates)
            .eq('org_id', orgId)
            .select();

          if (error) {
            console.error(`❌ Error updating org ${orgId}:`);
            console.error('Error object:', error);
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);
            console.error('Error details:', error.details);
            console.error('Error hint:', error.hint);
            errors.push(`Org ${orgId}: ${error.message || 'Unknown error'}`);
            errorCount++;
          } else {
            console.log(`✅ Successfully updated org ${orgId}`);
            console.log('Updated data:', data);
            successCount++;
          }
        }
      }

      // Update users
      for (const [userId, updates] of changes.users.entries()) {
        console.log('==== USER UPDATE DEBUG ====');
        console.log('User ID:', userId);
        console.log('Original updates:', JSON.stringify(updates, null, 2));

        const dbUpdates = mapUserFieldsToDb(updates);

        console.log('Mapped dbUpdates:', JSON.stringify(dbUpdates, null, 2));

        if (Object.keys(dbUpdates).length > 0) {
          const { data, error } = await supabase
            .from('trial_users')
            .update(dbUpdates)
            .eq('user_id', userId)
            .select();

          if (error) {
            console.error(`❌ Error updating user ${userId}:`);
            console.error('Error object:', error);
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);
            console.error('Error details:', error.details);
            console.error('Error hint:', error.hint);
            errors.push(`User ${userId}: ${error.message || 'Unknown error'}`);
            errorCount++;
          } else {
            console.log(`✅ Successfully updated user ${userId}`);
            console.log('Updated data:', data);
            successCount++;
          }
        }
      }

      if (errorCount === 0) {
        toast.success(`Successfully saved ${successCount} changes`);
        setChanges({ orgs: new Map(), users: new Map() });
      } else {
        console.error('Errors:', errors);
        toast.error(`Saved ${successCount} changes, ${errorCount} failed. Check console for details.`);
      }
    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast.error(`Failed to save changes: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  const totalChanges = changes.orgs.size + changes.users.size;

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading trial organizations...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Bulk Edit Trial Organizations</h1>
        <p className="text-gray-600">
          Review, edit, and delete all imported trial organizations and users in one place.
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
          >
            Collapse All
          </button>
          <button
            onClick={loadData}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={autoTagOrganizations}
            disabled={autoTagging || orgs.length === 0}
            className="px-3 py-1.5 text-sm border rounded bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            title="Use AI to automatically generate tags for all organizations"
          >
            {autoTagging ? 'Auto-Tagging...' : '✨ Auto-Tag with AI'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {totalChanges > 0 && (
            <span className="text-sm text-orange-600 font-medium">
              {totalChanges} unsaved change{totalChanges > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={saveChanges}
            disabled={totalChanges === 0 || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : `Save All Changes (${totalChanges})`}
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        Total: {orgs.length} organizations, {orgs.reduce((sum, org) => sum + org.users.length, 0)} users
      </div>

      <div className="space-y-4">
        {orgs.map((org) => (
          <div key={org.org_id} className="border rounded-lg">
            {/* Organization Header */}
            <div className="p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-gray-100 -m-4 p-4 rounded"
                  onClick={() => toggleOrg(org.org_id)}
                >
                  <span className="text-lg">
                    {expandedOrgs.has(org.org_id) ? '▼' : '▶'}
                  </span>
                  <div>
                    <div className="font-semibold">{org.org_name}</div>
                    <div className="text-sm text-gray-600">
                      {org.users.length} user{org.users.length !== 1 ? 's' : ''} • {org.domain} • {org.trial_status}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm({ type: 'org', id: org.org_id, name: org.org_name });
                  }}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete Org
                </button>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedOrgs.has(org.org_id) && (
              <div className="p-4 space-y-6">
                {/* Organization Fields */}
                <div>
                  <h3 className="font-semibold mb-3">Organization Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name</label>
                      <input
                        type="text"
                        value={org.org_name}
                        onChange={(e) => updateOrgField(org.org_id, 'org_name', e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Domain</label>
                      <select
                        value={org.domain}
                        onChange={(e) => updateOrgField(org.org_id, 'domain', e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      >
                        {DOMAINS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Parent Company</label>
                      <select
                        value={org.parent_company}
                        onChange={(e) => updateOrgField(org.org_id, 'parent_company', e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      >
                        {PARENT_COMPANIES.map(company => (
                          <option key={company} value={company}>{company}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Website URL</label>
                      <input
                        type="text"
                        value={org.org_url || ''}
                        onChange={(e) => updateOrgField(org.org_id, 'org_url', e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Logo URL</label>
                      <input
                        type="text"
                        value={org.logo_url || ''}
                        onChange={(e) => updateOrgField(org.org_id, 'logo_url', e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        placeholder="https://logo.example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Trial Status</label>
                      <select
                        value={org.trial_status}
                        onChange={(e) => updateOrgField(org.org_id, 'trial_status', e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      >
                        {TRIAL_STATUSES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Lifecycle Stage</label>
                      <select
                        value={org.org_lifecycle_stage}
                        onChange={(e) => updateOrgField(org.org_id, 'org_lifecycle_stage', e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      >
                        {LIFECYCLE_STAGES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Trial Request Date</label>
                      <input
                        type="date"
                        value={org.trial_request_date ? org.trial_request_date.split('T')[0] : ''}
                        onChange={(e) => updateOrgField(org.org_id, 'trial_request_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Trial Access Date</label>
                      <input
                        type="date"
                        value={org.trial_access_provided_date ? org.trial_access_provided_date.split('T')[0] : ''}
                        onChange={(e) => updateOrgField(org.org_id, 'trial_access_provided_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Trial Expiry Date</label>
                      <input
                        type="date"
                        value={org.trial_expiry_date ? org.trial_expiry_date.split('T')[0] : ''}
                        onChange={(e) => updateOrgField(org.org_id, 'trial_expiry_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Account Manager</label>
                      <select
                        value={org.account_manager_id || ''}
                        onChange={(e) => updateOrgField(org.org_id, 'account_manager_id', e.target.value || null)}
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value="">Select Account Manager</option>
                        {accountManagers.map(manager => (
                          <option key={manager.user_id} value={manager.user_id}>
                            {manager.full_name} ({manager.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Sales POC</label>
                      <input
                        type="text"
                        value={org.sales_poc || ''}
                        onChange={(e) => updateOrgField(org.org_id, 'sales_poc', e.target.value || null)}
                        className="w-full px-3 py-2 border rounded"
                        placeholder="Sales point of contact"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={org.description || ''}
                        onChange={(e) => updateOrgField(org.org_id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Users */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">Users ({org.users.length})</h3>
                    <button
                      onClick={() => setAddUserModal({ isOpen: true, orgId: org.org_id, orgName: org.org_name })}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      + Add User
                    </button>
                  </div>
                  <div className="space-y-3">
                    {org.users.map((user, idx) => (
                      <div key={user.user_id} className="border rounded p-3 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-gray-500">User {idx + 1}</span>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'user', id: user.user_id, name: user.name })}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Name</label>
                            <input
                              type="text"
                              value={user.name}
                              onChange={(e) => updateUserField(user.user_id, 'name', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border rounded"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium mb-1">Email</label>
                            <input
                              type="email"
                              value={user.email}
                              onChange={(e) => updateUserField(user.user_id, 'email', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border rounded"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium mb-1">Role/Title</label>
                            <input
                              type="text"
                              value={user.role || ''}
                              onChange={(e) => updateUserField(user.user_id, 'role', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border rounded"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium mb-1">Current Stage</label>
                            <select
                              value={user.current_stage}
                              onChange={(e) => updateUserField(user.user_id, 'current_stage', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border rounded"
                            >
                              {USER_STAGES.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium mb-1">Account Manager</label>
                            <select
                              value={user.account_manager}
                              onChange={(e) => updateUserField(user.user_id, 'account_manager', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border rounded"
                            >
                              <option value="">Select Account Manager</option>
                              {accountManagers.map(manager => (
                                <option key={manager.user_id} value={manager.full_name}>
                                  {manager.full_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                    {org.users.length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No users in this organization
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {orgs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No trial organizations found
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.type && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-2">Confirm Deletion</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete{' '}
              <span className="font-semibold">{deleteConfirm.name}</span>?
              {deleteConfirm.type === 'org' && ' This will also delete all associated users.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm({ type: null, id: null, name: '' })}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'user' && deleteConfirm.id) {
                    deleteUser(deleteConfirm.id);
                  } else if (deleteConfirm.type === 'org' && deleteConfirm.id) {
                    deleteOrganization(deleteConfirm.id);
                  }
                  setDeleteConfirm({ type: null, id: null, name: '' });
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {addUserModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Add User to {addUserModal.orgName}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Role/Title</label>
                <input
                  type="text"
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Data Analyst"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Current Stage</label>
                <select
                  value={newUserForm.current_stage}
                  onChange={(e) => setNewUserForm({ ...newUserForm, current_stage: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {USER_STAGES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Account Manager</label>
                <select
                  value={newUserForm.account_manager}
                  onChange={(e) => setNewUserForm({ ...newUserForm, account_manager: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Account Manager</option>
                  {accountManagers.map(manager => (
                    <option key={manager.user_id} value={manager.full_name}>
                      {manager.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setAddUserModal({ isOpen: false, orgId: null, orgName: '' });
                  setNewUserForm({ name: '', email: '', role: '', current_stage: 'invited', account_manager: '' });
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addUser}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Tag Results Modal */}
      {autoTagResult.isOpen && autoTagResult.summary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold mb-2">Auto-Tagging Results</h3>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600 font-medium">
                    ✓ {autoTagResult.summary.succeeded} succeeded
                  </span>
                  <span className="text-red-600 font-medium">
                    ✗ {autoTagResult.summary.failed} failed
                  </span>
                  <span className="text-blue-600 font-medium">
                    {autoTagResult.summary.total_tags_added} tags added
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAutoTagResult({ isOpen: false })}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {autoTagResult.results?.map((result, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{result.org_name}</h4>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {result.success ? 'Success' : 'Failed'}
                    </span>
                  </div>

                  {result.success && result.new_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {result.new_tags.map((tag, tagIdx) => (
                        <span
                          key={tagIdx}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {result.success && (
                    <div className="text-xs text-gray-600">
                      Confidence: {Math.round(result.confidence * 100)}%
                    </div>
                  )}

                  {!result.success && result.error && (
                    <div className="text-sm text-red-600 mt-2">Error: {result.error}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setAutoTagResult({ isOpen: false })}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
