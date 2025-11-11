// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface TrialUser {
  user_id: string;
  org_id: string;
  email: string;
  full_name: string;
  title_role?: string;
}

interface EditField {
  field: string;
  oldValue: string;
  newValue: string;
}

interface BulkEditPanelProps {
  orgId?: string;
  onComplete?: () => void;
}

export default function BulkEditPanel({ orgId, onComplete }: BulkEditPanelProps) {
  const [users, setUsers] = useState<TrialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [editField, setEditField] = useState<'full_name' | 'title_role'>('full_name');
  const [editValue, setEditValue] = useState('');
  const [updating, setUpdating] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, [orgId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase.from('trial_users').select('*');

      if (orgId) {
        query = query.eq('org_id', orgId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.user_id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one user');
      return;
    }

    if (!editValue.trim()) {
      toast.error('Please enter a value');
      return;
    }

    setUpdating(true);
    try {
      const updates = Array.from(selectedUsers).map((userId) => ({
        user_id: userId,
        [editField]: editValue,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('trial_users')
          .update({ [editField]: editValue })
          .eq('user_id', update.user_id);

        if (error) throw error;
      }

      toast.success(`Updated ${selectedUsers.size} user(s)`);
      setEditMode(false);
      setSelectedUsers(new Set());
      setEditValue('');
      await fetchUsers();
      onComplete?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update users');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 text-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Bulk Edit Users</h3>
          <p className="text-sm text-gray-600 mt-1">Edit multiple users at once</p>
        </div>
        {selectedUsers.size > 0 && (
          <div className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            {selectedUsers.size} selected
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Bulk Edit Mode */}
      {editMode && selectedUsers.size > 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">
            Update {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''}
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Field to edit</label>
              <select
                value={editField}
                onChange={(e) => setEditField(e.target.value as 'full_name' | 'title_role')}
                className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="full_name">Full Name</option>
                <option value="title_role">Title/Role</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New value</label>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={`Enter new ${editField === 'full_name' ? 'full name' : 'title/role'}...`}
                className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleBulkUpdate}
                disabled={updating}
                className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Updating...
                  </>
                ) : (
                  'Apply Update'
                )}
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  setEditValue('');
                }}
                className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg border border-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Users Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Full Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Title/Role</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                  {searchTerm ? 'No users found matching your search' : 'No users available'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr
                  key={user.user_id}
                  className={`border-t border-gray-200 hover:bg-gray-50 ${
                    selectedUsers.has(user.user_id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.user_id)}
                      onChange={() => handleSelectUser(user.user_id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{user.full_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.title_role || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Action Button */}
      {selectedUsers.size > 0 && !editMode && (
        <button
          onClick={() => setEditMode(true)}
          className="w-full h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit {selectedUsers.size} User{selectedUsers.size > 1 ? 's' : ''}
        </button>
      )}

      {/* Summary */}
      <div className="text-sm text-gray-600 text-center py-2">
        Showing {filteredUsers.length} of {users.length} users
      </div>
    </div>
  );
}
