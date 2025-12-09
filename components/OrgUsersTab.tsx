'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import SetUserPasswordModal from './SetUserPasswordModal';

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'account_manager' | 'sales_poc' | 'viewer';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface OrgUsersTabProps {
  orgId: string;
}

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'account_manager', label: 'Account Manager', description: 'Manage assigned organizations' },
  { value: 'sales_poc', label: 'Sales POC', description: 'View-only access' },
  { value: 'viewer', label: 'Viewer', description: 'Limited read-only access' },
];

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  account_manager: 'bg-blue-100 text-blue-700',
  sales_poc: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-700',
};

export default function OrgUsersTab({ orgId }: OrgUsersTabProps) {
  const supabase = createClient();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [orgId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all team users (Admin/AM) for now
      // TODO: Filter by assigned orgs once managed_org_ids column is added
      const { data, error} = await supabase
        .from('users')
        .select('id, full_name, email, role, is_active, last_login_at, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u)));
      toast.success('Role updated successfully');
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleOpenPasswordModal = (user: AdminUser) => {
    setSelectedUser(user);
    setShowPasswordModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Admin Users:</strong> Account Managers and Admins who manage this organization. Passwords are encrypted with bcrypt and never visible to anyone.
        </p>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM4 20h16a2 2 0 002-2v-2a3 3 0 00-3-3H5a3 3 0 00-3 3v2a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Admin Users Assigned</h3>
            <p className="text-gray-600">No Account Managers are managing this organization yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700">Name</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700">Email</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700">Role</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700">Last Login</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  {/* Name */}
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{user.full_name}</p>
                  </td>

                  {/* Email */}
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>

                  {/* Role */}
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={updatingRole === user.id}
                      className={`px-3 py-1 rounded-lg text-sm font-medium border-0 cursor-pointer transition ${
                        ROLE_COLORS[user.role]
                      } disabled:opacity-50`}
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Last Login */}
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : 'Never'}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleOpenPasswordModal(user)}
                      className="inline-block px-3 py-1 bg-accent-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition"
                      title="Set or reset password"
                    >
                      🔑 Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Role Descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {ROLES.map((role) => (
          <div key={role.value} className={`rounded-lg p-4 ${ROLE_COLORS[role.value]}`}>
            <p className="font-semibold mb-1">{role.label}</p>
            <p className="text-xs">{role.description}</p>
          </div>
        ))}
      </div>

      {/* Password Modal */}
      {selectedUser && (
        <SetUserPasswordModal
          isOpen={showPasswordModal}
          userId={selectedUser.id}
          userName={selectedUser.full_name}
          userEmail={selectedUser.email}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setShowPasswordModal(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}
