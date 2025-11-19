// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import MentionTextEditor from '@/components/MentionTextEditor';
import { formatErrorForToast, getErrorMessage } from '@/lib/errorHandler';
import { showErrorWithReport } from '@/components/ErrorToastWithReport';
import { FormInput, FormSelect } from '@/components/forms';
import type { SelectOption } from '@/components/forms';
import { useLoadingState } from '@/lib/hooks';
import {
  createTrialOrganizationSchema,
  TRIAL_DOMAINS,
  PARENT_COMPANIES,
} from '@/lib/validation/schemas/trialOrganization';
import { z } from 'zod';

interface SalesPOC {
  id: string;
  name: string;
  email: string;
  account_manager_id: string;
}

interface Users {
  id: string;
  full_name: string;
}

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Convert constants to SelectOption format
const domainOptions: SelectOption[] = TRIAL_DOMAINS.map((domain) => ({
  value: domain,
  label: domain,
}));

const parentCompanyOptions: SelectOption[] = PARENT_COMPANIES.map((company) => ({
  value: company,
  label: company,
}));

export default function CreateOrganizationModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateOrganizationModalProps) {
  const [salesPOCs, setSalesPOCs] = useState<SalesPOC[]>([]);
  const [accountManagers, setAccountManagers] = useState<Users[]>([]);

  // Form state - using schema type
  const [formData, setFormData] = useState({
    org_name: '',
    sales_poc_id: '',
    org_domain: '',
    parent_company: 'Mordor Intelligence',
    logo_url: '',
    org_url: '',
    description: '',
    account_manager_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [assignedAccountManager, setAssignedAccountManager] = useState('');

  // Use loading state hook
  const { isLoading, execute } = useLoadingState();

  const supabase = createClient();

  // Fetch Sales POCs and Account Managers on mount
  useEffect(() => {
    if (isOpen) {
      fetchSalesPOCsAndManagers();
    }
  }, [isOpen]);

  // Auto-assign account manager when POC is selected
  useEffect(() => {
    if (formData.sales_poc_id) {
      const poc = salesPOCs.find((p) => p.id === formData.sales_poc_id);
      if (poc) {
        const manager = accountManagers.find((m) => m.id === poc.account_manager_id);
        setAssignedAccountManager(manager?.full_name || '');
        setFormData((prev) => ({ ...prev, account_manager_id: poc.account_manager_id }));
      }
    }
  }, [formData.sales_poc_id, salesPOCs, accountManagers]);

  const fetchSalesPOCsAndManagers = async () => {
    try {
      // Fetch Sales POCs
      const { data: pocs, error: pocsError } = await supabase
        .from('sales_pocs')
        .select('id, name, email, account_manager_id')
        .order('name');

      if (pocsError) throw pocsError;
      setSalesPOCs(pocs || []);

      // Fetch Account Managers
      const { data: managers, error: managersError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'account_manager')
        .order('full_name');

      if (managersError) throw managersError;
      setAccountManagers(managers || []);
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
      createTrialOrganizationSchema.parse(formData);
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
        const { error } = await supabase.from('trial_organizations').insert({
          org_name: formData.org_name,
          org_domain: formData.org_domain,
          parent_company: formData.parent_company,
          logo_url: formData.logo_url || null,
          org_url: formData.org_url || null,
          description: formData.description || null,
          sales_poc_id: formData.sales_poc_id,
          account_manager_id: formData.account_manager_id,
          trial_request_date: new Date().toISOString(),
          trial_status: 'requested',
          org_lifecycle_stage: 'prospect',
        });

        if (error) throw error;

        return { success: true };
      },
      {
        successMessage: 'Organization created successfully',
        errorMessage: 'Failed to create organization',
        onSuccess: () => {
          resetForm();
          onClose();
          onSuccess();
        },
        onError: async (error) => {
          console.error('Error creating organization:', error);

          // Get current user for error reporting
          const { data: { user } } = await supabase.auth.getUser();
          const errorDetails = getErrorMessage(error, 'trial_org_create');

          // Show error with report option
          showErrorWithReport(
            error,
            'trial_org_create',
            errorDetails.message,
            errorDetails.suggestion,
            user?.email,
            user?.id
          );
        },
      }
    );
  };

  const resetForm = () => {
    setFormData({
      org_name: '',
      sales_poc_id: '',
      org_domain: '',
      parent_company: 'Mordor Intelligence',
      logo_url: '',
      org_url: '',
      description: '',
      account_manager_id: '',
    });
    setErrors({});
    setAssignedAccountManager('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Convert sales POCs to select options
  const salesPOCOptions: SelectOption[] = salesPOCs.map((poc) => ({
    value: poc.id,
    label: `${poc.name} (${poc.email})`,
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Trial Organization</h2>
            <p className="text-sm text-gray-500 mt-1">Set up a new trial organization with Sales POC and domain assignment</p>
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
          {/* Organization Name */}
          <FormInput
            label="Organization Name"
            type="text"
            required
            value={formData.org_name}
            onChange={(e) => handleInputChange('org_name', e.target.value)}
            error={errors.org_name}
            placeholder="e.g., Acme Corporation"
            helperText="The official name of the organization requesting a trial"
          />

          {/* Sales POC Selection */}
          <div>
            <FormSelect
              label="Sales POC"
              required
              options={salesPOCOptions}
              value={formData.sales_poc_id}
              onChange={(e) => handleInputChange('sales_poc_id', e.target.value)}
              error={errors.sales_poc_id}
              placeholder="Select a Sales POC"
              helperText="The sales representative managing this trial"
            />
            {assignedAccountManager && (
              <p className="text-xs text-green-600 mt-2">
                ✓ Assigned to Account Manager: <span className="font-semibold">{assignedAccountManager}</span>
              </p>
            )}
          </div>

          {/* Domain Selection */}
          <FormSelect
            label="Domain"
            required
            options={domainOptions}
            value={formData.org_domain}
            onChange={(e) => handleInputChange('org_domain', e.target.value)}
            error={errors.org_domain}
            placeholder="Select a domain"
            helperText="The industry or business domain for this organization"
          />

          {/* Parent Company Selection */}
          <FormSelect
            label="Parent Company"
            required
            options={parentCompanyOptions}
            value={formData.parent_company}
            onChange={(e) => handleInputChange('parent_company', e.target.value)}
            error={errors.parent_company}
            helperText="The parent company managing this trial"
          />

          {/* Organization URL */}
          <FormInput
            label="Organization URL"
            type="url"
            value={formData.org_url}
            onChange={(e) => handleInputChange('org_url', e.target.value)}
            error={errors.org_url}
            placeholder="https://example.com"
            helperText="The organization's website (optional)"
          />

          {/* Logo URL */}
          <FormInput
            label="Logo URL"
            type="url"
            value={formData.logo_url}
            onChange={(e) => handleInputChange('logo_url', e.target.value)}
            error={errors.logo_url}
            placeholder="https://example.com/logo.png"
            helperText="URL to the organization's logo (optional)"
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <div className="rounded-xl backdrop-blur-sm bg-white border border-gray-200">
              <MentionTextEditor
                content={formData.description}
                onChange={(html) => handleInputChange('description', html)}
                placeholder="Add any additional details about this organization..."
                minHeight={100}
              />
            </div>
          </div>

          {/* Trial Status Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Initial Status:</span> Requested
            </p>
            <p className="text-sm text-blue-800 mt-1">
              Trial dates will be automatically calculated when the product/admin team approves access (14 days from approval date).
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
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Organization</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
