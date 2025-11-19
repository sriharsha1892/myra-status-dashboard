'use client';

import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatErrorForToast, getErrorMessage } from '@/lib/errorHandler';
import { showErrorWithReport } from '@/components/ErrorToastWithReport';
import { FormSelect, FormTextarea } from '@/components/forms';
import type { SelectOption } from '@/components/forms';
import { useLoadingState } from '@/lib/hooks';
import {
  trialHandoffSchema,
} from '@/lib/validation/schemas/trialManagement';
import { useFormValidation } from '@/lib/validation/hooks/useFormValidation';
import { createClient } from '@/lib/supabase/client';

interface TrialHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  trialOrgId: string;
  trialOrgName: string;
  currentAccountManager?: string;
  accountManagers: { email: string; name: string }[];
  onHandoffComplete: () => void;
}

export default function TrialHandoffModal({
  isOpen,
  onClose,
  trialOrgId,
  trialOrgName,
  currentAccountManager,
  accountManagers,
  onHandoffComplete,
}: TrialHandoffModalProps) {
  const supabase = createClient();

  // Use form validation hook
  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
    resetForm,
  } = useFormValidation(trialHandoffSchema, {
    new_account_manager: '',
    handoff_reason: '',
    context_notes: '',
  });

  // Use loading state hook
  const { isLoading, execute } = useLoadingState();

  // Filter out current account manager from options
  const availableManagers = accountManagers.filter(
    (am) => am.email !== currentAccountManager
  );

  // Convert to select options
  const accountManagerOptions: SelectOption[] = availableManagers.map((am) => ({
    value: am.email,
    label: `${am.name} (${am.email})`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form with Zod
    if (!validateForm()) {
      return;
    }

    await execute(
      async () => {
        const response = await fetch(`/api/trials/${trialOrgId}/handoff`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            new_account_manager: formData.new_account_manager,
            handoff_reason: formData.handoff_reason,
            context_notes: formData.context_notes || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to handoff trial');
        }

        return data;
      },
      {
        successMessage: `Trial handed off to ${formData.new_account_manager}`,
        errorMessage: 'Failed to handoff trial',
        onSuccess: () => {
          resetForm();
          onClose();
          onHandoffComplete();
        },
        onError: async (error) => {
          console.error('Error handing off trial:', error);

          // Get current user for error reporting
          const { data: { user } } = await supabase.auth.getUser();
          const errorDetails = getErrorMessage(error, 'trial_handoff');

          // Show error with report option
          showErrorWithReport(
            error,
            'trial_handoff',
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Hand Off Trial</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Trial Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              Handing off: <span className="font-semibold text-gray-900">{trialOrgName}</span>
            </p>
            {currentAccountManager && (
              <p className="text-sm text-gray-600 mt-1">
                From: <span className="font-semibold text-gray-900">{currentAccountManager}</span>
              </p>
            )}
          </div>

          <FormSelect
            label="New Account Manager"
            required
            options={accountManagerOptions}
            value={formData.new_account_manager}
            onChange={(e) => handleInputChange('new_account_manager', e.target.value)}
            error={errors.new_account_manager}
            placeholder="Select an account manager"
            helperText="Who will take over this trial?"
          />

          <FormTextarea
            label="Handoff Reason"
            required
            value={formData.handoff_reason}
            onChange={(e) => handleInputChange('handoff_reason', e.target.value)}
            error={errors.handoff_reason}
            placeholder="Why are you handing off this trial?"
            rows={3}
            helperText="Explain the reason for handoff"
          />

          <FormTextarea
            label="Context Notes"
            value={formData.context_notes}
            onChange={(e) => handleInputChange('context_notes', e.target.value)}
            error={errors.context_notes}
            placeholder="Any additional context for the new account manager..."
            rows={3}
            helperText="Optional: Important information about this trial"
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Handing Off...' : 'Hand Off Trial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
