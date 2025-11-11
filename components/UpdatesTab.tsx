'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Plus, User, Calendar, Sparkles, Clock } from 'lucide-react';
import { format } from 'date-fns';
import AddUserActivityModal from '@/components/AddUserActivityModal';

interface TrialUser {
  user_id: string;
  name: string;
  email: string;
  role?: string;
}

interface UserActivity {
  id: string;
  user_id: string;
  user_name: string;
  activity_type: string;
  title: string;
  description: string;
  created_at: string;
  created_by_name?: string;
}

interface UpdatesTabProps {
  orgId: string;
}

export default function UpdatesTab({ orgId }: UpdatesTabProps) {
  const [users, setUsers] = useState<TrialUser[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch trial users
      const { data: usersData, error: usersError } = await supabase
        .from('trial_users')
        .select('user_id, name, email, role')
        .eq('org_id', orgId)
        .order('name');

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch user activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('trial_user_activities')
        .select(`
          id,
          user_id,
          activity_type,
          title,
          description,
          created_at,
          trial_users!inner(name)
        `)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      const formattedActivities = activitiesData?.map((activity: any) => ({
        ...activity,
        user_name: activity.trial_users?.name || 'Unknown User',
      })) || [];

      setActivities(formattedActivities);
    } catch (error: any) {
      console.error('Error fetching updates data:', error);
      toast.error('Failed to load updates');
    } finally {
      setLoading(false);
    }
  };

  const activityTypeLabels: Record<string, { label: string; icon: string; color: string }> = {
    login: { label: 'Logged In', icon: '🔐', color: 'bg-blue-100 text-blue-800' },
    question_asked: { label: 'Asked Question', icon: '❓', color: 'bg-accent-100 text-purple-800' },
    report_generated: { label: 'Generated Report', icon: '📊', color: 'bg-green-100 text-green-800' },
    ppt_created: { label: 'Created PPT', icon: '📽️', color: 'bg-indigo-100 text-indigo-800' },
    agent_paused: { label: 'Agent Paused', icon: '⏸️', color: 'bg-yellow-100 text-yellow-800' },
    initial_contact: { label: 'Initial Contact', icon: '👋', color: 'bg-cyan-100 text-cyan-800' },
    feature_used: { label: 'Used Feature', icon: '⭐', color: 'bg-pink-100 text-pink-800' },
    feedback: { label: 'Gave Feedback', icon: '💬', color: 'bg-orange-100 text-orange-800' },
    other: { label: 'Other Activity', icon: '📝', color: 'bg-gray-100 text-gray-800' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Activity Updates</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track individual user engagement and platform usage
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Add Update</span>
        </button>
      </div>

      {/* Users Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Trial Users ({users.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((user) => {
            const userActivities = activities.filter(a => a.user_id === user.user_id);
            return (
              <div
                key={user.user_id}
                className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-600 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold text-blue-700">{userActivities.length}</span> activities logged
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Activity Timeline
        </h3>

        {activities.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No activities logged yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Start tracking user engagement by adding updates
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Add First Update
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const activityConfig = activityTypeLabels[activity.activity_type] || activityTypeLabels.other;
              const isLatest = index === 0;

              return (
                <div
                  key={activity.id}
                  className={`relative pl-8 pb-4 ${
                    index !== activities.length - 1 ? 'border-l-2 border-gray-200' : ''
                  }`}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 top-0 w-4 h-4 rounded-full border-2 border-white ${
                      isLatest ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-gray-300'
                    }`}
                    style={{ transform: 'translateX(-9px)' }}
                  />

                  {/* Activity Card */}
                  <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${
                    isLatest ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Activity Type Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${activityConfig.color}`}>
                            <span>{activityConfig.icon}</span>
                            {activityConfig.label}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                            <User className="w-3 h-3" />
                            {activity.user_name}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="font-semibold text-gray-900 mb-1">{activity.title}</h4>

                        {/* Description */}
                        {activity.description && (
                          <div
                            className="text-sm text-gray-700 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: activity.description }}
                          />
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Update Modal */}
      <AddUserActivityModal
        orgId={orgId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
