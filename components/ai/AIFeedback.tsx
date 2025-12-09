'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Minus, MessageSquare, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AIFeedbackProps {
  executionId: string;
  onFeedbackSubmitted?: (feedback: 'positive' | 'negative' | 'neutral') => void;
  compact?: boolean;
}

export default function AIFeedback({
  executionId,
  onFeedbackSubmitted,
  compact = false,
}: AIFeedbackProps) {
  const [submitted, setSubmitted] = useState<'positive' | 'negative' | 'neutral' | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFeedback = async (feedback: 'positive' | 'negative' | 'neutral') => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/prompts/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_id: executionId,
          feedback,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setSubmitted(feedback);
      setShowNotes(false);
      onFeedbackSubmitted?.(feedback);

      if (feedback === 'positive') {
        toast.success('Thanks for the feedback!');
      } else if (feedback === 'negative') {
        toast('Feedback recorded. We\'ll work on improving.', { icon: '📝' });
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-slate-400`}>
        {submitted === 'positive' && <ThumbsUp className="w-4 h-4 text-green-500" />}
        {submitted === 'negative' && <ThumbsDown className="w-4 h-4 text-red-500" />}
        {submitted === 'neutral' && <Minus className="w-4 h-4 text-gray-400" />}
        <span>Feedback submitted</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleFeedback('positive')}
          disabled={submitting}
          className="p-1 text-gray-400 hover:text-green-500 transition-colors disabled:opacity-50"
          title="Helpful"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleFeedback('negative')}
          disabled={submitting}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
          title="Not helpful"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-slate-400">Was this helpful?</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleFeedback('positive')}
            disabled={submitting}
            className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
            title="Yes, helpful"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ThumbsUp className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => handleFeedback('neutral')}
            disabled={submitting}
            className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors disabled:opacity-50"
            title="Neutral"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowNotes(true)}
            disabled={submitting}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            title="No, not helpful (add notes)"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showNotes && (
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              What could be improved?
            </span>
            <button
              onClick={() => setShowNotes(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional: Tell us what went wrong..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowNotes(false)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleFeedback('negative')}
              disabled={submitting}
              className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
