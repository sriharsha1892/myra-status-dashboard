'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import type {
  SalesPipelineEntry,
  PipelineStage,
  TrialStatus,
  LoginStatus,
  EvaluationStatus,
} from '@/lib/quote/pipeline-types';
import {
  STAGE_LABELS,
  TRIAL_STATUS_LABELS,
  LOGIN_STATUS_LABELS,
  EVALUATION_STATUS_LABELS,
} from '@/lib/quote/pipeline-types';

interface PipelineEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: Partial<SalesPipelineEntry> | null; // null = create mode
  onSave: (data: Partial<SalesPipelineEntry>) => Promise<void>;
}

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SGD', 'AUD'];
const BILLING_FREQUENCY_OPTIONS = ['Monthly', 'Quarterly', 'Yearly', 'One Time'];
const PAYMENT_TERMS_OPTIONS = ['Immediate', 'NET 15', 'NET 30', 'NET 45', 'NET 60', 'NET 90'];
const SOURCE_OPTIONS = ['Inbound', 'Outbound', 'Referral', 'Partner', 'Event', 'Other'];

export default function PipelineEditModal({
  isOpen,
  onClose,
  entry,
  onSave,
}: PipelineEditModalProps) {
  const [formData, setFormData] = useState<Partial<SalesPipelineEntry>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!entry?.id;

  // Initialize form with entry data or defaults
  useEffect(() => {
    if (entry) {
      setFormData(entry);
    } else {
      // Default values for create mode
      setFormData({
        stage: 'intro',
        currency: 'USD',
        consulting_hours_included: false,
        gst_applicable: false,
      });
    }
    setError(null);
  }, [entry]);

  const handleChange = useCallback(
    (field: keyof SalesPipelineEntry, value: unknown) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleNumberChange = useCallback(
    (field: keyof SalesPipelineEntry, value: string) => {
      const num = value === '' ? null : parseFloat(value);
      setFormData((prev) => ({ ...prev, [field]: num }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    // Validate required fields
    if (!formData.company_name?.trim()) {
      setError('Company name is required');
      return;
    }
    if (!formData.primary_email?.trim()) {
      setError('Primary email is required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.primary_email)) {
      setError('Invalid email format');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [formData, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              {isEditMode ? 'Edit Entry' : 'Add New Entry'}
            </h2>
            <p className="text-sm text-neutral-500">
              {isEditMode
                ? `Editing ${formData.company_name || 'entry'}`
                : 'Create a new pipeline entry'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Company Information */}
          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3 border-b pb-2">
              Company Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.company_name || ''}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.client_name || ''}
                  onChange={(e) => handleChange('client_name', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country || ''}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="United States"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="123 Main St, Suite 100"
                />
              </div>
            </div>
          </section>

          {/* Contact Emails */}
          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3 border-b pb-2">
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Primary Email *
                </label>
                <input
                  type="email"
                  value={formData.primary_email || ''}
                  onChange={(e) => handleChange('primary_email', e.target.value.toLowerCase())}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="contact@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Email 2
                </label>
                <input
                  type="email"
                  value={formData.email_2 || ''}
                  onChange={(e) => handleChange('email_2', e.target.value.toLowerCase() || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="finance@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Email 3
                </label>
                <input
                  type="email"
                  value={formData.email_3 || ''}
                  onChange={(e) => handleChange('email_3', e.target.value.toLowerCase() || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Email 4
                </label>
                <input
                  type="email"
                  value={formData.email_4 || ''}
                  onChange={(e) => handleChange('email_4', e.target.value.toLowerCase() || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
            </div>
          </section>

          {/* Pipeline & Status */}
          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3 border-b pb-2">
              Pipeline Status
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Stage
                </label>
                <select
                  value={formData.stage || 'intro'}
                  onChange={(e) => handleChange('stage', e.target.value as PipelineStage)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  {Object.entries(STAGE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Login Status
                </label>
                <select
                  value={formData.login_status || ''}
                  onChange={(e) =>
                    handleChange('login_status', (e.target.value || null) as LoginStatus | null)
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  <option value="">Select...</option>
                  {Object.entries(LOGIN_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Evaluation Status
                </label>
                <select
                  value={formData.evaluation_status || ''}
                  onChange={(e) =>
                    handleChange(
                      'evaluation_status',
                      (e.target.value || null) as EvaluationStatus | null
                    )
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  <option value="">Select...</option>
                  {Object.entries(EVALUATION_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Trial Tracking */}
          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3 border-b pb-2">
              Trial Tracking
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Trial Status
                </label>
                <select
                  value={formData.trial_status || 'not_requested'}
                  onChange={(e) =>
                    handleChange('trial_status', e.target.value as TrialStatus)
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  {Object.entries(TRIAL_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Trial Requested Date
                </label>
                <input
                  type="date"
                  value={formData.trial_requested_date || ''}
                  onChange={(e) => handleChange('trial_requested_date', e.target.value || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Trial Needed Date
                </label>
                <input
                  type="date"
                  value={formData.trial_needed_date || ''}
                  onChange={(e) => handleChange('trial_needed_date', e.target.value || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Trial Given Date
                </label>
                <input
                  type="date"
                  value={formData.trial_given_date || ''}
                  onChange={(e) => handleChange('trial_given_date', e.target.value || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Trial Usage Notes
                </label>
                <input
                  type="text"
                  value={formData.trial_usage_notes || ''}
                  onChange={(e) => handleChange('trial_usage_notes', e.target.value || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="e.g., Active - logged in and using regularly"
                />
              </div>
            </div>
          </section>

          {/* Sales & Assignment */}
          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3 border-b pb-2">
              Sales Assignment
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Account Manager
                </label>
                <input
                  type="text"
                  value={formData.employee_name || ''}
                  onChange={(e) => handleChange('employee_name', e.target.value || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="Name of AM"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Source
                </label>
                <select
                  value={formData.source || ''}
                  onChange={(e) => handleChange('source', e.target.value || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  <option value="">Select...</option>
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Referred By
                </label>
                <input
                  type="text"
                  value={formData.referred_by || ''}
                  onChange={(e) => handleChange('referred_by', e.target.value || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Deal ID
                </label>
                <input
                  type="text"
                  value={formData.deal_id || ''}
                  onChange={(e) => handleChange('deal_id', e.target.value || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
            </div>
          </section>

          {/* Deal & Financials */}
          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3 border-b pb-2">
              Deal Information
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Deal Value
                </label>
                <input
                  type="number"
                  value={formData.deal_value ?? ''}
                  onChange={(e) => handleNumberChange('deal_value', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Currency
                </label>
                <select
                  value={formData.currency || 'USD'}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Standard Cost
                </label>
                <input
                  type="number"
                  value={formData.standard_cost ?? ''}
                  onChange={(e) => handleNumberChange('standard_cost', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Number of Users
                </label>
                <input
                  type="number"
                  value={formData.num_users ?? ''}
                  onChange={(e) => handleNumberChange('num_users', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Billing Frequency
                </label>
                <select
                  value={formData.billing_frequency || ''}
                  onChange={(e) => handleChange('billing_frequency', e.target.value || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  <option value="">Select...</option>
                  {BILLING_FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Payment Terms
                </label>
                <select
                  value={formData.payment_terms || ''}
                  onChange={(e) => handleChange('payment_terms', e.target.value || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  <option value="">Select...</option>
                  {PAYMENT_TERMS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Dates */}
          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3 border-b pb-2">
              Subscription Dates
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.subscription_start_date || ''}
                  onChange={(e) =>
                    handleChange('subscription_start_date', e.target.value || null)
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.subscription_end_date || ''}
                  onChange={(e) =>
                    handleChange('subscription_end_date', e.target.value || null)
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={formData.invoice_date || ''}
                  onChange={(e) => handleChange('invoice_date', e.target.value || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3 border-b pb-2">Notes</h3>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value || null)}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none"
              placeholder="Additional notes..."
            />
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-200 bg-neutral-50 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditMode ? 'Save Changes' : 'Create Entry'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
