'use client';

import { useEffect, useState } from 'react';
import { X, Mail, User, Briefcase, Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UserProfilePanelProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

interface UserStats {
  assignedTickets: number;
  resolvedTickets: number;
  recentActivity: {
    action: string;
    timestamp: string;
  }[];
}

export function UserProfilePanel({ userId, isOpen, onClose }: UserProfilePanelProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
    }
  }, [isOpen, userId]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Fetch user details from auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error fetching user:', userError);
        return;
      }

      // For now, use mock data - in production, fetch from admin API
      const userProfile: UserProfile = {
        id: userId,
        email: user?.email || 'user@example.com',
        name: user?.user_metadata?.name || user?.user_metadata?.full_name || 'User Name',
        role: user?.user_metadata?.role || 'Team',
      };

      setProfile(userProfile);

      // Fetch user stats
      const { data: assignedTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, status')
        .eq('assigned_to', userId);

      if (!ticketsError && assignedTickets) {
        const resolved = assignedTickets.filter(
          (t) => t.status === 'Resolved' || t.status === 'Closed'
        ).length;

        setStats({
          assignedTickets: assignedTickets.length,
          resolvedTickets: resolved,
          recentActivity: [
            { action: 'Commented on TKT-0123', timestamp: '2 hours ago' },
            { action: 'Resolved TKT-0122', timestamp: '5 hours ago' },
            { action: 'Updated TKT-0121', timestamp: '1 day ago' },
          ],
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-700';
      case 'Team':
        return 'bg-blue-100 text-blue-700';
      case 'AM':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">User Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-73px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : profile ? (
            <div className="p-6 space-y-6">
              {/* Avatar and basic info */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white mb-4">
                  {getInitials(profile.name)}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  {profile.name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Mail className="w-4 h-4" />
                  {profile.email}
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(
                    profile.role
                  )}`}
                >
                  <Briefcase className="w-3 h-3 mr-1" />
                  {profile.role}
                </span>
              </div>

              {/* Stats */}
              {stats && (
                <>
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">
                      Statistics
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-700">
                          {stats.assignedTickets}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Assigned Tickets
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-700">
                          {stats.resolvedTickets}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Resolved Tickets
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Recent Activity
                    </h4>
                    <div className="space-y-3">
                      {stats.recentActivity.map((activity, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 text-sm"
                        >
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-gray-900">{activity.action}</div>
                            <div className="text-xs text-gray-500">
                              {activity.timestamp}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="border-t border-gray-200 pt-6">
                <button
                  onClick={() => {
                    window.location.href = `mailto:${profile.email}`;
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Send Email
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">User not found</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
