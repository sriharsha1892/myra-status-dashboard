'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface UserProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  last_active: string;
  email?: string;
  assigned_tickets?: number;
}

interface UserInvite {
  id: string;
  email: string;
  role: string;
  created_at: string;
  accepted: boolean;
}

export default function UsersPage() {
  const { user, loading: authLoading, signOut, role } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('AM');
  const [inviting, setInviting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'team')) {
      fetchUsers();
      fetchInvites();
    }
  }, [user, role]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get all users from auth
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Get ticket counts
      const { data: ticketCounts } = await supabase
        .from('tickets')
        .select('assigned_to');

      const countsMap = ticketCounts?.reduce((acc: any, ticket: any) => {
        if (ticket.assigned_to) {
          acc[ticket.assigned_to] = (acc[ticket.assigned_to] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      const usersWithCounts = (profiles || []).map((profile: any) => ({
        ...profile,
        assigned_tickets: countsMap[profile.user_id] || 0,
      }));

      setUsers(usersWithCounts);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('user_invites')
        .select('*')
        .eq('accepted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error: any) {
      console.error('Error fetching invites:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        // -ignore - Supabase typing issue with dynamic columns

        .from('user_profiles')
        // @ts-ignore - Supabase typing issue with dynamic columns
        // -ignore - Supabase typing issue with dynamic columns

        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
      toast.success('Role updated successfully');
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    try {
      // Generate random token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { error } = await supabase
        // -ignore - Supabase typing issue with dynamic columns

        .from('user_invites')
        // @ts-ignore - Supabase typing issue with dynamic columns
        // -ignore - Supabase typing issue with dynamic columns

        .insert([{
          email: inviteEmail,
          role: inviteRole,
          invited_by: user?.id,
          token,
          expires_at: expiresAt.toISOString(),
        }]);

      if (error) throw error;

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteModal(false);
      fetchInvites();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('user_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      toast.success('Invitation cancelled');
      fetchInvites();
    } catch (error: any) {
      console.error('Error cancelling invite:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const getInitials = (email?: string, name?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || (role?.toLowerCase() !== 'admin' && role !== 'Team')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Unauthorized access</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-14 px-4 flex items-center border-b border-gray-200">
          <h1 className="text-sm font-semibold text-gray-900">myRA AI Support</h1>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => router.push('/support/dashboard')}
            className="flex items-center h-8 px-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors w-full"
          >
            Dashboard
          </button>
          <button
            onClick={() => router.push('/support/submit')}
            className="flex items-center h-8 px-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors w-full"
          >
            Submit Ticket
          </button>
          <button
            onClick={() => router.push('/support/reports')}
            className="flex items-center h-8 px-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors w-full"
          >
            Reports
          </button>

          <div className="pt-4 pb-2">
            <div className="text-xs font-medium text-gray-500 px-3 mb-1">Settings</div>
            <button className="flex items-center h-8 px-3 text-sm font-medium text-gray-900 bg-gray-100 rounded-md transition-colors w-full">
              Users
            </button>
            <button
              onClick={() => router.push('/support/settings/templates')}
              className="flex items-center h-8 px-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors w-full"
            >
              Templates
            </button>
          </div>
        </nav>

        <div className="p-2 border-t border-gray-200">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 h-10 w-full text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-semibold text-white">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 text-left">
              <div className="text-xs font-medium text-gray-900 truncate">
                {user?.email?.split('@')[0] || 'Admin'}
              </div>
              <div className="text-xs text-gray-500">Sign out</div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
        </header>

        <div className="p-6 space-y-6">
          {/* Users table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Team Members</h3>
              <button
                onClick={() => setShowInviteModal(true)}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Invite User
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-sm text-gray-500">Loading users...</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="h-11 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      User
                    </th>
                    <th className="h-11 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Role
                    </th>
                    <th className="h-11 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Assigned Tickets
                    </th>
                    <th className="h-11 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Last Active
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-gray-50 transition-colors">
                      <td className="h-14 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                            {getInitials(u.email, u.display_name)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {u.display_name || u.email?.split('@')[0]}
                            </div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="h-14 px-6">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
                          className="h-7 px-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Team">Team</option>
                          <option value="AM">AM</option>
                        </select>
                      </td>
                      <td className="h-14 px-6 text-sm text-gray-700">
                        {u.assigned_tickets} {u.assigned_tickets === 1 ? 'ticket' : 'tickets'}
                      </td>
                      <td className="h-14 px-6 text-sm text-gray-500">
                        {formatDistanceToNow(new Date(u.last_active), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pending invites */}
          {invites.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">Pending Invitations</h3>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="h-11 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Email
                    </th>
                    <th className="h-11 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Role
                    </th>
                    <th className="h-11 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Invited
                    </th>
                    <th className="h-11 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invites.map((invite) => (
                    <tr key={invite.id} className="hover:bg-gray-50 transition-colors">
                      <td className="h-12 px-6 text-sm text-gray-900">{invite.email}</td>
                      <td className="h-12 px-6 text-sm text-gray-700">{invite.role}</td>
                      <td className="h-12 px-6 text-sm text-gray-500">
                        {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                      </td>
                      <td className="h-12 px-6">
                        <button
                          onClick={() => handleCancelInvite(invite.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Cancel
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

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Invite User</h3>
            </div>

            <form onSubmit={handleInviteUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                >
                  <option value="AM">Account Manager</option>
                  <option value="Team">Team Member</option>
                  <option value="Admin">Administrator</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="h-9 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
