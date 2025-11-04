'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface DeleteOrganizationModalProps {
  isOpen: boolean;
  orgId: string;
  orgName: string;
  userCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteOrganizationModal({
  isOpen,
  orgId,
  orgName,
  userCount,
  onClose,
  onSuccess,
}: DeleteOrganizationModalProps) {
  const supabase = createClient();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'confirm' | 'warning' | 'delete'>('confirm');

  const requiredText = `DELETE ${orgName}`;
  const isConfirmed = confirmText === requiredText;

  const handleDelete = async () => {
    if (!isConfirmed) {
      toast.error('Confirmation text does not match');
      return;
    }

    setLoading(true);

    try {
      // Delete all related data in cascade order
      // 1. Delete platform users activities, topics, issues
      await supabase
        .from('user_activities')
        .delete()
        .eq('org_id', orgId);

      await supabase
        .from('user_topics')
        .delete()
        .eq('org_id', orgId);

      await supabase
        .from('user_issues')
        .delete()
        .eq('org_id', orgId);

      await supabase
        .from('user_interactions')
        .delete()
        .eq('org_id', orgId);

      // Get trial users for this org to delete their metrics
      const { data: trialUsers, error: getUsersError } = await supabase
        .from('trial_users')
        .select('user_id')
        .eq('org_id', orgId);

      if (getUsersError) throw getUsersError;

      // Delete progress metrics for each user
      if (trialUsers && trialUsers.length > 0) {
        const userIds = trialUsers.map((u: any) => u.user_id);
        await supabase
          .from('user_progress_metrics')
          .delete()
          .in('user_id', userIds);
      }

      // 2. Delete all users (both admin and platform)
      await supabase
        .from('trial_users')
        .delete()
        .eq('org_id', orgId);

      // 3. Delete demos
      await supabase
        .from('demo_events')
        .delete()
        .eq('org_id', orgId);

      // 4. Delete activities
      await supabase
        .from('user_activity_log')
        .delete()
        .eq('org_id', orgId);

      // 5. Delete meeting notes
      await supabase
        .from('meeting_notes')
        .delete()
        .eq('org_id', orgId);

      // 6. Finally, delete the organization
      const { error } = await supabase
        .from('trial_organizations')
        .delete()
        .eq('org_id', orgId);

      if (error) throw error;

      toast.success(`Organization "${orgName}" deleted successfully`);
      setConfirmText('');
      setStep('confirm');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toast.error('Failed to delete organization');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Delete Organization</h2>
            <p className="text-red-100 text-sm mt-1">This action cannot be undone</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-100 transition text-2xl"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Confirmation */}
          {step === 'confirm' && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  You are about to permanently delete <strong>{orgName}</strong>
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-gray-700">This will delete:</p>
                <ul className="text-sm text-gray-600 space-y-2 ml-4">
                  <li>✓ Organization profile</li>
                  <li>✓ All {userCount} admin users</li>
                  <li>✓ All platform users & data</li>
                  <li>✓ All activities, topics, issues</li>
                  <li>✓ All demo records</li>
                  <li>✓ All related metadata</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('warning')}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* Step 2: Warning */}
          {step === 'warning' && (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Final Warning</p>
                <p className="text-sm text-yellow-800">
                  This is irreversible. All data associated with <strong>{orgName}</strong> will be permanently removed from the system.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>💾 Recommendation:</strong> Export important data before deleting, or take a database backup.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('delete')}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                >
                  Proceed
                </button>
              </div>
            </>
          )}

          {/* Step 3: Final Confirmation */}
          {step === 'delete' && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-900 mb-3">
                  Type the following to confirm deletion:
                </p>
                <code className="block bg-white px-3 py-2 rounded border border-red-300 font-mono text-red-700 font-bold text-center">
                  {requiredText}
                </code>
              </div>

              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type confirmation text here"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />

              {confirmText && !isConfirmed && (
                <p className="text-sm text-red-600">
                  ✗ Text does not match. Please type exactly: <strong>{requiredText}</strong>
                </p>
              )}

              {isConfirmed && (
                <p className="text-sm text-green-600">
                  ✓ Confirmation text matches. Ready to delete.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('warning');
                    setConfirmText('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!isConfirmed || loading}
                  className="flex-1 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-medium transition disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t p-4">
          <p className="text-xs text-gray-600">
            🔒 This action is permanent. Deleted data cannot be recovered unless you have a database backup.
          </p>
        </div>
      </div>
    </div>
  );
}
