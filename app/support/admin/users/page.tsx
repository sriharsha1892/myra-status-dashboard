'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/support/ui/Button';
import { Input } from '@/components/support/ui/Input';
import { Select } from '@/components/support/ui/Select';
import { Modal } from '@/components/support/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
  last_sign_in_at: string | null;
}

const ROLES = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Sales Admin', label: 'Sales Admin' },
  { value: 'Research Admin', label: 'Research Admin' },
  { value: 'Team', label: 'Team' },
  { value: 'AM', label: 'Account Manager' },
];

export default function UsersPage() {
  const { user, loading: authLoading, signOut, role } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingField, setEditingField] = useState<{ userId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'Team',
  });
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    } else if (!authLoading && role?.toLowerCase() !== 'admin' && role?.toLowerCase() !== 'sales admin' && role?.toLowerCase() !== 'research admin') {
      router.push('/support/dashboard');
      toast.error('Admin access required');
    }
  }, [user, authLoading, role, router]);

  useEffect(() => {
    if (user && (role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'sales admin' || role?.toLowerCase() === 'research admin')) {
      fetchUsers();
    }
  }, [user, role]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      toast.success('User created successfully');
      setShowAddModal(false);
      setFormData({ email: '', name: '', password: '', role: 'Team' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (userId: string, field: string, currentValue: string) => {
    setEditingField({ userId, field });
    setEditValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async (userId: string, field: string) => {
    if (!editValue) {
      toast.error('Value cannot be empty');
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          [field]: editValue,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      toast.success(`User ${field} updated`);
      setEditingField(null);
      setEditValue('');
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      toast.success('User deleted');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  if (authLoading || (user && role?.toLowerCase() !== 'admin' && role?.toLowerCase() !== 'sales admin' && role?.toLowerCase() !== 'research admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0d1117]">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-8">
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">
              User Management <span className="text-xs text-gray-500">({ROLES.length} roles available)</span>
            </h1>
            <nav className="flex items-center gap-1">
              <button
                onClick={() => router.push('/support/dashboard')}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors duration-200"
              >
                Dashboard
              </button>
              <button className="px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded transition-colors duration-200">
                Users
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowPermissionsModal(true)}>
              Manage Permissions
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
              Add User
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Users Table with Inline Editing */}
        <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Last Sign In
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-[#161b22] divide-y divide-gray-200 dark:divide-gray-800">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                    >
                      {/* Email - Editable */}
                      <td className="px-4 py-3">
                        {editingField?.userId === u.id && editingField?.field === 'email' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(u.id, 'email');
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              autoFocus
                            />
                            <button onClick={() => saveEdit(u.id, 'email')} className="text-green-600 hover:text-green-700">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button onClick={cancelEditing} className="text-red-600 hover:text-red-700">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => startEditing(u.id, 'email', u.email)}
                            className="text-sm text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
                          >
                            {u.email}
                          </div>
                        )}
                      </td>

                      {/* Name - Editable */}
                      <td className="px-4 py-3">
                        {editingField?.userId === u.id && editingField?.field === 'name' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(u.id, 'name');
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              autoFocus
                            />
                            <button onClick={() => saveEdit(u.id, 'name')} className="text-green-600 hover:text-green-700">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button onClick={cancelEditing} className="text-red-600 hover:text-red-700">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => startEditing(u.id, 'name', u.name)}
                            className="text-sm text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
                          >
                            {u.name}
                          </div>
                        )}
                      </td>

                      {/* Role - Editable with dropdown */}
                      <td className="px-4 py-3">
                        {editingField?.userId === u.id && editingField?.field === 'role' ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(u.id, 'role');
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              autoFocus
                            >
                              {ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                            <button onClick={() => saveEdit(u.id, 'role')} className="text-green-600 hover:text-green-700">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button onClick={cancelEditing} className="text-red-600 hover:text-red-700">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => startEditing(u.id, 'role', u.role)}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            {u.role}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.status === 'Active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}>
                          {u.status}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(u.created_at), 'MMM d, yyyy')}
                      </td>

                      {/* Last Sign In */}
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {u.last_sign_in_at
                          ? format(new Date(u.last_sign_in_at), 'MMM d, yyyy')
                          : 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={u.id === user.id}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormData({ email: '', name: '', password: '', role: 'Team' });
        }}
        title="Add New User"
        size="md"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@example.com"
            required
            fullWidth
          />

          <Input
            label="Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Full Name"
            required
            fullWidth
          />

          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Minimum 6 characters"
            required
            fullWidth
          />

          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={ROLES}
            required
            fullWidth
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                setShowAddModal(false);
                setFormData({ email: '', name: '', password: '', role: 'Team' });
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              disabled={submitting}
            >
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Permissions Management Modal - Placeholder for now */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        title="Manage Role Permissions"
        size="lg"
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure permissions for each role. This feature allows you to customize what each role can access and modify.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> Currently, Sales Admin and Research Admin have the same permissions as Admin. You can customize these permissions through this interface.
            </p>
          </div>

          {/* Permissions grid will be built in next iteration */}
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Permissions management UI coming soon...
          </div>
        </div>
      </Modal>
    </div>
  );
}
