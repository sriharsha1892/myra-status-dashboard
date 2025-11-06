'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import MentionTextEditor from '@/components/MentionTextEditor';
import { Button } from './ui/Button';

interface CommentFormProps {
  ticketId: string;
  onCommentAdded: () => void;
  userRole: 'AM' | 'Team' | 'Admin' | null;
}

export function CommentForm({ ticketId, onCommentAdded, userRole }: CommentFormProps) {
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only Team and Admin can create internal notes
  const canCreateInternal = userRole === 'Team' || userRole === 'Admin';

  const handleSubmit = async (content: string, mentionedUserIds: string[]) => {
    if (!content || content === '<p></p>') return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          comment: content, // Now HTML content
          is_internal: canCreateInternal ? isInternal : false,
          mentioned_user_ids: mentionedUserIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      setIsInternal(false);
      onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
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

      {/* Rich text editor with mentions */}
      <MentionTextEditor
        placeholder={
          isInternal
            ? 'Add an internal note (only visible to team members)... Type @ to mention someone'
            : 'Add a comment... Type @ to mention someone'
        }
        onSubmit={handleSubmit}
        submitButtonText={isInternal ? 'Add Internal Note' : 'Add Comment'}
        minHeight="120px"
        showToolbar={true}
      />

      {/* Info text */}
      <div className="text-xs text-gray-500 px-1">
        {isInternal ? (
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            This note will only be visible to Team and Admin users
          </span>
        ) : (
          'This comment will be visible to the customer'
        )}
      </div>
    </div>
  );
}
