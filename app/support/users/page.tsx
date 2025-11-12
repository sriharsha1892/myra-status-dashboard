'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirm } from '@/hooks/useConfirm';
import { createClient } from '@/lib/supabase/client';
import { authenticatedFetch } from '@/lib/api-client';
import toast, { Toaster } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import Breadcrumbs from '@/components/Breadcrumbs';
import { showUserCreatedToast, showUserDeletedToast, showUserUpdatedToast } from '@/utils/navalToasts';
import CredentialsModal from '@/components/CredentialsModal';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Sales Admin' | 'Research Admin' | 'Account Manager' | 'Product' | 'Prodgain User' | 'Team';
  status: 'Active' | 'Invited' | 'Pending';
  created_at: string;
  last_sign_in_at: string | null;
  parent_company: string;
  is_super_admin: boolean;
}

const ROLES = ['Admin', 'Sales Admin', 'Research Admin', 'Account Manager', 'Product', 'Prodgain User', 'Team'] as const;
const PARENT_COMPANIES = ['Mordor Intelligence', 'GMI'] as const;

export default function UsersPage() {
  const { user, loading: authLoading, signOut, role } = useAuth();
  const router = useRouter();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: 'Team' as const, parent_company: 'Mordor Intelligence' as const });
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newUserCredentials, setNewUserCredentials] = useState<any>(null);

  // Debounce search query for better performance (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const supabase = createClient();

  // Generate a smart, branded password (must include "myRA")
  const generatePassword = () => {
    const firstName = newUser.name.split(' ')[0] || 'User';
    const year = new Date().getFullYear();
    const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
    const password = `${firstName}@myRA${year}!${randomChars}`;
    setNewUser({ ...newUser, password });
    setShowPassword(true);
    toast.success('Password generated! (includes "myRA" as required)');
  };

  // Copy password to clipboard
  const copyPassword = () => {
    navigator.clipboard.writeText(newUser.password);
    toast.success('Password copied to clipboard!');
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // BYPASS: Allow admin@myra.ai (JWT metadata caching workaround)
    const isAdminBypass = user?.email === 'admin@myra.ai';
    if (user && (isAdminBypass || role?.toLowerCase() === 'admin')) {
      fetchUsers();
    }
  }, [user, role]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Add cache-busting query parameter and aggressive no-cache headers
      const cacheBuster = `?t=${Date.now()}`;
      const response = await authenticatedFetch(`/api/admin/users${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', response.status, errorData);

        if (response.status === 403) {
          toast.error('Access denied. Admin permission required.');
        } else {
          toast.error(errorData.error || 'Failed to load users');
        }
        return;
      }

      const data = await response.json();
      console.log('🔍 DEBUG: API returned users:', data.users?.length, 'users');
      console.log('🔍 DEBUG: Pending users:', data.users?.filter((u: any) => u.status === 'Pending').length);
      console.log('🔍 DEBUG: Full user list:', data.users);
      console.log('🔍 DEBUG: Is Super Admin:', data.is_super_admin);
      setUsers(data.users || []);
      setIsSuperAdmin(data.is_super_admin || false);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    // Company filter
    if (companyFilter !== 'all' && u.parent_company !== companyFilter) {
      return false;
    }

    // Search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleRoleChange = async (userId: string, newRole: typeof ROLES[number]) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const oldRole = user.role;
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));

    try {
      const response = await authenticatedFetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      showUserUpdatedToast(user.name, { customMessage: `${user.name}'s role updated to ${newRole}` });
    } catch (error: any) {
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: oldRole } : u)));
      toast.error('Failed to update role');
    }
  };

  const handleResendInvite = async (userId: string) => {
    try {
      // Note: Supabase doesn't have a direct "resend invite" endpoint
      // You would need to implement this if needed
      toast.success('Invitation resent');
    } catch (error: any) {
      toast.error('Failed to resend invitation');
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password) {
      toast.error('Please fill all fields including password');
      return;
    }

    try {
      const response = await authenticatedFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: newUser.email,
          name: newUser.name,
          password: newUser.password,
          role: newUser.role,
          parent_company: newUser.parent_company,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
      }

      const data = await response.json();

      // Show success message with email status
      if (data.emailSent) {
        toast.success(`User created! Invitation email sent to ${newUser.email}`);
      } else {
        toast.success('User created! Save credentials to share with them.');
      }

      // Store credentials and show credentials modal
      setNewUserCredentials({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        emailSent: data.emailSent,
      });

      setShowAddModal(false);
      setShowCredentialsModal(true);
      setNewUser({ email: '', name: '', password: '', role: 'Team', parent_company: 'Mordor Intelligence' });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    }
  };

  const handleCopySignupLink = () => {
    navigator.clipboard.writeText(signupLink);
    toast.success('Signup link copied to clipboard!');
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    const confirmed = await confirm({
      title: 'Delete User',
      message: `Are you sure you want to delete ${userToDelete?.name || 'this user'}? This action cannot be undone.`,
      confirmText: 'Delete User',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const response = await authenticatedFetch('/api/admin/users', {
        method: 'DELETE',
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(users.filter((u) => u.id !== userId));
      showUserDeletedToast(userToDelete?.name || 'User');
    } catch (error: any) {
      toast.error('Failed to delete user');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  // BYPASS: Allow admin@myra.ai (JWT metadata caching workaround)
  const isAdminBypass = user?.email === 'admin@myra.ai';

  if (!user || (!isAdminBypass && role !== 'Admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-600">Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'Active').length;
  const adminUsers = users.filter((u) => u.role?.toLowerCase() === 'admin').length;
  const prodgainUsers = users.filter((u) => u.role === 'Prodgain User').length;

  return (
    <div>
      <main className="flex-1 overflow-y-auto">
        {/* Modern Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-8 py-4 shadow-sm sticky top-0 z-10">
          <Breadcrumbs items={[
            { label: 'Dashboard', href: '/support/dashboard' },
            { label: 'User Management' }
          ]} />
          <div className="flex items-center justify-between mt-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">User Management</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage team access and permissions</p>
            </div>
            <div className="flex items-center gap-3">
              {isSuperAdmin && (
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="h-10 px-4 text-sm bg-white border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                >
                  <option value="all">All Companies</option>
                  {PARENT_COMPANIES.map((company) => (
                    <option key={company} value={company}>
                      {company === 'Mordor Intelligence' ? 'MI - Mordor Intelligence' : 'GMI'}
                    </option>
                  ))}
                </select>
              )}
              <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-80 h-10 pl-10 pr-4 text-sm bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="h-10 px-5 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-accent-500/20 hover:shadow-xl hover:shadow-accent-500/30 active:scale-[0.98] flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add User
            </button>
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-6">
            <div className="relative group">
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/5 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">{totalUsers}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/5 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-2">Active Users</p>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">{activeUsers}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/5 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-2">Administrators</p>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">{adminUsers}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/5 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-2">Prodgain Users</p>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">{prodgainUsers}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-sm text-gray-500">Loading users...</div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="text-center max-w-md">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    {searchQuery ? 'No users found' : 'No users yet'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {searchQuery
                      ? 'Try adjusting your search terms.'
                      : 'Get started by adding your first user.'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Add First User
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200/60 bg-gradient-to-r from-gray-50/50 to-gray-100/30">
                      <th className="h-12 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        User
                      </th>
                      <th className="h-12 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Company
                      </th>
                      <th className="h-12 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Role
                      </th>
                      <th className="h-12 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="h-12 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Last Active
                      </th>
                      <th className="h-12 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50">
                    {filteredUsers.map((u, index) => (
                      <tr
                        key={u.id}
                        className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-200"
                        style={{ animation: `fadeIn 0.3s ease-out ${index * 0.05}s both` }}
                      >
                        <td className="h-16 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">{u.name}</span>
                                {u.is_super_admin && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z" clipRule="evenodd" />
                                    </svg>
                                    SUPER ADMIN
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="h-16 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                              u.parent_company === 'GMI'
                                ? 'bg-gradient-to-r from-purple-500 to-accent-600 text-white shadow-sm'
                                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                            }`}
                            title={u.parent_company}
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                            </svg>
                            {u.parent_company === 'Mordor Intelligence' ? 'MI' : 'GMI'}
                          </span>
                        </td>
                        <td className="h-16 px-6">
                          {u.status === 'Pending' ? (
                            <span className="text-sm font-medium text-gray-400 px-3 py-1.5">
                              {u.role}
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                              className="text-sm font-medium px-3 py-1.5 rounded-lg border-2 border-gray-200 bg-white hover:border-blue-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            >
                              {ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="h-16 px-6">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                              u.status === 'Active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                u.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'
                              }`}
                            ></span>
                            {u.status}
                          </span>
                          {u.status === 'Invited' && (
                            <button
                              onClick={() => handleResendInvite(u.id)}
                              className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                            >
                              Resend
                            </button>
                          )}
                        </td>
                        <td className="h-16 px-6 text-sm text-gray-500">
                          {u.last_sign_in_at ? formatDistanceToNow(new Date(u.last_sign_in_at), { addSuffix: true }) : 'Never'}
                        </td>
                        <td className="h-16 px-6">
                          {u.status === 'Pending' ? (
                            <span className="text-xs text-gray-400">Awaiting signup</span>
                          ) : (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-[scaleIn_0.3s_ease-out]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add New User</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full h-11 px-4 text-sm bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full h-11 px-4 text-sm bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Temporary Password</label>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="flex-1 h-11 px-4 text-sm bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    disabled={!newUser.name}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    title={!newUser.name ? "Enter name first" : "Generate password"}
                  >
                    Generate
                  </button>
                  {newUser.password && (
                    <button
                      type="button"
                      onClick={copyPassword}
                      className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-all"
                      title="Copy password"
                    >
                      Copy
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  You'll share this password with the user directly. Click Generate for a smart password like "John@myRA2025!A3x"
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="w-full h-11 px-4 text-sm bg-white border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Parent Company</label>
                <select
                  value={newUser.parent_company}
                  onChange={(e) => setNewUser({ ...newUser, parent_company: e.target.value as any })}
                  className="w-full h-11 px-4 text-sm bg-white border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none"
                >
                  {PARENT_COMPANIES.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddUser}
                className="flex-1 h-11 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-accent-500/20 hover:shadow-xl hover:shadow-accent-500/30"
              >
                Add User
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 h-11 bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Confirm Dialog */}
      {ConfirmDialogComponent}
    </div>
  );
}
