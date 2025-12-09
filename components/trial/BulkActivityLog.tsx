'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageSquare, TrendingUp, Calendar, User, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEscapeKey } from '@/hooks/useKeyboardShortcuts';

interface BulkActivityLogProps {
  selectedOrgIds: Set<string>;
  organizationNames: Map<string, string>; // org_id -> org_name
  onSuccess: () => void;
  onClose: () => void;
}

const ACTIVITY_TYPES = [
  { value: 'usage_observed', label: 'Usage Observed', icon: TrendingUp, color: 'blue' },
  { value: 'user_logged_in', label: 'User Login', icon: User, color: 'purple' },
  { value: 'follow_up_note', label: 'Follow-up Note', icon: MessageSquare, color: 'green' },
  { value: 'demo_scheduled', label: 'Demo Scheduled', icon: Calendar, color: 'orange' },
  { value: 'trial_extended', label: 'Trial Extended', icon: Clock, color: 'indigo' },
  { value: 'milestone_achieved', label: 'Milestone Achieved', icon: CheckCircle, color: 'emerald' },
];

export default function BulkActivityLog({
  selectedOrgIds,
  organizationNames,
  onSuccess,
  onClose,
}: BulkActivityLogProps) {
  const { user } = useAuth();
  const [activityType, setActivityType] = useState('follow_up_note');
  const [description, setDescription] = useState('');
  const [processing, setProcessing] = useState(false);

  const supabase = createClient();

  // Close modal on Escape key
  useEscapeKey(onClose, !processing);

  const handleBulkLogActivity = async () => {
    if (!description.trim()) {
      toast.error('Please enter an activity description');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to log activities');
      return;
    }

    setProcessing(true);
    try {
      const orgIds = Array.from(selectedOrgIds);

      // Create activity log entries for all selected organizations
      const activityEntries = orgIds.map((orgId) => ({
        org_id: orgId,
        activity_type: activityType,
        description: description.trim(),
        logged_by: user.id,
        logged_by_role: user.user_metadata?.role || 'account_manager',
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('trial_engagement_log')
        .insert(activityEntries);

      if (insertError) throw insertError;

      // Update last_activity_at for all selected organizations
      const { error: updateError } = await supabase
        .from('trial_organizations')
        .update({
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('org_id', orgIds);

      if (updateError) throw updateError;

      toast.success(
        `Successfully logged activity for ${orgIds.length} organization${orgIds.length !== 1 ? 's' : ''}`,
        {
          icon: '✅',
          duration: 4000,
        }
      );

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error logging bulk activity:', error);
      toast.error('Failed to log activity: ' + (error.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const selectedType = ACTIVITY_TYPES.find((t) => t.value === activityType);
  const Icon = selectedType?.icon || MessageSquare;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-activity-log-title"
      aria-describedby="bulk-activity-log-description"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto p-4 sm:p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-${selectedType?.color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${selectedType?.color}-600`} />
            </div>
            <div>
              <h3 id="bulk-activity-log-title" className="text-lg sm:text-xl font-bold text-gray-900">Bulk Activity Log</h3>
              <p id="bulk-activity-log-description" className="text-xs sm:text-sm text-gray-600">
                Log activity for {selectedOrgIds.size} organization{selectedOrgIds.size !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label="Close bulk activity log modal"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5">
          {/* Selected Organizations Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Selected Organizations</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {Array.from(selectedOrgIds).slice(0, 10).map((orgId) => (
                <div key={orgId} className="flex items-center gap-2 text-sm text-blue-800">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>{organizationNames.get(orgId) || orgId}</span>
                </div>
              ))}
              {selectedOrgIds.size > 10 && (
                <p className="text-xs text-blue-700 font-medium mt-2">
                  + {selectedOrgIds.size - 10} more organizations
                </p>
              )}
            </div>
          </div>

          {/* Activity Type Selection */}
          <div>
            <label id="activity-type-label" className="block text-sm font-semibold text-gray-700 mb-2">
              Activity Type <span className="text-red-500" aria-label="required">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2" role="radiogroup" aria-labelledby="activity-type-label">
              {ACTIVITY_TYPES.map((type) => {
                const TypeIcon = type.icon;
                const isSelected = activityType === type.value;

                return (
                  <button
                    key={type.value}
                    onClick={() => setActivityType(type.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `border-${type.color}-500 bg-${type.color}-50`
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={type.label}
                  >
                    <TypeIcon
                      className={`w-4 h-4 ${
                        isSelected ? `text-${type.color}-600` : 'text-gray-500'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? `text-${type.color}-900` : 'text-gray-700'
                      }`}
                    >
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="activity-description" className="block text-sm font-semibold text-gray-700 mb-2">
              Activity Description <span className="text-red-500" aria-label="required">*</span>
            </label>
            <textarea
              id="activity-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Enter detailed notes about this activity..."
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              aria-required="true"
              aria-invalid={!description.trim()}
            />
            <p className="text-xs text-gray-500 mt-1">
              This description will be added to all {selectedOrgIds.size} selected organizations
            </p>
          </div>

          {/* Warning */}
          {selectedOrgIds.size > 20 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <svg
                className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">Large Bulk Operation</p>
                <p className="text-xs text-yellow-700 mt-1">
                  You're about to log activity for {selectedOrgIds.size} organizations. This may take a few seconds.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={processing}
            className="w-full sm:flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkLogActivity}
            disabled={processing || !description.trim()}
            className="w-full sm:flex-1 h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              `Log Activity for ${selectedOrgIds.size} Org${selectedOrgIds.size !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
