'use client';

export const dynamic = 'force-dynamic';

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
import CredentialsModal from '@/components/CredentialsModal';
import { authenticatedFetch } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

const ROLES = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Team', label: 'Team' },
  { value: 'Account Manager', label: 'Account Manager' },
];

export default function UsersPage() {
  const { user, loading: authLoading, signOut, role } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'Team',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newUserCredentials, setNewUserCredentials] = useState<any>(null);

  // Generate a smart, branded password (must include "myRA")
  const generatePassword = () => {
    const firstName = formData.name.split(' ')[0] || 'User';
    const year = new Date().getFullYear();
    const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
    const password = `${firstName}@myRA${year}!${randomChars}`;
    setFormData({ ...formData, password });
    setShowPassword(true);
    toast.success('Password generated! (includes "myRA" as required)');
  };

  // Copy password to clipboard
  const copyPassword = () => {
    navigator.clipboard.writeText(formData.password);
    toast.success('Password copied to clipboard!');
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    } else if (!authLoading && role !== 'Admin') {
      router.push('/support/dashboard');
      toast.error('Admin access required');
    }
  }, [user, authLoading, role, router]);

  useEffect(() => {
    if (user && role?.toLowerCase() === 'admin') {
      fetchUsers();
    }
  }, [user, role]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all users from auth.users via admin API
      // API returns users with roles from user_metadata
      const response = await authenticatedFetch('/api/admin/users', {
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
      // Create user via API route
      const response = await authenticatedFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      const data = await response.json();

      // Show success message with email status
      if (data.emailSent) {
        toast.success(`User created! Invitation email sent to ${formData.email}`);
      } else {
        toast.success('User created! Save credentials to share with them.');
      }

      // Store credentials and show credentials modal
      setNewUserCredentials({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        emailSent: data.emailSent,
      });

      setShowAddModal(false);
      setShowCredentialsModal(true);
      setFormData({ email: '', password: '', name: '', role: 'Team' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setSubmitting(true);

    try {
      const response = await authenticatedFetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({
          userId: selectedUser.id,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      toast.success('User role updated');
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await authenticatedFetch('/api/admin/users', {
        method: 'DELETE',
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

  if (authLoading || (user && role !== 'Admin')) {
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
              User Management
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
        {/* Users Table */}
        <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
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
                <thead className="border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Last Sign In
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-white">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(u.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {u.last_sign_in_at
                          ? format(new Date(u.last_sign_in_at), 'MMM d, yyyy')
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(u);
                              setFormData({ ...formData, role: u.role });
                              setShowEditModal(true);
                            }}
                          >
                            Edit Role
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={u.id === user.id}
                          >
                            Delete
                          </Button>
                        </div>
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
          setFormData({ email: '', password: '', name: '', role: 'Team' });
        }}
        title="Add New User"
        size="md"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Simple Setup:</strong> User will be created immediately with the password you set.
              Share the login credentials directly with them (no email required).
            </p>
          </div>

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
            placeholder="Full name"
            required
            fullWidth
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temporary Password
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  required
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={generatePassword}
                disabled={!formData.name}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                title={!formData.name ? "Enter name first" : "Generate password"}
              >
                Generate
              </button>
              {formData.password && (
                <button
                  type="button"
                  onClick={copyPassword}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                  title="Copy password"
                >
                  Copy
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              You'll share this password with the user directly. Click Generate for a smart password like "John@2025!A3x"
            </p>
          </div>

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
                setFormData({ email: '', password: '', name: '', role: 'Team' });
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

      {/* Edit Role Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        title="Edit User Role"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedUser?.email}
            </p>
          </div>

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
                setShowEditModal(false);
                setSelectedUser(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={submitting}
              disabled={submitting}
              onClick={handleUpdateRole}
            >
              Update Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* Credentials Modal */}
      {newUserCredentials && (
        <CredentialsModal
          isOpen={showCredentialsModal}
          onClose={() => {
            setShowCredentialsModal(false);
            setNewUserCredentials(null);
          }}
          credentials={newUserCredentials}
        />
      )}
    </div>
  );
}
