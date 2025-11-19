// @ts-nocheck
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { formatErrorForToast, getErrorMessage } from '@/lib/errorHandler';
import { showErrorWithReport } from '@/components/ErrorToastWithReport';
import { FormInput } from '@/components/forms';
import { useLoadingState } from '@/lib/hooks';
import {
  createTrialUserSchema,
} from '@/lib/validation/schemas/userManagement';
import { z } from 'zod';

interface AddTrialUserModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTrialUserModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
}: AddTrialUserModalProps) {
  const supabase = createClient();

  // Form state - using schema type
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    designation: '',
    salesforce_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Use loading state hook
  const { isLoading, execute } = useLoadingState();

  // Handle input changes with error clearing
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form with Zod schema
  const validateForm = (): boolean => {
    try {
      createTrialUserSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            newErrors[error.path[0].toString()] = error.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
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
        // Get account_manager_id from the organization
        const { data: org, error: orgError } = await supabase
          .from('trial_organizations')
          .select('account_manager_id')
          .eq('org_id', orgId)
          .single();

        if (orgError) throw orgError;

        const { error } = await supabase.from('trial_users').insert({
          org_id: orgId,
          name: formData.full_name,
          email: formData.email,
          role: formData.designation || null,
          salesforce_id: formData.salesforce_id || null,
          current_stage: 'invited',
          account_manager_id: org?.account_manager_id || null,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;

        return { success: true };
      },
      {
        successMessage: 'Trial user added successfully!',
        errorMessage: 'Failed to add trial user',
        onSuccess: () => {
          resetForm();
          onClose();
          onSuccess();
        },
        onError: async (error) => {
          console.error('Error adding trial user:', error);

          // Get current user for error reporting
          const { data: { user } } = await supabase.auth.getUser();

          // Check for unique constraint violation
          if (error.message?.includes('unique')) {
            toast.error('This email is already registered for this organization');
          } else {
            const errorDetails = getErrorMessage(error, 'trial_user_create');

            // Show error with report option
            showErrorWithReport(
              error,
              'trial_user_create',
              errorDetails.message,
              errorDetails.suggestion,
              user?.email,
              user?.id
            );
          }
        },
      }
    );
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      designation: '',
      salesforce_id: '',
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add Trial User</h2>
            <p className="text-sm text-gray-500 mt-1">Add a new user to this trial organization</p>
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
            label="Full Name"
            type="text"
            required
            value={formData.full_name}
            onChange={(e) => handleInputChange('full_name', e.target.value)}
            error={errors.full_name}
            placeholder="e.g., John Doe"
            helperText="Full name of the trial user"
          />

          <FormInput
            label="Email Address"
            type="email"
            required
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            error={errors.email}
            placeholder="e.g., john@example.com"
            helperText="Work email address"
          />

          <FormInput
            label="Designation / Title"
            type="text"
            value={formData.designation}
            onChange={(e) => handleInputChange('designation', e.target.value)}
            error={errors.designation}
            placeholder="e.g., Sales Manager, VP Operations"
            helperText="Optional job title or designation"
          />

          <FormInput
            label="Salesforce ID"
            type="text"
            value={formData.salesforce_id}
            onChange={(e) => handleInputChange('salesforce_id', e.target.value)}
            error={errors.salesforce_id}
            placeholder="e.g., SF123456"
            helperText="Optional: Link to Salesforce CRM contact"
          />

          {/* User Status Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Initial Status:</span> Invited
            </p>
            <p className="text-sm text-blue-800 mt-1">
              User status can be updated to "access_enabled" or "active" from the trial organization details page.
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
              disabled={isLoading}
              className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add User</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
