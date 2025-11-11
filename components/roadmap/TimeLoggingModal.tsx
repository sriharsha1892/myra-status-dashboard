'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { X, Clock } from 'lucide-react';

interface TimeLoggingModalProps {
  itemId: string;
  itemTitle: string;
  currentUserId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TimeLoggingModal({
  itemId,
  itemTitle,
  currentUserId,
  onClose,
  onSuccess
}: TimeLoggingModalProps) {
  const [hours, setHours] = useState<string>('');
  const [workDate, setWorkDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hours || parseFloat(hours) <= 0) {
      toast.error('Please enter valid hours');
      return;
    }

    if (!description.trim()) {
      toast.error('Please describe what you worked on');
      return;
    }

    setSubmitting(true);

    try {
      // Insert time log
      const { error } = await supabase
        .from('roadmap_time_logs')
        .insert({
          roadmap_item_id: itemId,
          user_id: currentUserId,
          hours_logged: parseFloat(hours),
          work_date: workDate,
          description: description.trim()
        });

      if (error) throw error;

      toast.success(`Logged ${hours}h successfully`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error logging time:', error);
      toast.error('Failed to log time');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Log Time</h2>
              <p className="text-xs text-neutral-500 truncate max-w-[250px]">{itemTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" strokeWidth={2} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Hours Input */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Hours Spent <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g., 3.5"
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-neutral-900"
              autoFocus
            />
            <p className="mt-1.5 text-xs text-neutral-500">Use decimals for partial hours (e.g., 1.5 = 1h 30m)</p>
          </div>

          {/* Date Input */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Work Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-neutral-900"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              What did you work on? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Implemented JWT authentication, fixed login bugs"
              rows={4}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-neutral-900 resize-none"
            />
            <p className="mt-1.5 text-xs text-neutral-500">Be specific - this helps with transparency</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-accent-500 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent-500/30"
            >
              {submitting ? 'Logging...' : 'Log Time'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
