'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { notifyStatusChange } from '@/lib/support/notifications';

type Ticket = Database['public']['Tables']['tickets']['Row'];

interface StatusChangeModalWrapperProps {
  ticket: Ticket;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUSES = ['New', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'];

const STATUS_PROMPTS: Record<string, { title: string; placeholder: string }> = {
  Resolved: {
    title: 'Add resolution note?',
    placeholder: 'Describe how this issue was resolved...',
  },
  'Waiting on User': {
    title: 'What info do you need?',
    placeholder: 'Describe what information you need from the user...',
  },
  Closed: {
    title: 'Add closing note?',
    placeholder: 'Add any final notes before closing...',
  },
  'In Progress': {
    title: 'Add a note about progress?',
    placeholder: "Describe what you're working on...",
  },
};

export function StatusChangeModalWrapper({
  ticket,
  onClose,
  onSuccess,
}: StatusChangeModalWrapperProps) {
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState(ticket.status);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const prompt = STATUS_PROMPTS[selectedStatus];
  const statusChanged = selectedStatus !== ticket.status;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusChanged || !user) return;

    setLoading(true);
    try {
      const oldStatus = ticket.status;
      const newStatus = selectedStatus;

      // Update ticket status
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // If resolved, set resolved_at
      if (newStatus === 'Resolved' && !ticket.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticket.id);

      if (updateError) throw updateError;

      // Add comment if provided
      if (comment.trim()) {
        const { error: commentError } = await supabase.from('ticket_comments').insert({
          ticket_id: ticket.id,
          user_id: user.id,
          comment: comment.trim(),
          is_internal: false,
        });

        if (commentError) throw commentError;
      }

      // Notify all watchers about the status change
      await notifyStatusChange(
        ticket.id,
        ticket.ticket_number,
        oldStatus,
        newStatus,
        user.id
      );

      toast.success('Status updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Update Ticket Status</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {statusChanged && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Changing from <span className="font-medium">{ticket.status}</span> to{' '}
                <span className="font-medium">{selectedStatus}</span>
              </p>
            </div>
          )}

          {statusChanged && prompt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {prompt.title}
                <span className="text-xs text-gray-500 ml-2">(Optional)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={prompt.placeholder}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be added as a comment and all watchers will be notified
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!statusChanged || loading}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
