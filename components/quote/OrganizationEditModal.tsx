'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle, Building2 } from 'lucide-react';
import type { Organization, OrganizationInput } from '@/lib/quote/organization-types';
import type { OrgStatus, TrialStatus, LoginStatus, RejectionReason } from '@/lib/quote/pipeline-types';
import {
  ORG_STATUS_LABELS,
  TRIAL_STATUS_LABELS,
  LOGIN_STATUS_LABELS,
  REJECTION_REASON_LABELS,
} from '@/lib/quote/pipeline-types';

interface OrganizationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  org: Partial<Organization> | null;
  parentOrgs?: Organization[];
  onSave: (data: OrganizationInput) => Promise<void>;
}

const REGION_OPTIONS = ['MEA', 'EMEA', 'APAC', 'Americas', 'Global'];

export default function OrganizationEditModal({
  isOpen,
  onClose,
  org,
  parentOrgs = [],
  onSave,
}: OrganizationEditModalProps) {
  const [formData, setFormData] = useState<Partial<Organization>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'trial' | 'onboarding'>('basic');

  const isEditMode = !!org?.id;

  useEffect(() => {
    if (org) {
      setFormData(org);
    } else {
      setFormData({
        status: 'prospect',
        trial_status: 'not_requested',
        login_status: 'not_logged_in',
      });
    }
    setError(null);
    setActiveTab('basic');
  }, [org]);

  const handleChange = useCallback(
    (field: keyof Organization, value: unknown) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleNumberChange = useCallback(
    (field: keyof Organization, value: string) => {
      const num = value === '' ? null : parseFloat(value);
      setFormData((prev) => ({ ...prev, [field]: num }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!formData.name?.trim()) {
      setError('Organization name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(formData as OrganizationInput);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [formData, onSave, onClose]);

  if (!isOpen) return null;

  const showTrialFields = formData.status === 'trial_access' ||
    (formData.trial_status && formData.trial_status !== 'not_requested');
  const showOnboardingFields = formData.status === 'onboarded' || formData.status === 'negotiation';
  const showRejectionFields = formData.status === 'rejected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                {isEditMode ? 'Edit Organization' : 'Add Organization'}
              </h2>
              <p className="text-sm text-neutral-500">
                {isEditMode
                  ? `Editing ${formData.name || 'organization'}`
                  : 'Create a new organization'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 px-6">
          {[
            { id: 'basic', label: 'Basic Info' },
            { id: 'trial', label: 'Trial', show: showTrialFields },
            { id: 'onboarding', label: 'Onboarding', show: showOnboardingFields },
          ]
            .filter((t) => t.show !== false)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-violet-600 text-violet-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {activeTab === 'basic' && (
            <>
              {/* Organization Name */}
              <section>
                <h3 className="text-sm font-medium text-neutral-700 mb-3 border-b pb-2">
                  Organization Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      placeholder="Acme Corporation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.display_name || ''}
                      onChange={(e) => handleChange('display_name', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      placeholder="Acme Corp - MEA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={formData.industry || ''}
                      onChange={(e) => handleChange('industry', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      placeholder="Chemicals, Agriculture, etc."
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
                      Region
                    </label>
                    <select
                      value={formData.region || ''}
                      onChange={(e) => handleChange('region', e.target.value || null)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    >
                      <option value="">Select region</option>
                      {REGION_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Parent Organization
                    </label>
                    <select
                      value={formData.parent_id || ''}
                      onChange={(e) => handleChange('parent_id', e.target.value || null)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    >
                      <option value="">None (Parent org)</option>
                      {parentOrgs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Status */}
              <section>
                <h3 className="text-sm font-medium text-neutral-700 mb-3 border-b pb-2">
                  Pipeline Status
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status || 'prospect'}
                      onChange={(e) => handleChange('status', e.target.value as OrgStatus)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    >
                      {(Object.keys(ORG_STATUS_LABELS) as OrgStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {ORG_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Account Manager
                    </label>
                    <input
                      type="text"
                      value={formData.employee_name || ''}
                      onChange={(e) => handleChange('employee_name', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      placeholder="John Doe"
                    />
                  </div>
                  {showRejectionFields && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-neutral-600 mb-1">
                        Rejection Reason
                      </label>
                      <select
                        value={formData.rejection_reason || ''}
                        onChange={(e) =>
                          handleChange('rejection_reason', e.target.value as RejectionReason || null)
                        }
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      >
                        <option value="">Select reason</option>
                        {(Object.keys(REJECTION_REASON_LABELS) as RejectionReason[]).map((r) => (
                          <option key={r} value={r}>
                            {REJECTION_REASON_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </section>

              {/* Notes */}
              <section>
                <h3 className="text-sm font-medium text-neutral-700 mb-3 border-b pb-2">
                  Notes & Context
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Pain Points
                    </label>
                    <textarea
                      value={formData.pain_points || ''}
                      onChange={(e) => handleChange('pain_points', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      placeholder="What challenges are they facing?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Current Tools
                    </label>
                    <textarea
                      value={formData.current_tools || ''}
                      onChange={(e) => handleChange('current_tools', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      placeholder="What tools are they currently using?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'trial' && (
            <section>
              <h3 className="text-sm font-medium text-neutral-700 mb-3 border-b pb-2">
                Trial Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Trial Status
                  </label>
                  <select
                    value={formData.trial_status || 'not_requested'}
                    onChange={(e) => handleChange('trial_status', e.target.value as TrialStatus)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                    {(Object.keys(TRIAL_STATUS_LABELS) as TrialStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {TRIAL_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Login Status
                  </label>
                  <select
                    value={formData.login_status || 'not_logged_in'}
                    onChange={(e) => handleChange('login_status', e.target.value as LoginStatus)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                    {(Object.keys(LOGIN_STATUS_LABELS) as LoginStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {LOGIN_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Trial Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.trial_start_date || ''}
                    onChange={(e) => handleChange('trial_start_date', e.target.value || null)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Trial End Date
                  </label>
                  <input
                    type="date"
                    value={formData.trial_end_date || ''}
                    onChange={(e) => handleChange('trial_end_date', e.target.value || null)}
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
                  <textarea
                    value={formData.trial_usage_notes || ''}
                    onChange={(e) => handleChange('trial_usage_notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    placeholder="Usage patterns, feedback, etc."
                  />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'onboarding' && (
            <section>
              <h3 className="text-sm font-medium text-neutral-700 mb-3 border-b pb-2">
                Onboarding & Contract Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Deal Value ($)
                  </label>
                  <input
                    type="number"
                    value={formData.deal_value || ''}
                    onChange={(e) => handleNumberChange('deal_value', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    ARR ($)
                  </label>
                  <input
                    type="number"
                    value={formData.arr || ''}
                    onChange={(e) => handleNumberChange('arr', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    placeholder="25000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Number of Users
                  </label>
                  <input
                    type="number"
                    value={formData.num_users || ''}
                    onChange={(e) => handleNumberChange('num_users', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Contract Period (months)
                  </label>
                  <input
                    type="number"
                    value={formData.contract_period_months || ''}
                    onChange={(e) => handleNumberChange('contract_period_months', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    placeholder="12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Contract Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.contract_start_date || ''}
                    onChange={(e) => handleChange('contract_start_date', e.target.value || null)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Contract End Date
                  </label>
                  <input
                    type="date"
                    value={formData.contract_end_date || ''}
                    onChange={(e) => handleChange('contract_end_date', e.target.value || null)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    Renewal Date
                  </label>
                  <input
                    type="date"
                    value={formData.renewal_date || ''}
                    onChange={(e) => handleChange('renewal_date', e.target.value || null)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditMode ? 'Save Changes' : 'Create Organization'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
