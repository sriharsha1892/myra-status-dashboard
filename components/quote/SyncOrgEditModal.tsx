'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Loader2, Building2 } from 'lucide-react';
import {
  OrgStatus,
  TrialStatus,
  ORG_STATUS_LABELS,
  TRIAL_STATUS_LABELS,
} from '@/lib/quote/pipeline-types';

interface SyncOrgEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SyncOrgFormData) => Promise<void>;
  initialData?: Partial<SyncOrgFormData>;
  mode: 'edit' | 'create';
  title?: string;
}

export interface SyncOrgFormData {
  name: string;
  display_name: string | null;
  status: OrgStatus;
  trial_status: TrialStatus;
  trial_start_date: string | null;
  trial_end_date: string | null;
  employee_name: string | null;
  notes: string | null;
}

const DEFAULT_FORM_DATA: SyncOrgFormData = {
  name: '',
  display_name: null,
  status: 'prospect',
  trial_status: 'not_requested',
  trial_start_date: null,
  trial_end_date: null,
  employee_name: null,
  notes: null,
};

export default function SyncOrgEditModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode,
  title,
}: SyncOrgEditModalProps) {
  const [formData, setFormData] = useState<SyncOrgFormData>(DEFAULT_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...DEFAULT_FORM_DATA,
        ...initialData,
      });
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleChange = useCallback(
    (field: keyof SyncOrgFormData, value: string | null) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      setError('Organization name is required');
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

  const modalTitle =
    title || (mode === 'create' ? 'Create Organization' : 'Edit Organization');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-white/80" />
            <h2 className="text-lg font-semibold text-white">{modalTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Organization Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
              placeholder="Enter organization name"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={formData.display_name || ''}
              onChange={(e) =>
                handleChange('display_name', e.target.value || null)
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
              placeholder="Optional display name"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
            >
              {Object.entries(ORG_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Trial Status */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Trial Status
            </label>
            <select
              value={formData.trial_status}
              onChange={(e) => handleChange('trial_status', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
            >
              {Object.entries(TRIAL_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Trial Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Trial Start
              </label>
              <input
                type="date"
                value={
                  formData.trial_start_date
                    ? formData.trial_start_date.split('T')[0]
                    : ''
                }
                onChange={(e) =>
                  handleChange(
                    'trial_start_date',
                    e.target.value ? `${e.target.value}T00:00:00Z` : null
                  )
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Trial End
              </label>
              <input
                type="date"
                value={
                  formData.trial_end_date
                    ? formData.trial_end_date.split('T')[0]
                    : ''
                }
                onChange={(e) =>
                  handleChange(
                    'trial_end_date',
                    e.target.value ? `${e.target.value}T00:00:00Z` : null
                  )
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
              />
            </div>
          </div>

          {/* Assigned Employee */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Assigned Employee
            </label>
            <input
              type="text"
              value={formData.employee_name || ''}
              onChange={(e) =>
                handleChange('employee_name', e.target.value || null)
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
              placeholder="Employee name"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value || null)}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none resize-none"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 px-6 py-4 flex items-center justify-end gap-3 border-t">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-neutral-300 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              mode === 'create' ? 'Create' : 'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
