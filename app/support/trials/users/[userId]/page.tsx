'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import LogUserActivityModal from '@/components/LogUserActivityModal';
import AddTopicModal from '@/components/AddTopicModal';
import AddIssueModal from '@/components/AddIssueModal';

interface PlatformUser {
  user_id: string;
  org_id: string;
  name: string;
  email: string;
  role: string | null;
  salesforce_id: string | null;
  current_stage: string;
  account_manager: string;
  created_at: string;
  last_active_at: string | null;
  invited_at: string;
}

const JOURNEY_STAGES = [
  { value: 'invited', label: 'Invited', color: 'gray', description: 'Never logged in, credentials sent' },
  { value: 'low_activity', label: 'Low Activity', color: 'blue', description: 'Logged in but minimal activity' },
  { value: 'active', label: 'Active', color: 'green', description: 'Regular, consistent usage' },
  { value: 'power_user', label: 'Power User', color: 'purple', description: 'Heavy usage, advanced adoption' },
  { value: 'dormant', label: 'Dormant', color: 'gray-400', description: 'Previously active, now inactive' },
];

const STAGE_COLORS: Record<string, string> = {
  invited: 'bg-gray-100 text-gray-700',
  low_activity: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  power_user: 'bg-purple-100 text-purple-700',
  dormant: 'bg-gray-100 text-gray-600',
};

type TabType = 'overview' | 'activities' | 'topics' | 'issues';

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingStage, setEditingStage] = useState(false);
  const [newStage, setNewStage] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trial_users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUser(data);
      setNewStage((data as any)?.current_stage);
    } catch (error: any) {
      console.error('Error fetching user:', error);
      toast.error('Failed to load user details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async () => {
    if (!user || newStage === user.current_stage) {
      setEditingStage(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('trial_users')
        // @ts-ignore - Supabase typing issue with dynamic columns
        .update({ current_stage: newStage })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(`Stage updated to ${JOURNEY_STAGES.find((s) => s.value === newStage)?.label}`);
      setUser({ ...user, current_stage: newStage });
      setEditingStage(false);
    } catch (error: any) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update stage');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h1>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const stageInfo = JOURNEY_STAGES.find((s) => s.value === user.current_stage);
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Organization
        </button>

        {/* User Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-start gap-6 mb-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl">
              {initials}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{user.name}</h1>
              <p className="text-gray-600 text-lg mb-3">{user.email}</p>
              {user.role && <p className="text-gray-500 text-sm">{user.role}</p>}

              {/* Stage Selector */}
              <div className="mt-4 flex items-center gap-4">
                {editingStage ? (
                  <>
                    <select
                      value={newStage}
                      onChange={(e) => setNewStage(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {JOURNEY_STAGES.map((stage) => (
                        <option key={stage.value} value={stage.value}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleStageChange}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingStage(false);
                        setNewStage(user.current_stage);
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${STAGE_COLORS[user.current_stage]}`}>
                      {stageInfo?.label}
                    </span>
                    <button
                      onClick={() => setEditingStage(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Change Stage
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Key Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
            <div>
              <label className="text-sm font-medium text-gray-600">Account Manager</label>
              <p className="text-lg text-gray-900 mt-1">{user.account_manager}</p>
            </div>
            {user.salesforce_id && (
              <div>
                <label className="text-sm font-medium text-gray-600">Salesforce ID</label>
                <p className="text-lg text-gray-900 mt-1 font-mono">{user.salesforce_id}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600">Added</label>
              <p className="text-lg text-gray-900 mt-1">{format(new Date(user.created_at), 'MMM dd, yyyy')}</p>
            </div>
            {user.last_active_at && (
              <div>
                <label className="text-sm font-medium text-gray-600">Last Active</label>
                <p className="text-lg text-gray-900 mt-1">{format(new Date(user.last_active_at), 'MMM dd, yyyy')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 px-6 py-4 text-center font-medium border-b-2 transition ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('activities')}
                className={`flex-1 px-6 py-4 text-center font-medium border-b-2 transition ${
                  activeTab === 'activities'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Activities
              </button>
              <button
                onClick={() => setActiveTab('topics')}
                className={`flex-1 px-6 py-4 text-center font-medium border-b-2 transition ${
                  activeTab === 'topics'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Topics
              </button>
              <button
                onClick={() => setActiveTab('issues')}
                className={`flex-1 px-6 py-4 text-center font-medium border-b-2 transition ${
                  activeTab === 'issues'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Issues
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="text-2xl font-bold text-blue-600">-</div>
                      <div className="text-sm text-blue-700 mt-1">Active Topics</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <div className="text-2xl font-bold text-red-600">-</div>
                      <div className="text-sm text-red-700 mt-1">Open Issues</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="text-2xl font-bold text-green-600">-</div>
                      <div className="text-sm text-green-700 mt-1">Activities Logged</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setShowActivityModal(true)}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Log Activity</p>
                          <p className="text-sm text-gray-600">Track topics or issues</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowTopicModal(true)}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Add Topic</p>
                          <p className="text-sm text-gray-600">New use case to explore</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowIssueModal(true)}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2m-6-4v2m12 0v2m-6-4v2m0-4V9m0 4v2m0-4V9" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Report Issue</p>
                          <p className="text-sm text-gray-600">Log a blocker or problem</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Empty State */}
                <div className="mt-8 p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Activities Yet</h3>
                  <p className="text-gray-600">
                    Start tracking topics, issues, and activities to build a complete picture of this user's journey.
                  </p>
                </div>
              </div>
            )}

            {/* Activities Tab */}
            {activeTab === 'activities' && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Activities</h3>
                <p className="text-gray-600 mb-6">No activities logged yet</p>
                <button
                  onClick={() => setShowActivityModal(true)}
                  className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Log Activity
                </button>
              </div>
            )}

            {/* Topics Tab */}
            {activeTab === 'topics' && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Topics/Use Cases</h3>
                <p className="text-gray-600 mb-6">No topics added yet</p>
                <button
                  onClick={() => setShowTopicModal(true)}
                  className="inline-block px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
                >
                  Add Topic
                </button>
              </div>
            )}

            {/* Issues Tab */}
            {activeTab === 'issues' && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4v2m0 4v2m-6-4v2m12 0v2m-6-4v2m0-4V9m0 4v2m0-4V9" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Issues/Blockers</h3>
                <p className="text-gray-600 mb-6">No issues reported yet</p>
                <button
                  onClick={() => setShowIssueModal(true)}
                  className="inline-block px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                >
                  Report Issue
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">💡 About Platform Users</h3>
          <p className="text-blue-800 text-sm">
            Platform users are actual end-users at your trial organizations using the Myra AI platform. Track their journey
            from initial invitation through production readiness. Activities, topics, and issues will help you monitor adoption
            and identify support needs.
          </p>
        </div>
      </div>

      {/* Modals */}
      <LogUserActivityModal
        isOpen={showActivityModal}
        userId={userId}
        orgId={user?.org_id || ''}
        onClose={() => setShowActivityModal(false)}
        onSuccess={() => {
          setShowActivityModal(false);
          // Optionally refresh user data
        }}
      />

      <AddTopicModal
        isOpen={showTopicModal}
        userId={userId}
        orgId={user?.org_id || ''}
        onClose={() => setShowTopicModal(false)}
        onSuccess={() => {
          setShowTopicModal(false);
          // Optionally refresh user data
        }}
      />

      <AddIssueModal
        isOpen={showIssueModal}
        userId={userId}
        orgId={user?.org_id || ''}
        onClose={() => setShowIssueModal(false)}
        onSuccess={() => {
          setShowIssueModal(false);
          // Optionally refresh user data
        }}
      />
    </div>
  );
}
