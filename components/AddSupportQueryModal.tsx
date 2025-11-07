// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface TrialUser {
  user_id: string;
  name: string;
}

interface AddSupportQueryModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId?: string;
}

const QUERY_TYPES = [
  { value: 'general_support', label: 'General Support' },
  { value: 'security_related', label: 'Security Related' },
  { value: 'functionality_related', label: 'Functionality Related' },
  { value: 'onboard_more_users', label: 'Onboard More Users' },
  { value: 'technical_guidance', label: 'Technical Guidance' },
  { value: 'other', label: 'Other' },
];

export default function AddSupportQueryModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
  userId,
}: AddSupportQueryModalProps) {
  const [loading, setLoading] = useState(false);
  const [trialUsers, setTrialUsers] = useState<TrialUser[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  // Form state
  const [queryType, setQueryType] = useState('general_support');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUserLevel, setIsUserLevel] = useState(!!userId);
  const [selectedUserId, setSelectedUserId] = useState(userId || '');

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && !userId) {
      fetchTrialUsers();
    }
  }, [isOpen, userId]);

  const fetchTrialUsers = async () => {
    setFetchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('trial_users')
        .select('user_id, name')
        .eq('org_id', orgId)
        .order('name');

      if (error) throw error;
      setTrialUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching trial users:', error);
      toast.error('Failed to load trial users');
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Query title is required');
      return;
    }

    if (isUserLevel && !selectedUserId) {
      toast.error('Please select a user for user-level query');
      return;
    }

    setLoading(true);
    try {
      // Get current user info from auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        toast.error('You must be logged in to create a support query');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('trial_support_queries').insert({
        org_id: orgId,
        user_id: isUserLevel ? selectedUserId : null,
        query_type: queryType,
        title: title,
        description: description || null,
        status: 'open',
        created_by: authUser.id,
        created_by_role: 'account_manager', // Will be set based on actual user role
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success('Support query logged successfully');
      resetForm();
      onClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating support query:', error);
      toast.error(error.message || 'Failed to log support query');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQueryType('general_support');
    setTitle('');
    setDescription('');
    setIsUserLevel(!!userId);
    setSelectedUserId(userId || '');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Log Support Query</h2>
            <p className="text-sm text-gray-500 mt-1">Record a support request or question from the trial organization</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Query Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Query Type *
            </label>
            <select
              value={queryType}
              onChange={(e) => setQueryType(e.target.value)}
              className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {QUERY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Query Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Login page not loading"
              className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional context about this query..."
              rows={4}
              className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Query Level Selection */}
          {!userId && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-900">Query Level</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="queryLevel"
                    value="org"
                    checked={!isUserLevel}
                    onChange={() => {
                      setIsUserLevel(false);
                      setSelectedUserId('');
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-900 font-medium">Organization Level</span>
                  <span className="text-xs text-gray-500 ml-auto">Applies to the entire organization</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="queryLevel"
                    value="user"
                    checked={isUserLevel}
                    onChange={() => setIsUserLevel(true)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-900 font-medium">User Level</span>
                  <span className="text-xs text-gray-500 ml-auto">Specific to a user in the organization</span>
                </label>
              </div>
            </div>
          )}

          {/* User Selection (for user-level queries) */}
          {isUserLevel && !userId && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Select User *
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={fetchingUsers}
                className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">
                  {fetchingUsers ? 'Loading users...' : 'Select a user'}
                </option>
                {trialUsers.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Initial Status:</span> Open
            </p>
            <p className="text-sm text-blue-800 mt-1">
              Product and Admin teams can update the status to "in_progress", "resolved", or "closed".
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-all duration-200 border border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Logging...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Log Query</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
