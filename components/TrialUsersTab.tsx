'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import AddTrialUserModal from './AddTrialUserModal';
import { format } from 'date-fns';

interface TrialUser {
  user_id: string;
  full_name: string;
  email: string;
  user_designation?: string;
  freshsales_id?: string;
  is_primary_contact: boolean;
  user_status: string;
  last_login_at?: string;
  created_at: string;
}

interface TrialUsersTabProps {
  orgId: string;
}

export default function TrialUsersTab({ orgId }: TrialUsersTabProps) {
  const [users, setUsers] = useState<TrialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, [orgId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trial_users')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching trial users:', error);
      toast.error('Failed to load trial users');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('trial_users')
        .update({ user_status: newStatus })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(`User status updated to ${newStatus}`);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleTogglePrimaryContact = async (userId: string, currentValue: boolean) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('trial_users')
        .update({ is_primary_contact: !currentValue })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(`Primary contact status updated`);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating primary contact:', error);
      toast.error('Failed to update primary contact status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trial_users')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('User removed successfully');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Failed to remove user');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'invited':
        return 'text-yellow-600 bg-yellow-50 border border-yellow-200';
      case 'access_enabled':
        return 'text-blue-600 bg-blue-50 border border-blue-200';
      case 'active':
        return 'text-green-600 bg-green-50 border border-green-200';
      case 'inactive':
        return 'text-gray-600 bg-gray-50 border border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Trial Users ({users.length})</h3>
          <p className="text-sm text-gray-600 mt-1">Manage users in this trial organization</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add User</span>
        </button>
      </div>

      {/* Users Table */}
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/50 rounded-lg border border-dashed border-gray-300">
          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM18 8h.01M9 20h12a2 2 0 002-2v-2a6 6 0 00-9-5.197M4 12a4 4 0 11-8 0 4 4 0 018 0zM9 20H5a2 2 0 01-2-2v-2a4 4 0 018 0v2a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 font-medium">No users yet</p>
          <p className="text-sm text-gray-500 mt-1">Add your first trial user to get started</p>
        </div>
      ) : (
        <div className="bg-white/80 rounded-xl border border-gray-200/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Name</span>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Email</span>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Designation</span>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Status</span>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Primary</span>
                  </th>
                  <th className="px-6 py-3 text-right">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{user.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{user.user_designation || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.user_status}
                        onChange={(e) => handleStatusChange(user.user_id, e.target.value)}
                        disabled={updatingStatus}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-md border cursor-pointer transition-all ${getStatusColor(user.user_status)}`}
                      >
                        <option value="invited">Invited</option>
                        <option value="access_enabled">Access Enabled</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleTogglePrimaryContact(user.user_id, user.is_primary_contact)}
                        disabled={updatingStatus}
                        className={`text-sm font-semibold px-3 py-1.5 rounded-md border transition-all ${
                          user.is_primary_contact
                            ? 'text-green-600 bg-green-50 border-green-200'
                            : 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {user.is_primary_contact ? (
                          <>
                            <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Primary
                          </>
                        ) : (
                          'Mark Primary'
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteUser(user.user_id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <AddTrialUserModal
        orgId={orgId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
