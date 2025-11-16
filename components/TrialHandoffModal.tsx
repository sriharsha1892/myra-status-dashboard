'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
  const [newAccountManager, setNewAccountManager] = useState('');
  const [handoffReason, setHandoffReason] = useState('');
  const [contextNotes, setContextNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAccountManager || !handoffReason) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/trials/${trialOrgId}/handoff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_account_manager: newAccountManager,
          handoff_reason: handoffReason,
          context_notes: contextNotes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to handoff trial');
      }

      toast.success(`Trial handed off to ${newAccountManager}`);
      onHandoffComplete();
      onClose();

      // Reset form
      setNewAccountManager('');
      setHandoffReason('');
      setContextNotes('');
    } catch (error: any) {
      console.error('Error handing off trial:', error);
      toast.error(error.message || 'Failed to handoff trial');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Filter out current account manager from options
  const availableManagers = accountManagers.filter(
    (am) => am.email !== currentAccountManager
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Hand Off Trial</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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

          {/* New Account Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Account Manager <span className="text-red-500">*</span>
            </label>
            <select
              value={newAccountManager}
              onChange={(e) => setNewAccountManager(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select an account manager</option>
              {availableManagers.map((am) => (
                <option key={am.email} value={am.email}>
                  {am.name} ({am.email})
                </option>
              ))}
            </select>
          </div>

          {/* Handoff Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Handoff Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={handoffReason}
              onChange={(e) => setHandoffReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Why are you handing off this trial?"
              required
            />
          </div>

          {/* Context Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Context Notes (Optional)
            </label>
            <textarea
              value={contextNotes}
              onChange={(e) => setContextNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Any additional context for the new account manager..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Handing Off...' : 'Hand Off Trial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
