// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { formatErrorForToast, getErrorMessage } from '@/lib/errorHandler';
import { showErrorWithReport } from '@/components/ErrorToastWithReport';
import { FormInput, FormSelect } from '@/components/forms';
import type { SelectOption } from '@/components/forms';
import { useLoadingState } from '@/lib/hooks';
import {
  createPlatformUserSchema,
  USER_JOURNEY_STAGES,
} from '@/lib/validation/schemas/userManagement';
import { z } from 'zod';

interface AddPlatformUserModalProps {
  isOpen: boolean;
  orgId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface AccountManager {
  id: string;
  full_name: string;
}

interface SalesPOC {
  id: string;
  name: string;
  email: string;
}

// Journey stages with labels for display
const JOURNEY_STAGES = [
  { value: 'invited', label: 'Invited' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'exploring', label: 'Exploring' },
  { value: 'building', label: 'Building' },
  { value: 'testing', label: 'Testing' },
  { value: 'integrating', label: 'Integrating' },
  { value: 'pilot', label: 'Pilot' },
  { value: 'evaluating', label: 'Evaluating' },
  { value: 'production_ready', label: 'Production Ready' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'stalled', label: 'Stalled' },
  { value: 'inactive', label: 'Inactive' },
];

export default function AddPlatformUserModal({
  isOpen,
  orgId,
  onClose,
  onSuccess,
}: AddPlatformUserModalProps) {
  const supabase = createClient();
  const [accountManagers, setAccountManagers] = useState<AccountManager[]>([]);
  const [salesPOCs, setSalesPOCs] = useState<SalesPOC[]>([]);

  // Form state - using schema type
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    phone: '',
    salesforce_id: '',
    current_stage: 'invited' as typeof USER_JOURNEY_STAGES[number],
    account_manager_id: '',
    sales_poc_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Use loading state hook
  const { isLoading, execute } = useLoadingState();

  // Fetch Account Managers and Sales POCs on mount
  useEffect(() => {
    if (isOpen) {
      fetchAccountManagersAndPOCs();
    }
  }, [isOpen]);

  const fetchAccountManagersAndPOCs = async () => {
    try {
      // Fetch Account Managers
      const { data: managers, error: managersError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'account_manager')
        .order('full_name');

      if (managersError) throw managersError;
      setAccountManagers(managers || []);

      // Fetch Sales POCs
      const { data: pocs, error: pocsError } = await supabase
        .from('sales_pocs')
        .select('id, name, email')
        .order('name');

      if (pocsError) throw pocsError;
      setSalesPOCs(pocs || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);

      // Get current user for error reporting
      const { data: { user } } = await supabase.auth.getUser();
      const errorDetails = getErrorMessage(error, 'api_call');

      // Show error with report option
      showErrorWithReport(
        error,
        'api_call',
        errorDetails.message,
        errorDetails.suggestion,
        user?.email,
        user?.id
      );
    }
  };

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
      createPlatformUserSchema.parse(formData);
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
        const { error } = await supabase.from('trial_users').insert({
          org_id: orgId,
          name: formData.name,
          email: formData.email,
          role: formData.role || null,
          phone: formData.phone || null,
          salesforce_id: formData.salesforce_id || null,
          current_stage: formData.current_stage,
          account_manager_id: formData.account_manager_id,
          sales_poc_id: formData.sales_poc_id || null,
        });

        if (error) throw error;

        return { success: true };
      },
      {
        successMessage: 'Platform user added successfully!',
        errorMessage: 'Failed to add platform user',
        onSuccess: () => {
          resetForm();
          onClose();
          onSuccess();
        },
        onError: async (error) => {
          console.error('Error adding platform user:', error);

          // Get current user for error reporting
          const { data: { user } } = await supabase.auth.getUser();

          // Check for unique constraint violation
          if (error.message?.includes('unique')) {
            toast.error('This email is already registered for this organization');
          } else {
            const errorDetails = getErrorMessage(error, 'platform_user_create');

            // Show error with report option
            showErrorWithReport(
              error,
              'platform_user_create',
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
      name: '',
      email: '',
      role: '',
      phone: '',
      salesforce_id: '',
      current_stage: 'invited',
      account_manager_id: '',
      sales_poc_id: '',
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Convert account managers and sales POCs to select options
  const accountManagerOptions: SelectOption[] = accountManagers.map((am) => ({
    value: am.id,
    label: am.full_name,
  }));

  const salesPOCOptions: SelectOption[] = salesPOCs.map((poc) => ({
    value: poc.id,
    label: `${poc.name} (${poc.email})`,
  }));

  // Convert journey stages to select options
  const journeyStageOptions: SelectOption[] = JOURNEY_STAGES.map((stage) => ({
    value: stage.value,
    label: stage.label,
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add Platform User</h2>
            <p className="text-sm text-gray-500 mt-1">Track actual users from this trial organization</p>
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
          {/* Basic Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={errors.name}
                placeholder="e.g., Jane Smith"
                helperText="Full name of the platform user"
              />

              <FormInput
                label="Email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={errors.email}
                placeholder="e.g., jane@company.com"
                helperText="Work email address"
              />

              <FormInput
                label="Role / Job Title"
                type="text"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                error={errors.role}
                placeholder="e.g., Data Analyst"
                helperText="Optional job title or role"
              />

              <FormInput
                label="Phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                error={errors.phone}
                placeholder="e.g., +1 (555) 123-4567"
                helperText="Optional contact number"
              />
            </div>
          </div>

          {/* External IDs Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v10a2 2 0 002 2h5m0 0h5a2 2 0 002-2V8a2 2 0 00-2-2h-5m0 0V5a2 2 0 012-2h1a2 2 0 012 2v1m0 0h4a2 2 0 012 2v10a2 2 0 01-2 2h-4m0 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1m0 0H4" />
              </svg>
              External IDs
            </h3>
            <FormInput
              label="Salesforce ID"
              type="text"
              value={formData.salesforce_id}
              onChange={(e) => handleInputChange('salesforce_id', e.target.value)}
              error={errors.salesforce_id}
              placeholder="e.g., SF-00051234"
              helperText="Optional Salesforce identifier"
            />
          </div>

          {/* Journey Tracking Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Journey Tracking
            </h3>
            <FormSelect
              label="Current Stage"
              required
              options={journeyStageOptions}
              value={formData.current_stage}
              onChange={(e) => handleInputChange('current_stage', e.target.value)}
              error={errors.current_stage}
              helperText="Where is this user in their trial journey?"
            />
          </div>

          {/* Account Management Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM4 20h16a2 2 0 002-2v-2a3 3 0 00-3-3H5a3 3 0 00-3 3v2a2 2 0 002 2z" />
              </svg>
              Account Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                label="Account Manager"
                required
                options={accountManagerOptions}
                value={formData.account_manager_id}
                onChange={(e) => handleInputChange('account_manager_id', e.target.value)}
                error={errors.account_manager_id}
                placeholder="Select an account manager"
                helperText="Responsible account manager for this user"
              />

              <FormSelect
                label="Sales POC"
                options={salesPOCOptions}
                value={formData.sales_poc_id}
                onChange={(e) => handleInputChange('sales_poc_id', e.target.value)}
                error={errors.sales_poc_id}
                placeholder="Select a sales POC (optional)"
                helperText="Optional sales point of contact"
              />
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
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Platform User</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
