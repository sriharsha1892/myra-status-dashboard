'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface VoteCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
  title: string;
  isVoting?: boolean;
  existingComment?: string;
  voteAction?: 'vote' | 'unvote';
}

export default function VoteCommentModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  isVoting = false,
  existingComment = '',
  voteAction = 'vote'
}: VoteCommentModalProps) {
  const [comment, setComment] = useState(existingComment);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(comment);
  };

  const handleSkip = () => {
    onConfirm('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 text-center">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {voteAction === 'vote' ? 'Add Your Vote' : 'Remove Your Vote'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="vote-comment"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {voteAction === 'vote'
                  ? 'Why are you voting for this? (optional)'
                  : 'Any feedback before removing your vote? (optional)'
                }
              </label>
              <textarea
                id="vote-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  voteAction === 'vote'
                    ? "Share why this is important to you..."
                    : "Let us know if there's something we could improve..."
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={200}
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Optional - help us understand your priorities</span>
                <span>{comment.length}/200</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={isVoting}
              >
                {voteAction === 'vote' ? 'Just Vote' : 'Just Remove'}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isVoting}
              >
                {isVoting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  voteAction === 'vote' ? 'Vote with Comment' : 'Remove with Feedback'
                )}
              </button>
            </div>
          </form>

          {/* Info */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Tip:</strong> Your vote helps us prioritize features. Comments help us understand the "why" behind your vote, making our decisions more informed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}