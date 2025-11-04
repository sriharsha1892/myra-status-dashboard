'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { MentionInput } from './MentionInput';
import { Button } from './ui/Button';

interface CommentFormProps {
  ticketId: string;
  onCommentAdded: () => void;
  userRole: 'AM' | 'Team' | 'Admin' | null;
}

export function CommentForm({ ticketId, onCommentAdded, userRole }: CommentFormProps) {
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  // Only Team and Admin can create internal notes
  const canCreateInternal = userRole === 'Team' || userRole === 'Admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comment.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          comment: comment.trim(),
          is_internal: canCreateInternal ? isInternal : false,
          mentioned_user_ids: mentionedUserIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      setComment('');
      setIsInternal(false);
      setMentionedUserIds([]);
      onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Internal note toggle - only for Team/Admin */}
      {canCreateInternal && (
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setIsInternal(!isInternal)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 ${
              isInternal ? 'bg-gray-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                isInternal ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <div className="flex items-center gap-2">
            {isInternal && <Lock className="w-4 h-4 text-gray-600" />}
            <span className="text-sm font-medium text-gray-700">
              Internal note
            </span>
            {isInternal && (
              <span className="text-xs text-gray-500">
                (Only visible to Team and Admin)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Comment input with preview */}
      <div
        className={`rounded-lg border transition-colors ${
          isInternal
            ? 'border-gray-400 bg-gray-100'
            : 'border-gray-300 bg-white'
        }`}
      >
        <MentionInput
          value={comment}
          onChange={setComment}
          onMentionsChange={setMentionedUserIds}
          placeholder={
            isInternal
              ? 'Add an internal note (only visible to team members)... Use @username to mention someone'
              : 'Add a comment... Use @username to mention someone'
          }
          className={`border-0 min-h-[100px] focus:ring-0 ${
            isInternal ? 'bg-gray-100' : 'bg-white'
          }`}
          disabled={isSubmitting}
        />

        {/* Preview banner for internal notes */}
        {isInternal && comment.trim() && (
          <div className="px-3 pb-3">
            <div className="bg-gray-200 border border-gray-300 rounded-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-3 h-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  INTERNAL
                </span>
              </div>
              <div className="text-sm text-gray-700 line-clamp-3">
                {comment}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit button */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {isInternal ? (
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              This note will only be visible to Team and Admin users
            </span>
          ) : (
            'This comment will be visible to the customer'
          )}
        </div>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!comment.trim() || isSubmitting}
        >
          {isSubmitting ? 'Posting...' : isInternal ? 'Add Internal Note' : 'Add Comment'}
        </Button>
      </div>

      <style jsx>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </form>
  );
}
