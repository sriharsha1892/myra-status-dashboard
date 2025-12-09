'use client';

import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { formatErrorForToast, getErrorMessage } from '@/lib/errorHandler';
import { showErrorWithReport } from '@/components/ErrorToastWithReport';
import { FormInput, FormSelect, FormTextarea } from '@/components/forms';
import type { SelectOption } from '@/components/forms';
import { useLoadingState } from '@/lib/hooks';
import {
  createTopicSchema,
  TOPIC_STATUSES,
  TOPIC_PRIORITIES,
} from '@/lib/validation/schemas/trialManagement';
import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';

interface AddTopicModalProps {
  isOpen: boolean;
  userId: string;
  orgId: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Status options with descriptive labels
const STATUS_OPTIONS: SelectOption[] = [
  { value: 'exploring', label: 'Exploring' },
  { value: 'implementing', label: 'Implementing' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'abandoned', label: 'Abandoned' },
];

// Priority options
const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export default function AddTopicModal({
  isOpen,
  userId,
  orgId,
  onClose,
  onSuccess,
}: AddTopicModalProps) {
  const supabase = createClient();

  // Use form validation hook
  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
    resetForm,
  } = useFormValidation(createTopicSchema, {
    topic_name: '',
    description: '',
    status: 'exploring' as typeof TOPIC_STATUSES[number],
    priority: 'medium' as typeof TOPIC_PRIORITIES[number],
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
        const { error } = await supabase.from('user_topics').insert({
          user_id: userId,
          org_id: orgId,
          topic_name: formData.topic_name,
          description: formData.description || null,
          status: formData.status,
          priority: formData.priority,
        });

        if (error) throw error;

        return { success: true };
      },
      {
        successMessage: 'Topic added successfully!',
        errorMessage: 'Failed to add topic',
        onSuccess: () => {
          resetForm();
          onClose();
          onSuccess();
        },
        onError: async (error) => {
          console.error('Error adding topic:', error);

          // Get current user for error reporting
          const { data: { user } } = await supabase.auth.getUser();
          const errorDetails = getErrorMessage(error, 'generic');

          // Show error with report option
          showErrorWithReport(
            error,
            'generic',
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Add Topic/Use Case</h2>
            <p className="text-green-100 text-sm mt-1">Track areas where the user is exploring our platform</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-green-100 transition text-2xl"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <FormInput
            label="Topic Name"
            type="text"
            required
            value={formData.topic_name}
            onChange={(e) => handleInputChange('topic_name', e.target.value)}
            error={errors.topic_name}
            placeholder="e.g., Invoice Processing Automation"
            helperText="Name of the use case or feature the user is interested in"
          />

          <FormTextarea
            label="Description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            error={errors.description}
            placeholder="Provide details about this topic, requirements, or goals..."
            rows={4}
            helperText="Optional: Additional context about this topic"
          />

          {/* Status and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label="Status"
              required
              options={STATUS_OPTIONS}
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              error={errors.status}
              helperText="Current progress on this topic"
            />

            <FormSelect
              label="Priority"
              required
              options={PRIORITY_OPTIONS}
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              error={errors.priority}
              helperText="Importance to the customer"
            />
          </div>

          {/* Status Reference */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">Status Definitions:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Exploring:</strong> User is evaluating if this solves their need</li>
              <li>• <strong>Implementing:</strong> User is actively building/testing this</li>
              <li>• <strong>Implemented:</strong> User has successfully deployed this</li>
              <li>• <strong>Blocked:</strong> User hit a blocker and can't proceed</li>
              <li>• <strong>Abandoned:</strong> User decided not to pursue this</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
