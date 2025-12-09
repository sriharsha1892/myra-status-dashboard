'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { formatErrorForToast, getErrorMessage } from '@/lib/errorHandler';
import { showErrorWithReport } from '@/components/ErrorToastWithReport';
import { FormInput, FormSelect, FormTextarea } from '@/components/forms';
import type { SelectOption } from '@/components/forms';
import { useLoadingState } from '@/lib/hooks';
import {
  createFeatureRequestSchema,
  FEATURE_REQUEST_PRIORITIES,
} from '@/lib/validation/schemas/trialManagement';
import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';

interface AddFeatureRequestModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultValues?: {
    title?: string;
    description?: string;
    use_case?: string;
    priority?: string;
  };
}

// Priority options with descriptive labels
const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'low', label: '🟢 Low - Nice to have' },
  { value: 'medium', label: '🟡 Medium - Important but not urgent' },
  { value: 'high', label: '🔴 High - Very important' },
  { value: 'critical', label: '🚨 Critical - Blocking our work' },
];

export default function AddFeatureRequestModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
  defaultValues,
}: AddFeatureRequestModalProps) {
  const supabase = createClient();

  // Use form validation hook
  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
    resetForm,
    setFormData,
  } = useFormValidation(createFeatureRequestSchema, {
    title: defaultValues?.title || '',
    description: defaultValues?.description || '',
    use_case: defaultValues?.use_case || '',
    priority: (defaultValues?.priority as typeof FEATURE_REQUEST_PRIORITIES[number]) || 'medium',
  });

  // Update form when defaultValues change (for command interface prefill)
  useEffect(() => {
    if (defaultValues) {
      setFormData(prev => ({
        ...prev,
        title: defaultValues.title || prev.title,
        description: defaultValues.description || prev.description,
        use_case: defaultValues.use_case || prev.use_case,
        priority: (defaultValues.priority as typeof FEATURE_REQUEST_PRIORITIES[number]) || prev.priority,
      }));
    }
  }, [defaultValues, setFormData]);

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
        const { error } = await supabase.from('feature_requests').insert([
          {
            org_id: orgId,
            title: formData.title.trim(),
            description: formData.description.trim(),
            use_case: formData.use_case || null,
            priority: formData.priority,
            status: 'submitted',
            votes: 0,
          },
        ]);

        if (error) throw error;

        return { success: true };
      },
      {
        successMessage: 'Feature request submitted successfully',
        errorMessage: 'Failed to submit feature request',
        onSuccess: () => {
          resetForm();
          onClose();
          onSuccess();
        },
        onError: async (error) => {
          console.error('Error adding feature request:', error);

          // Get current user for error reporting
          const { data: { user } } = await supabase.auth.getUser();
          const errorDetails = getErrorMessage(error, 'feature_request_create');

          // Show error with report option
          showErrorWithReport(
            error,
            'feature_request_create',
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
            <h2 className="text-xl font-bold text-gray-900">Submit Feature Request</h2>
            <p className="text-sm text-gray-500 mt-1">Tell us what feature you'd like to see</p>
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
            label="Feature Title"
            type="text"
            required
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            error={errors.title}
            placeholder="e.g., Dark mode support, Real-time notifications"
            helperText="Brief title describing the feature"
          />

          <FormTextarea
            label="Description"
            required
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            error={errors.description}
            placeholder="Describe the feature and why it would be valuable..."
            rows={4}
            helperText="Explain what the feature does and why you need it"
          />

          <FormTextarea
            label="Use Case / Business Value"
            value={formData.use_case}
            onChange={(e) => handleInputChange('use_case', e.target.value)}
            error={errors.use_case}
            placeholder="How would this feature help your organization?..."
            rows={3}
            helperText="Optional: Describe the business impact"
          />

          <FormSelect
            label="Priority"
            required
            options={PRIORITY_OPTIONS}
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value)}
            error={errors.priority}
            helperText="How important is this feature to your workflow?"
          />

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2 items-start">
              <span className="text-lg mt-0.5">💡</span>
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Your feedback helps us improve
                </p>
                <p className="text-xs text-blue-800 mt-1">
                  All feature requests are reviewed by our product team. You'll be notified when we update the status of your request.
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
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
