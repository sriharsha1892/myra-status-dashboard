'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import AddPlatformUserModal from './AddPlatformUserModal';

interface PlatformUser {
  user_id: string;
  org_id: string;
  name: string;
  email: string;
  role: string | null;
  phone: string | null;
  salesforce_id: string | null;
  current_stage: string;
  account_manager: string;
  sales_poc: string | null;
  created_at: string;
  last_active_at: string | null;
  invited_at: string;
}

interface PlatformUsersTabProps {
  orgId: string;
}

const STAGE_COLORS: Record<string, { bg: string; badge: string; text: string }> = {
  invited: { bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700', text: 'gray' },
  onboarding: { bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', text: 'blue' },
  exploring: { bg: 'bg-cyan-50', badge: 'bg-cyan-100 text-cyan-700', text: 'cyan' },
  building: { bg: 'bg-accent-50', badge: 'bg-accent-100 text-accent-700', text: 'purple' },
  testing: { bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700', text: 'yellow' },
  integrating: { bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', text: 'orange' },
  pilot: { bg: 'bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700', text: 'indigo' },
  evaluating: { bg: 'bg-pink-50', badge: 'bg-pink-100 text-pink-700', text: 'pink' },
  production_ready: { bg: 'bg-green-50', badge: 'bg-green-100 text-green-700', text: 'green' },
  blocked: { bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', text: 'red' },
  stalled: { bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700', text: 'amber' },
  inactive: { bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-600', text: 'gray' },
};

const STAGE_LABELS: Record<string, string> = {
  invited: 'Invited',
  onboarding: 'Onboarding',
  exploring: 'Exploring',
  building: 'Building',
  testing: 'Testing',
  integrating: 'Integrating',
  pilot: 'Pilot',
  evaluating: 'Evaluating',
  production_ready: 'Production Ready',
  blocked: 'Blocked',
  stalled: 'Stalled',
  inactive: 'Inactive',
};

export default function PlatformUsersTab({ orgId }: PlatformUsersTabProps) {
  const supabase = createClient();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPlatformUsers();
  }, [orgId]);

  const fetchPlatformUsers = async () => {
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
      console.error('Error fetching platform users:', error);
      toast.error('Failed to load platform users');
    } finally {
      setLoading(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesStage = filterStage === 'all' || user.current_stage === filterStage;
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: users.length,
    byStage: Object.keys(STAGE_LABELS).reduce(
      (acc, stage) => ({
        ...acc,
        [stage]: users.filter((u) => u.current_stage === stage).length,
      }),
      {} as Record<string, number>
    ),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading platform users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-blue-700">Total Users</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-600">{stats.byStage.production_ready}</div>
          <div className="text-sm text-green-700">Production Ready</div>
        </div>
        <div className="bg-accent-50 rounded-lg p-4 border border-accent-200">
          <div className="text-2xl font-bold text-accent-600">{stats.byStage.building}</div>
          <div className="text-sm text-accent-700">Building</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="text-2xl font-bold text-red-600">{stats.byStage.blocked}</div>
          <div className="text-sm text-red-700">Blocked</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 w-full md:flex-1">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Stage Filter */}
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Stages</option>
              {Object.entries(STAGE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label} ({stats.byStage[value as keyof typeof stats.byStage]})
                </option>
              ))}
            </select>
          </div>

          {/* Add User Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            + Add Platform User
          </button>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600 mt-4">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM4 20h16a2 2 0 002-2v-2a3 3 0 00-3-3H5a3 3 0 00-3 3v2a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Platform Users Found</h3>
          <p className="text-gray-600 mb-6">
            {users.length === 0
              ? 'No platform users have been added yet. Start tracking actual users using the platform.'
              : 'No users match your filters. Try adjusting your search.'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Add First Platform User
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredUsers.map((user) => {
            const colors = STAGE_COLORS[user.current_stage] || STAGE_COLORS.invited;

            return (
              <Link
                key={user.user_id}
                href={`/trials/users/${user.user_id}`}
                className={`block ${colors.bg} rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-6 border border-neutral-200`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* User Header */}
                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                        {user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.role && <p className="text-xs text-gray-500 mt-1">{user.role}</p>}
                      </div>
                    </div>

                    {/* Stage Badge */}
                    <div className="flex flex-wrap gap-2 items-center mb-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${colors.badge}`}>
                        {STAGE_LABELS[user.current_stage]}
                      </span>
                      {user.salesforce_id && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {user.salesforce_id}
                        </span>
                      )}
                    </div>

                    {/* Account Manager & POC */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs">Account Manager:</span>
                        <p className="font-medium text-gray-800">{user.account_manager}</p>
                      </div>
                      {user.sales_poc && (
                        <div>
                          <span className="text-gray-500 text-xs">Sales POC:</span>
                          <p className="font-medium text-gray-800">{user.sales_poc}</p>
                        </div>
                      )}
                    </div>

                    {/* Timestamps */}
                    <div className="mt-3 text-xs text-gray-500">
                      <p>
                        Added: {format(new Date(user.created_at), 'MMM dd, yyyy')}
                        {user.last_active_at && ` • Last active: ${format(new Date(user.last_active_at), 'MMM dd, yyyy')}`}
                      </p>
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <svg className="w-6 h-6 text-gray-400 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Add Platform User Modal */}
      <AddPlatformUserModal
        isOpen={showAddModal}
        orgId={orgId}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          fetchPlatformUsers();
          setShowAddModal(false);
        }}
      />
    </div>
  );
}
