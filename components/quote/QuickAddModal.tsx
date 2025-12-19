'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { PipelineStage, SalesPipelineEntry } from '@/lib/quote/pipeline-types';
import { ACCOUNT_MANAGERS } from '@/lib/quote/constants';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (entry: Partial<SalesPipelineEntry>) => Promise<void>;
}

interface QuickAddFormData {
  company_name: string;
  primary_email: string;
  client_name: string;
  source: string;
  employee_name: string;
}

const SOURCES = [
  'Direct',
  'Referral',
  'Website',
  'LinkedIn',
  'Conference',
  'Cold Outreach',
  'Inbound',
  'Partner',
  'Other',
];

export default function QuickAddModal({ isOpen, onClose, onAdd }: QuickAddModalProps) {
  const [formData, setFormData] = useState<QuickAddFormData>({
    company_name: '',
    primary_email: '',
    client_name: '',
    source: '',
    employee_name: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const companyInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        company_name: '',
        primary_email: '',
        client_name: '',
        source: '',
        employee_name: '',
      });
      setError(null);
      setAddedCount(0);
      setLastAdded(null);
      // Focus company input after a short delay
      setTimeout(() => companyInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = (): string | null => {
    if (!formData.company_name.trim()) {
      return 'Company name is required';
    }
    if (!formData.primary_email.trim()) {
      return 'Email is required';
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.primary_email.trim())) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const handleSubmit = async (addAnother: boolean = false) => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const entry: Partial<SalesPipelineEntry> = {
        company_name: formData.company_name.trim(),
        primary_email: formData.primary_email.trim().toLowerCase(),
        client_name: formData.client_name.trim() || null,
        source: formData.source || null,
        employee_name: formData.employee_name || null,
        stage: 'intro' as PipelineStage,
      };

      await onAdd(entry);

      setAddedCount((prev) => prev + 1);
      setLastAdded(formData.company_name);

      if (addAnother) {
        // Reset form but keep source and employee_name (likely same for batch entry)
        setFormData({
          company_name: '',
          primary_email: '',
          client_name: '',
          source: formData.source,
          employee_name: formData.employee_name,
        });
        // Focus company input for next entry
        setTimeout(() => companyInputRef.current?.focus(), 100);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Enter adds and keeps modal open, Shift+Enter closes
      handleSubmit(true);
    }
  };

  if (!isOpen) return null;

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
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Quick Add Prospect</h2>
              <p className="text-green-100 text-sm">Add prospects quickly with minimal info</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Badge */}
        {addedCount > 0 && (
          <div className="bg-green-50 border-b border-green-100 px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">
                Added {addedCount} prospect{addedCount > 1 ? 's' : ''} this session
              </span>
            </div>
            {lastAdded && (
              <span className="text-xs text-green-600 truncate max-w-[150px]">
                Last: {lastAdded}
              </span>
            )}
          </div>
        )}

        {/* Form */}
        <div className="p-6 space-y-4" onKeyDown={handleKeyDown}>
          {/* Company Name - Required */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={companyInputRef}
              type="text"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., Acme Corp"
            />
          </div>

          {/* Primary Email - Required */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="primary_email"
              value={formData.primary_email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., john@acme.com"
            />
          </div>

          {/* Contact Name - Optional */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Contact Name
            </label>
            <input
              type="text"
              name="client_name"
              value={formData.client_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., John Smith"
            />
          </div>

          {/* Source and AM in same row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Source
              </label>
              <select
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              >
                <option value="">Select...</option>
                {SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Account Manager
              </label>
              <select
                name="employee_name"
                value={formData.employee_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              >
                <option value="">Select...</option>
                {ACCOUNT_MANAGERS.map((am) => (
                  <option key={am.name} value={am.name}>
                    {am.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Hint */}
          <p className="text-xs text-neutral-500">
            Press Enter to add another, or click &quot;Add &amp; Close&quot; when done
          </p>
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 px-6 py-4 flex items-center justify-between border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add Another
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add &amp; Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
