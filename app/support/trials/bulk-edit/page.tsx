'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

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

const DOMAINS = ['TMT', 'AF&B', 'E&C', 'HC', 'NEO', 'AAD'];
const PARENT_COMPANIES = ['Mordor Intelligence', 'GMI'];
const TRIAL_STATUSES = ['requested', 'in_progress', 'active', 'completed', 'expired'];
const LIFECYCLE_STAGES = ['trial_pending', 'trial_active', 'trial_expired', 'converted', 'churned'];
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
      const response = await fetch('/api/account-managers');
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

  async function saveChanges() {
    setSaving(true);
    const supabase = createClient();
    let successCount = 0;
    let errorCount = 0;

    try {
      // Update organizations
      for (const [orgId, updates] of changes.orgs.entries()) {
        const { error } = await supabase
          .from('trial_organizations')
          .update(updates)
          .eq('org_id', orgId);

        if (error) {
          console.error(`Error updating org ${orgId}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      // Update users
      for (const [userId, updates] of changes.users.entries()) {
        const { error } = await supabase
          .from('trial_users')
          .update(updates)
          .eq('user_id', userId);

        if (error) {
          console.error(`Error updating user ${userId}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`Successfully saved ${successCount} changes`);
        setChanges({ orgs: new Map(), users: new Map() });
      } else {
        toast.error(`Saved ${successCount} changes, ${errorCount} errors`);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
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
    </div>
  );
}
