'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import MentionTextEditor from '@/components/MentionTextEditor';

interface ReplyFormProps {
  parentDiscussionId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function ReplyForm({
  parentDiscussionId,
  onSuccess,
  onCancel,
  placeholder = "Write a reply... Use @ to mention someone",
  autoFocus = false,
}: ReplyFormProps) {
  const [content, setContent] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const handleContentChange = (newContent: string, mentions: string[]) => {
    setContent(newContent);
    setMentionedUserIds(mentions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Please write a reply');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create reply using RPC function
      const { data, error } = await supabase.rpc('create_resource_discussion', {
        p_resource_id: null,
        p_parent_discussion_id: parentDiscussionId,
        p_discussion_type: 'comment',
        p_content: JSON.stringify({
          content,
        }),
        p_mentioned_user_ids: mentionedUserIds,
      });

      if (error) throw error;

      toast.success('Reply posted!');

      // Reset form
      setContent('');
      setMentionedUserIds([]);

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error posting reply:', error);
      toast.error(error.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="border-2 border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 transition-all bg-white">
        <MentionTextEditor
          placeholder={placeholder}
          content={content}
          onChange={handleContentChange}
          minHeight="80px"
          maxHeight="200px"
          disabled={submitting}
          autoFocus={autoFocus}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {mentionedUserIds.length > 0 && (
            <span>
              📬 {mentionedUserIds.length} {mentionedUserIds.length === 1 ? 'person' : 'people'} will be notified
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm border border-gray-200 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            disabled={submitting || !content.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Reply
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
