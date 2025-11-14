'use client';

import { useState, useEffect } from 'react';
import { Users, Activity, UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import UpdatesTab from './UpdatesTab';
import toast from 'react-hot-toast';

interface PeopleEngagementTabProps {
  orgId: string;
  users: any[];
  onAddUser: () => void;
  onEditUser: (user: any) => void;
  onDeleteUser: (userId: string) => void;
}

export default function PeopleEngagementTab({
  orgId,
  users,
  onAddUser,
  onEditUser,
  onDeleteUser,
}: PeopleEngagementTabProps) {
  const [activeSection, setActiveSection] = useState<'people' | 'activity'>('people');
  const [platformUsers, setPlatformUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Fetch platform users from trial_users table
  useEffect(() => {
    if (activeSection === 'people') {
      fetchPlatformUsers();
    }
  }, [orgId, activeSection]);

  const fetchPlatformUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trial_users')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlatformUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching platform users:', error);
      toast.error('Failed to load platform users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Toggle - 2 sections (merged people view + activity) */}
      <div className="flex items-center gap-2 p-1 bg-white/60 backdrop-blur-xl border border-gray-200 rounded-xl inline-flex">
        <button
          onClick={() => setActiveSection('people')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeSection === 'people'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white/80'
          }`}
        >
          <Users className="w-4 h-4" />
          People
        </button>
        <button
          onClick={() => setActiveSection('activity')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeSection === 'activity'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white/80'
          }`}
        >
          <Activity className="w-4 h-4" />
          User Activity
        </button>
      </div>

      {/* Content */}
      {activeSection === 'people' && (
        <MergedPeopleSection
          stakeholders={users}
          platformUsers={platformUsers}
          loading={loading}
          onAddUser={onAddUser}
          onEditUser={onEditUser}
          onDeleteUser={onDeleteUser}
        />
      )}

      {activeSection === 'activity' && (
        <UpdatesTab orgId={orgId} />
      )}
    </div>
  );
}

// Merged People Section - Combines Stakeholders and Platform Users
function MergedPeopleSection({
  stakeholders,
  platformUsers,
  loading,
  onAddUser,
  onEditUser,
  onDeleteUser,
}: {
  stakeholders: any[];
  platformUsers: any[];
  loading: boolean;
  onAddUser: () => void;
  onEditUser: (user: any) => void;
  onDeleteUser: (userId: string) => void;
}) {
  // Determine if a user is an active platform user
  const isActivePlatformUser = (user: any) => {
    return user.last_active_at || ['active', 'power_user', 'building', 'testing', 'integrating', 'pilot', 'production_ready'].includes(user.current_stage?.toLowerCase());
  };

  // Create merged list with platform user info
  const mergedUsers = stakeholders.map(user => {
    const platformUser = platformUsers.find(pu => pu.user_id === user.user_id || pu.email === user.email);
    return {
      ...user,
      isPlatformUser: !!platformUser,
      isActive: platformUser ? isActivePlatformUser(platformUser) : false,
      platformStage: platformUser?.current_stage
    };
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">People & Contacts</h3>
          <p className="text-sm text-gray-600 mt-1">Stakeholders and platform users for this trial</p>
        </div>
        <button
          onClick={onAddUser}
          className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white text-sm font-semibold rounded-lg hover:bg-accent-600 transition-all shadow-md"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Contact
        </button>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : mergedUsers.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No contacts yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Add contacts and decision makers to track relationships
          </p>
          <button
            onClick={onAddUser}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent-500 text-white font-semibold rounded-lg hover:bg-accent-600 transition-all shadow-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add First Contact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mergedUsers.map((user) => (
            <div
              key={user.user_id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{user.name}</h4>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {/* Role badge */}
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  user.role === 'Decision Maker' ? 'bg-accent-100 text-purple-800' :
                  user.role === 'Influencer' ? 'bg-blue-100 text-blue-800' :
                  user.role === 'Champion' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {user.role || 'Contact'}
                </span>
                {/* Current stage badge */}
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  user.current_stage === 'Engaged' ? 'bg-green-100 text-green-800' :
                  user.current_stage === 'Interested' ? 'bg-blue-100 text-blue-800' :
                  user.current_stage === 'Cold' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {user.current_stage || 'Unknown'}
                </span>
                {/* Active User badge for platform users */}
                {user.isPlatformUser && user.isActive && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    Active User
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEditUser(user)}
                  className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDeleteUser(user.user_id)}
                  className="flex-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
