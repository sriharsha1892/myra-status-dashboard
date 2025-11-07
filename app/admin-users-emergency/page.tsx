'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function AdminUsersEmergencyPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch('/api/admin/users-direct');

        if (!response.ok) {
          throw new Error('Failed to load users');
        }

        const data = await response.json();
        setUsers(data.users || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const oldRole = user.role;
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      alert(`✅ ${user.name}'s role updated to ${newRole}`);
    } catch (error: any) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: oldRole } : u));
      alert(`❌ Failed to update role: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 max-w-md">
          <p className="text-red-900 font-semibold">Error: {error}</p>
        </div>
      </div>
    );
  }

  const ROLES = ['Admin', 'Sales Admin', 'Research Admin', 'Account Manager', 'Product', 'Prodgain User', 'Team'];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-900 font-semibold">🚨 Emergency Admin Access</p>
          <p className="text-red-700 text-sm mt-1">
            No authentication required. For emergency access only.
            <br />
            <a href="/support/users" className="underline">Go to normal users page</a>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Users ({users.length})</h1>
              <p className="text-sm text-gray-600 mt-1">Direct database access</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="h-12 px-6 text-left text-xs font-semibold text-gray-600 uppercase">
                    User
                  </th>
                  <th className="h-12 px-6 text-left text-xs font-semibold text-gray-600 uppercase">
                    Role
                  </th>
                  <th className="h-12 px-6 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="h-12 px-6 text-left text-xs font-semibold text-gray-600 uppercase">
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="h-16 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="h-16 px-6">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg border-2 border-gray-200 bg-white hover:border-blue-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="h-16 px-6">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold ${
                          user.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            user.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                        ></span>
                        {user.status}
                      </span>
                    </td>
                    <td className="h-16 px-6 text-sm text-gray-500">
                      {user.last_sign_in_at
                        ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })
                        : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
