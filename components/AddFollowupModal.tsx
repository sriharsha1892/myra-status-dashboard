// @ts-nocheck
'use client';

import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { formatErrorForToast, getErrorMessage } from '@/lib/errorHandler';
import { showErrorWithReport } from '@/components/ErrorToastWithReport';
import { FormInput, FormSelect, FormTextarea } from '@/components/forms';
import type { SelectOption } from '@/components/forms';
import { useLoadingState } from '@/lib/hooks';
import {
  createFollowupSchema,
  FOLLOWUP_STATUSES,
} from '@/lib/validation/schemas/trialManagement';
import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';

interface AddFollowupModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Status options with descriptive labels
const STATUS_OPTIONS: SelectOption[] = [
  { value: 'scheduled', label: '📅 Scheduled' },
  { value: 'pending', label: '⏰ Pending' },
  { value: 'completed', label: '✅ Completed' },
  { value: 'cancelled', label: '❌ Cancelled' },
];

export default function AddFollowupModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
}: AddFollowupModalProps) {
  const supabase = createClient();

  // Use form validation hook
  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
    resetForm,
  } = useFormValidation(createFollowupSchema, {
    title: '',
    description: '',
    followup_date: '',
    followup_time: '',
    followup_type: '',
    assigned_to: '',
    status: 'scheduled' as typeof FOLLOWUP_STATUSES[number],
  });

  // Use loading state hook
  const { isLoading, execute } = useLoadingState();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form with Zod
    if (!validateForm()) {
      return;
    }

    await execute(
      async () => {
        const { error } = await supabase.from('followup_schedules').insert([
          {
            org_id: orgId,
            title: formData.title.trim(),
            description: formData.description || null,
            followup_date: formData.followup_date,
            followup_time: formData.followup_time || null,
            followup_type: formData.followup_type || null,
            assigned_to: formData.assigned_to || null,
            status: formData.status,
          },
        ]);

        if (error) throw error;

        return { success: true };
      },
      {
        successMessage: 'Follow-up scheduled successfully',
        errorMessage: 'Failed to schedule follow-up',
        onSuccess: () => {
          resetForm();
          onClose();
          onSuccess();
        },
        onError: async (error) => {
          console.error('Error adding follow-up:', error);

          // Get current user for error reporting
          const { data: { user } } = await supabase.auth.getUser();
          const errorDetails = getErrorMessage(error, 'followup_create');

          // Show error with report option
          showErrorWithReport(
            error,
            'followup_create',
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Schedule Follow-up</h2>
            <p className="text-sm text-gray-500 mt-1">Create a new follow-up activity</p>
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
          <FormInput
            label="Title"
            type="text"
            required
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            error={errors.title}
            placeholder="e.g., Demo call, Requirements review, Check-in call"
            helperText="Brief title describing the follow-up"
          />

          <FormTextarea
            label="Description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            error={errors.description}
            placeholder="Details about the follow-up activity..."
            rows={3}
            helperText="Optional: Additional context about this follow-up"
          />

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Follow-up Date"
              type="date"
              required
              value={formData.followup_date}
              onChange={(e) => handleInputChange('followup_date', e.target.value)}
              error={errors.followup_date}
              helperText="When to follow up"
            />

            <FormInput
              label="Time"
              type="time"
              value={formData.followup_time}
              onChange={(e) => handleInputChange('followup_time', e.target.value)}
              error={errors.followup_time}
              helperText="Optional: Specific time"
            />
          </div>

          {/* Type and Assigned To */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Follow-up Type"
              type="text"
              value={formData.followup_type}
              onChange={(e) => handleInputChange('followup_type', e.target.value)}
              error={errors.followup_type}
              placeholder="e.g., Call, Email, Meeting"
              helperText="Optional: Communication method"
            />

            <FormInput
              label="Assigned To"
              type="text"
              value={formData.assigned_to}
              onChange={(e) => handleInputChange('assigned_to', e.target.value)}
              error={errors.assigned_to}
              placeholder="Person responsible"
              helperText="Optional: Who will handle this"
            />
          </div>

          <FormSelect
            label="Status"
            required
            options={STATUS_OPTIONS}
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            error={errors.status}
            helperText="Current state of this follow-up"
          />

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2 items-start">
              <span className="text-lg mt-0.5">💡</span>
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Keep your team aligned
                </p>
                <p className="text-xs text-blue-800 mt-1">
                  Schedule follow-ups to ensure timely communication with your customers and manage the trial engagement effectively.
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
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Schedule Follow-up</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
