'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Send, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';
import MentionTextEditor from '@/components/MentionTextEditor';

interface AnswerFormProps {
  questionId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export default function AnswerForm({
  questionId,
  onSuccess,
  onCancel,
  autoFocus = false,
}: AnswerFormProps) {
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
      toast.error('Please write an answer');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create answer using RPC function
      const { data, error } = await supabase.rpc('create_resource_discussion', {
        p_resource_id: null,
        p_parent_discussion_id: questionId,
        p_discussion_type: 'answer', // Note: answer type for Q&A
        p_content: JSON.stringify({
          content,
        }),
        p_mentioned_user_ids: mentionedUserIds,
      });

      if (error) throw error;

      toast.success('Answer posted! 🎉');

      // Reset form
      setContent('');
      setMentionedUserIds([]);

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error posting answer:', error);
      toast.error(error.message || 'Failed to post answer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Answer Input */}
      <div className="border-2 border-pink-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-pink-500 focus-within:border-pink-500 transition-all bg-white">
        <MentionTextEditor
          placeholder="Share your expertise... Use @ to mention someone who might also know"
          content={content}
          onChange={handleContentChange}
          minHeight="120px"
          maxHeight="300px"
          disabled={submitting}
          autoFocus={autoFocus}
        />
      </div>

      {/* Helper Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-blue-900 font-medium">Writing a great answer:</p>
            <ul className="text-xs text-blue-800 mt-1 space-y-0.5 ml-3 list-disc">
              <li>Be specific and provide examples if possible</li>
              <li>Share relevant resources or links</li>
              <li>Explain the "why" not just the "what"</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Actions */}
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
            className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-pink-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
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
                Post Answer
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
