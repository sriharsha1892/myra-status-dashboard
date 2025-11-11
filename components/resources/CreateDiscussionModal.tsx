'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Loader2, Pin } from 'lucide-react';
import toast from 'react-hot-toast';
import MentionTextEditor from '@/components/MentionTextEditor';

interface CreateDiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateDiscussionModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateDiscussionModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchUserRole();
      // Reset form when modal opens
      setTitle('');
      setContent('');
      setTags('');
      setIsPinned(false);
      setMentionedUserIds([]);
    }
  }, [isOpen]);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        setUserRole(userData?.role || null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const handleContentChange = (newContent: string, mentions: string[]) => {
    setContent(newContent);
    setMentionedUserIds(mentions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!content.trim()) {
      toast.error('Please enter some content');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Parse tags (comma or space separated)
      const tagArray = tags
        .split(/[,\s]+/)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Prepare RPC parameters
      const rpcParams = {
        p_resource_id: null, // Not attached to specific resource
        p_parent_discussion_id: null, // Top-level discussion
        p_discussion_type: 'comment',
        p_content: JSON.stringify({
          title,
          content,
          tags: tagArray,
        }),
        p_mentioned_user_ids: mentionedUserIds,
      };

      console.log('Calling create_resource_discussion with params:', rpcParams);
      console.log('Current user:', user.id);

      // Create discussion using RPC function
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
        throw new Error(error.message || error.details || 'Failed to create discussion');
      }

      console.log('Discussion created successfully, data:', data);

      // If admin, update pin status
      if (isPinned && (userRole === 'Admin' || userRole === 'Super Admin')) {
        const discussionId = data?.id || data;
        if (discussionId) {
          await supabase
            .from('resource_discussions')
            .update({ is_pinned: true })
            .eq('id', discussionId);
        }
      }

      toast.success('Discussion created successfully!');

      // Reset form
      setTitle('');
      setContent('');
      setTags('');
      setIsPinned(false);
      setMentionedUserIds([]);

      // Close modal and trigger refresh
      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error creating discussion:', error);
      toast.error(error.message || 'Failed to create discussion');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Start a Discussion</h2>
            <p className="text-sm text-gray-600 mt-1">Share ideas, ask for feedback, or start a conversation</p>
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
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Discussion Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              required
              disabled={submitting}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {title.length}/200 characters
            </p>
          </div>

          {/* Content with MentionTextEditor */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Content *
            </label>
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 transition-all">
              <MentionTextEditor
                placeholder="Share your thoughts... Use @ to mention teammates"
                content={content}
                onChange={handleContentChange}
                minHeight="200px"
                maxHeight="400px"
                disabled={submitting}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 Tip: Use @username to notify someone
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
              placeholder="onboarding, best-practices, client-success (comma separated)"
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              disabled={submitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple tags with commas
            </p>
          </div>

          {/* Pin Option (Admin Only) */}
          {isAdmin && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <input
                type="checkbox"
                id="pin-discussion"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                disabled={submitting}
              />
              <label htmlFor="pin-discussion" className="flex items-center gap-2 text-sm font-medium text-amber-900 cursor-pointer">
                <Pin className="w-4 h-4" />
                Pin this discussion to the top (Admin)
              </label>
            </div>
          )}
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
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Discussion'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
