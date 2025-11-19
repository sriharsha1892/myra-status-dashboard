// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { formatErrorForToast, getErrorMessage } from '@/lib/errorHandler';
import { showErrorWithReport } from '@/components/ErrorToastWithReport';
import { useLoadingState } from '@/lib/hooks';
import { createEngagementLogSchema } from '@/lib/validation/schemas/engagement';
import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';

interface TrialUser {
  user_id: string;
  name: string;
}

interface AddEngagementLogModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId?: string;
}

const ACTIVITY_TYPES = [
  { value: 'user_logged_in', label: 'User Logged In', icon: '🔓' },
  { value: 'usage_observed', label: 'Usage Observed', icon: '📊' },
  { value: 'feedback_received', label: 'Feedback Received', icon: '💬' },
  { value: 'learning_captured', label: 'Learning Captured', icon: '📚' },
  { value: 'follow_up_note', label: 'Follow-up Note', icon: '📝' },
  { value: 'trial_access_provided', label: 'Trial Access Provided', icon: '✅' },
  { value: 'trial_access_requested', label: 'Trial Access Requested', icon: '📋' },
  { value: 'trial_extended', label: 'Trial Extended', icon: '⏱️' },
];

export default function AddEngagementLogModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
  userId,
}: AddEngagementLogModalProps) {
  const supabase = createClient();

  const [trialUsers, setTrialUsers] = useState<TrialUser[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  // Form validation hook
  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
    resetForm,
    setFormData,
  } = useFormValidation(createEngagementLogSchema, {
    activity_type: 'user_logged_in',
    user_id: userId || '',
    description: '',
    observations: '',
  });

  // Use loading state hook
  const { isLoading, execute } = useLoadingState();

  useEffect(() => {
    if (isOpen && !userId) {
      fetchTrialUsers();
    } else if (userId) {
      setFormData((prev) => ({ ...prev, user_id: userId }));
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

    // Validate form with Zod
    if (!validateForm()) {
      return;
    }

    await execute(
      async () => {
        // Get current user info from auth
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          throw new Error('User not authenticated');
        }

        // @ts-ignore - Supabase typing issue with dynamic columns
        const { error } = await supabase.from('trial_engagement_log').insert({
          org_id: orgId,
          user_id: formData.user_id,
          activity_type: formData.activity_type,
          description: formData.description,
          observations: formData.observations || null,
          logged_by: authUser.id,
          logged_by_role: authUser.user_metadata?.role === 'Admin' ? 'admin' : 'product',
          created_at: new Date().toISOString(),
        });

        if (error) throw error;

        return { success: true };
      },
      {
        successMessage: 'Activity logged successfully!',
        errorMessage: 'Failed to log activity',
        onSuccess: () => {
          resetForm();
          onClose();
          onSuccess();
        },
        onError: async (error) => {
          console.error('Error logging activity:', error);

          // Get current user for error reporting
          const { data: { user } } = await supabase.auth.getUser();
          const errorDetails = getErrorMessage(error, 'engagement_log');

          // Show error with report option
          showErrorWithReport(
            error,
            'engagement_log',
            errorDetails.message,
            errorDetails.suggestion,
            user?.email,
            user?.id
          );
        },
      }
    );
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const selectedActivityType = ACTIVITY_TYPES.find((a) => a.value === formData.activity_type);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Log User Activity</h2>
            <p className="text-sm text-gray-500 mt-1">Record engagement and interactions with trial users</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Select User */}
          {!userId && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Select User *
              </label>
              <select
                value={formData.user_id}
                onChange={(e) => handleInputChange('user_id', e.target.value)}
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

          {/* Activity Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Activity Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.activity_type === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="activityType"
                    value={type.value}
                    checked={formData.activity_type === type.value}
                    onChange={(e) => handleInputChange('activity_type', e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-lg">{type.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="What happened? What did the user do or say?"
              rows={3}
              className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              For "User Logged In": Note the time and any context
              <br />
              For "Usage Observed": Describe what features were used
              <br />
              For "Feedback Received": Summarize the feedback
            </p>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Additional Observations
            </label>
            <textarea
              value={formData.observations}
              onChange={(e) => handleInputChange('observations', e.target.value)}
              placeholder="Any additional insights, concerns, or notes..."
              rows={2}
              className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2 items-start">
              <span className="text-lg mt-0.5">{selectedActivityType?.icon}</span>
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  {selectedActivityType?.label || 'Activity Type'}
                </p>
                <p className="text-xs text-blue-800 mt-1">
                  This activity will be logged with your user account and displayed in the organization's activity timeline.
                </p>
              </div>
            </div>
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
              disabled={isLoading}
              className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
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
                  <span>Log Activity</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
