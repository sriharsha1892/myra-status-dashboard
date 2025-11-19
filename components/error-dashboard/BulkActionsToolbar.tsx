'use client';

/**
 * Bulk Actions Toolbar Component
 * Appears when errors are selected, provides bulk operations
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface BulkActionsToolbarProps {
  selectedErrorIds: Set<string>;
  onActionComplete: () => void;
  onClearSelection: () => void;
  currentUserId?: string;
}

export function BulkActionsToolbar({
  selectedErrorIds,
  onActionComplete,
  onClearSelection,
  currentUserId,
}: BulkActionsToolbarProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  const handleBulkStatusUpdate = async (status: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const errorIds = Array.from(selectedErrorIds);

      const updates: any = {
        status,
      };

      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = currentUserId;
      }

      const { error } = await supabase
        .from('error_reports')
        .update(updates)
        .in('id', errorIds);

      if (error) throw error;

      toast.success(`${errorIds.length} error${errorIds.length !== 1 ? 's' : ''} marked as ${status}`);
      onClearSelection();
      onActionComplete();
    } catch (error: any) {
      console.error('Bulk update failed:', error);
      toast.error('Failed to update errors');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkIgnore = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const errorIds = Array.from(selectedErrorIds);

      const { error } = await supabase
        .from('error_reports')
        .update({ status: 'ignored' })
        .in('id', errorIds);

      if (error) throw error;

      toast.success(`${errorIds.length} error${errorIds.length !== 1 ? 's' : ''} ignored`);
      onClearSelection();
      onActionComplete();
    } catch (error: any) {
      console.error('Bulk ignore failed:', error);
      toast.error('Failed to ignore errors');
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const handleBulkDuplicate = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const errorIds = Array.from(selectedErrorIds);

      const { error } = await supabase
        .from('error_reports')
        .update({ status: 'duplicate' })
        .in('id', errorIds);

      if (error) throw error;

      toast.success(`${errorIds.length} error${errorIds.length !== 1 ? 's' : ''} marked as duplicate`);
      onClearSelection();
      onActionComplete();
    } catch (error: any) {
      console.error('Bulk duplicate failed:', error);
      toast.error('Failed to mark errors as duplicate');
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const confirmBulkAction = (title: string, message: string, action: () => Promise<void>) => {
    setConfirmAction({ title, message, action });
    setShowConfirmDialog(true);
  };

  const executeConfirmAction = async () => {
    if (confirmAction) {
      await confirmAction.action();
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-lg shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-medium">
              {selectedErrorIds.size} selected
            </span>
            <div className="h-6 w-px bg-blue-400"></div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkStatusUpdate('resolved')}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                Resolve All
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('investigating')}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                Mark Investigating
              </button>
              <button
                onClick={() =>
                  confirmBulkAction(
                    'Mark as Duplicate?',
                    `Are you sure you want to mark ${selectedErrorIds.size} error${selectedErrorIds.size !== 1 ? 's' : ''} as duplicate?`,
                    handleBulkDuplicate
                  )
                }
                disabled={loading}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                Mark Duplicate
              </button>
              <button
                onClick={() =>
                  confirmBulkAction(
                    'Ignore Errors?',
                    `Are you sure you want to ignore ${selectedErrorIds.size} error${selectedErrorIds.size !== 1 ? 's' : ''}? This action can be reversed.`,
                    handleBulkIgnore
                  )
                }
                disabled={loading}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                Ignore All
              </button>
            </div>
          </div>
          <button
            onClick={onClearSelection}
            className="text-blue-100 hover:text-white text-sm"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {confirmAction.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {confirmAction.message}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmAction(null);
                }}
                disabled={loading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmAction}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && (
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
