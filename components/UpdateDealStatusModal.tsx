'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import MentionTextEditor from '@/components/MentionTextEditor';

interface UpdateDealStatusModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentDealStatus?: string;
}

const DEAL_STATUSES = [
  { value: 'prospect', label: 'Prospect', icon: '🎯', color: 'blue', description: 'Initial stage, evaluating fit' },
  { value: 'negotiating', label: 'Negotiating', icon: '💼', color: 'yellow', description: 'Active negotiation in progress' },
  { value: 'won', label: 'Won', icon: '🎉', color: 'green', description: 'Deal closed successfully' },
  { value: 'lost', label: 'Lost', icon: '❌', color: 'red', description: 'Deal did not close' },
  { value: 'deferred', label: 'Deferred', icon: '⏸️', color: 'purple', description: 'Postponed for future follow-up' },
];

const LOSS_REASONS = [
  'Pricing too high',
  'Missing critical features',
  'Went with competitor',
  'Budget constraints',
  'Timing not right',
  'No executive buy-in',
  'Champion left organization',
  'Poor product-market fit',
  'Implementation too complex',
  'Security/compliance concerns',
  'Other',
];

export default function UpdateDealStatusModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
  currentDealStatus = 'prospect',
}: UpdateDealStatusModalProps) {
  const [loading, setLoading] = useState(false);
  const [dealStatus, setDealStatus] = useState(currentDealStatus);
  const [opportunityValue, setOpportunityValue] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [dealCurrency, setDealCurrency] = useState('USD');
  const [lossReason, setLossReason] = useState('');
  const [lossReasonOther, setLossReasonOther] = useState('');
  const [deferredReason, setDeferredReason] = useState('');
  const [expectedFollowupDate, setExpectedFollowupDate] = useState('');
  const [notes, setNotes] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setDealStatus(currentDealStatus || 'prospect');
      setOpportunityValue('');
      setDealValue('');
      setDealCurrency('USD');
      setLossReason('');
      setLossReasonOther('');
      setDeferredReason('');
      setExpectedFollowupDate('');
      setNotes('');
    }
  }, [isOpen, currentDealStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (dealStatus === 'won' && !dealValue) {
      toast.error('Deal value is required for Won deals');
      return;
    }

    if (dealStatus === 'lost' && !lossReason) {
      toast.error('Loss reason is required for Lost deals');
      return;
    }

    if (dealStatus === 'lost' && lossReason === 'Other' && !lossReasonOther.trim()) {
      toast.error('Please specify the reason for "Other"');
      return;
    }

    if (dealStatus === 'deferred' && !deferredReason.trim()) {
      toast.error('Reason is required for Deferred deals');
      return;
    }

    if (dealStatus === 'deferred' && !expectedFollowupDate) {
      toast.error('Expected follow-up date is required for Deferred deals');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        deal_status: dealStatus,
        status_updated_at: new Date().toISOString(),
        notes: notes || null,
        opportunity_value: opportunityValue ? parseFloat(opportunityValue) : null,
      };

      // Clear conditional fields
      updateData.deal_value = null;
      updateData.loss_reason = null;
      updateData.deferred_reason = null;
      updateData.expected_followup_date = null;

      // Set conditional fields based on status
      if (dealStatus === 'won' && dealValue) {
        updateData.deal_value = parseFloat(dealValue);
        updateData.deal_currency = dealCurrency;
      }

      if (dealStatus === 'lost') {
        const finalLossReason = lossReason === 'Other' ? lossReasonOther : lossReason;
        updateData.loss_reason = finalLossReason;
      }

      if (dealStatus === 'deferred') {
        updateData.deferred_reason = deferredReason;
        updateData.expected_followup_date = expectedFollowupDate;
      }

      const { error } = await supabase
        .from('org_deal_tracking')
        .update(updateData)
        .eq('org_id', orgId);

      if (error) throw error;

      toast.success(`Deal status updated to ${DEAL_STATUSES.find(s => s.value === dealStatus)?.label}`);
      onClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error updating deal status:', error);
      toast.error(error.message || 'Failed to update deal status');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedStatus = DEAL_STATUSES.find(s => s.value === dealStatus);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Update Deal Status</h2>
            <p className="text-sm text-gray-500 mt-1">Manage the deal outcome for this organization</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Deal Status Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Deal Status *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEAL_STATUSES.map((status) => (
                <label
                  key={status.value}
                  className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    dealStatus === status.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="dealStatus"
                    value={status.value}
                    checked={dealStatus === status.value}
                    onChange={(e) => setDealStatus(e.target.value)}
                    className="w-4 h-4 text-blue-600 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{status.icon}</span>
                      <span className="text-sm font-medium text-gray-900">{status.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{status.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Opportunity Value (Always visible, optional) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Opportunity Value (Estimated)
              </label>
              <input
                type="number"
                value={opportunityValue}
                onChange={(e) => setOpportunityValue(e.target.value)}
                placeholder="Enter estimated deal value"
                step="0.01"
                min="0"
                className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Currency
              </label>
              <select
                value={dealCurrency}
                onChange={(e) => setDealCurrency(e.target.value)}
                className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
                <option value="AUD">AUD</option>
              </select>
            </div>
          </div>

          {/* Won Deal: Final Deal Value */}
          {dealStatus === 'won' && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Final Deal Value *
                </label>
                <input
                  type="number"
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  placeholder="Enter actual closed deal amount"
                  step="0.01"
                  min="0"
                  className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <p className="text-xs text-green-700">
                  This is the actual deal value when closed
                </p>
              </div>
            </div>
          )}

          {/* Lost Deal: Loss Reason */}
          {dealStatus === 'lost' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Primary Loss Reason *
                </label>
                <select
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Select a reason...</option>
                  {LOSS_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {/* Show text field if "Other" is selected */}
              {lossReason === 'Other' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Please specify *
                  </label>
                  <textarea
                    value={lossReasonOther}
                    onChange={(e) => setLossReasonOther(e.target.value)}
                    placeholder="Describe the reason..."
                    rows={2}
                    className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Deferred: Reason and Follow-up Date */}
          {dealStatus === 'deferred' && (
            <div className="p-4 bg-accent-50 border border-accent-200 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Reason for Deferring *
                </label>
                <div className="rounded-xl backdrop-blur-sm bg-white border border-gray-200">
                  <MentionTextEditor
                    content={deferredReason}
                    onChange={(html) => setDeferredReason(html)}
                    placeholder="Why is this deal deferred? (e.g., Waiting for budget cycle, Product roadmap alignment pending, Team expansion planned, etc.)"
                    minHeight={100}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Expected Follow-up Date *
                </label>
                <input
                  type="date"
                  value={expectedFollowupDate}
                  onChange={(e) => setExpectedFollowupDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full h-10 px-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-accent-700 mt-1">When should we follow up with this prospect?</p>
              </div>
            </div>
          )}

          {/* General Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Additional Notes
            </label>
            <div className="rounded-xl backdrop-blur-sm bg-white border border-gray-200">
              <MentionTextEditor
                content={notes}
                onChange={(html) => setNotes(html)}
                placeholder="Any additional context or notes about this deal..."
                minHeight={100}
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2 items-start">
              <span className="text-lg mt-0.5">{selectedStatus?.icon}</span>
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  {selectedStatus?.label}
                </p>
                <p className="text-xs text-blue-800 mt-1">
                  This update will be recorded and tracked in the organization's deal history.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-all duration-200 border border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Update Deal Status</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
