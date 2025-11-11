'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Loader2, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import MentionTextEditor from '@/components/MentionTextEditor';

interface CreateQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateQuestionModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateQuestionModalProps) {
  const [question, setQuestion] = useState('');
  const [details, setDetails] = useState('');
  const [tags, setTags] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setQuestion('');
      setDetails('');
      setTags('');
      setMentionedUserIds([]);
    }
  }, [isOpen]);

  const handleDetailsChange = (newContent: string, mentions: string[]) => {
    setDetails(newContent);
    setMentionedUserIds(mentions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    if (!details.trim()) {
      toast.error('Please provide some details');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Parse tags
      const tagArray = tags
        .split(/[,\s]+/)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Prepare RPC parameters
      const rpcParams = {
        p_resource_id: null,
        p_parent_discussion_id: null,
        p_discussion_type: 'question',
        p_content: JSON.stringify({
          question,
          details,
          tags: tagArray,
        }),
        p_mentioned_user_ids: mentionedUserIds,
      };

      console.log('Calling create_resource_discussion (question) with params:', rpcParams);
      console.log('Current user:', user.id);

      // Create question using RPC function
      const { data, error } = await supabase.rpc('create_resource_discussion', rpcParams);

      if (error) {
        console.error('Supabase RPC error details:', {
          error,
          errorType: typeof error,
          errorKeys: Object.keys(error),
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          stringified: JSON.stringify(error)
        });
        throw new Error(error.message || error.details || 'Failed to create question');
      }

      console.log('Question created successfully, data:', data);

      toast.success('Question posted successfully!');

      // Reset form
      setQuestion('');
      setDetails('');
      setTags('');
      setMentionedUserIds([]);

      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error creating question:', error);
      toast.error(error.message || 'Failed to post question');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-xl">
              <HelpCircle className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Ask a Question</h2>
              <p className="text-sm text-gray-600 mt-1">Get help from the team - no question is too small!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            disabled={submitting}
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Question */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Your Question *
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="How do I...?"
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
              required
              disabled={submitting}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              Be specific and clear - {question.length}/200 characters
            </p>
          </div>

          {/* Details with MentionTextEditor */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Additional Details *
            </label>
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-pink-500 focus-within:border-pink-500 transition-all">
              <MentionTextEditor
                placeholder="Provide context, what you've tried, any error messages... Use @ to mention someone who might know"
                content={details}
                onChange={handleDetailsChange}
                minHeight="200px"
                maxHeight="400px"
                disabled={submitting}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 The more details you provide, the better answers you'll get
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Tags (optional)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="methodology, statistics, b2b, tools (comma separated)"
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
              disabled={submitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Help others find your question by adding relevant tags
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900 font-medium">
              🧠 <strong>Pro Tips:</strong>
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-5 list-disc">
              <li>Search existing questions first to avoid duplicates</li>
              <li>Use @mentions to ask specific people</li>
              <li>Check back later to mark the best answer as accepted</li>
            </ul>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            {mentionedUserIds.length > 0 && (
              <span>
                📬 {mentionedUserIds.length} {mentionedUserIds.length === 1 ? 'person' : 'people'} will be notified
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-medium text-sm border-2 border-gray-200 transition-all"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-pink-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post Question'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
