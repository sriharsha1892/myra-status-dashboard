'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { X, Calendar } from 'lucide-react';

interface AddTrialExtensionModalProps {
  orgId: string;
  currentExpiryDate?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTrialExtensionModal({
  orgId,
  currentExpiryDate,
  isOpen,
  onClose,
  onSuccess,
}: AddTrialExtensionModalProps) {
  const { user } = useAuth();
  const supabase = createClient();

  const [form, setForm] = useState({
    extendByDays: 7,
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Calculate dates
      const fromDate = currentExpiryDate ? new Date(currentExpiryDate) : new Date();
      const toDate = addDays(fromDate, form.extendByDays);

      // Create extension record
      const { error: extensionError } = await supabase
        .from('trial_extensions')
        .insert({
          org_id: orgId,
          extended_from_date: fromDate.toISOString(),
          extended_to_date: toDate.toISOString(),
          reason: form.reason || null,
          approved_by: user.id,
          approved_by_role: user.user_metadata?.role === 'Admin' ? 'admin' : 'product',
        });

      if (extensionError) throw extensionError;

      // Update the organization's trial expiry date
      const { error: orgUpdateError } = await supabase
        .from('trial_organizations')
        .update({
          trial_expiry_date: toDate.toISOString(),
          trial_status: 'extended',
        })
        .eq('org_id', orgId);

      if (orgUpdateError) throw orgUpdateError;

      // Log engagement activity
      try {
        // Get the organization to find a user to log against
        const { data: org } = await supabase
          .from('trial_organizations')
          .select('org_id')
          .eq('org_id', orgId)
          .single();

        if (org) {
          // Get first user from this org for engagement log
          const { data: orgUsers } = await supabase
            .from('trial_users')
            .select('user_id')
            .eq('org_id', orgId)
            .limit(1);

          if (orgUsers && orgUsers.length > 0) {
            await supabase.from('trial_engagement_log').insert({
              org_id: orgId,
              user_id: orgUsers[0].user_id,
              activity_type: 'trial_extended',
              description: `Trial extended by ${form.extendByDays} days until ${format(toDate, 'MMM dd, yyyy')}`,
              observations: form.reason || null,
              logged_by: user.id,
              logged_by_role: user.user_metadata?.role === 'Admin' ? 'admin' : 'product',
            });
          }
        }
      } catch (logError) {
        console.error('Error logging engagement activity:', logError);
        // Don't fail the extension if logging fails
      }

      toast.success(`Trial extended by ${form.extendByDays} days successfully`);
      setForm({ extendByDays: 7, reason: '' });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error extending trial:', error);
      toast.error(error.message || 'Failed to extend trial');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateNewExpiryDate = () => {
    const fromDate = currentExpiryDate ? new Date(currentExpiryDate) : new Date();
    return addDays(fromDate, form.extendByDays);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Extend Trial Period</h2>
            <p className="text-sm text-gray-600 mt-1">Add extra time to this trial organization</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Expiry Display */}
          {currentExpiryDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-blue-700" />
                <span className="font-medium text-blue-900">Current Expiry:</span>
                <span className="text-blue-800">{format(new Date(currentExpiryDate), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          )}

          {/* Extension Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Extend By (Days) *
            </label>
            <div className="flex gap-2">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setForm({ ...form, extendByDays: days })}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    form.extendByDays === days
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
            <div className="mt-3">
              <input
                type="number"
                min="1"
                max="90"
                value={form.extendByDays}
                onChange={(e) => setForm({ ...form, extendByDays: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Or enter custom days"
              />
            </div>
          </div>

          {/* New Expiry Preview */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-green-700" />
              <span className="font-medium text-green-900">New Expiry Date:</span>
              <span className="text-green-800 font-semibold">
                {format(calculateNewExpiryDate(), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Extension
            </label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Customer requested more time for evaluation, team on holiday, waiting for budget approval..."
            />
            <p className="text-xs text-gray-500 mt-1">Optional but recommended for tracking purposes</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.extendByDays || form.extendByDays < 1}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Extending...' : `Extend by ${form.extendByDays} Days`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
