'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Reply, Edit2, Trash2, MoreVertical, Eye, EyeOff, Lock } from 'lucide-react';
import RelativeTime from './ui/RelativeTime';
import UnifiedNoteEditor from './UnifiedNoteEditor';
import { toast } from 'react-hot-toast';
import { authenticatedFetch } from '@/lib/api-client';

interface Note {
  id: string;
  entity_type: string;
  entity_id: string | null;
  entity_title: string | null;
  content: string;
  plain_text: string | null;
  parent_note_id: string | null;
  thread_root_id: string | null;
  reply_count: number;
  is_root: boolean;
  mentioned_user_ids: string[];
  has_mentions: boolean;
  visibility: 'team' | 'internal' | 'private';
  created_by: string;
  created_at: string;
  updated_at: string;
  edited: boolean;
  last_edit_at: string | null;
  deleted: boolean;
}

interface NoteCardProps {
  note: Note;
  currentUserId: string;
  showReplies?: boolean;
  onNoteUpdated?: () => void;
  onNoteDeleted?: () => void;
  isReply?: boolean; // Is this a reply in a thread?
}

export default function NoteCard({
  note,
  currentUserId,
  showReplies = true,
  onNoteUpdated,
  onNoteDeleted,
  isReply = false
}: NoteCardProps) {
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [replies, setReplies] = useState<Note[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isAuthor = note.created_by === currentUserId;

  // Fetch replies if this is a root note
  useEffect(() => {
    if (note.is_root && showReplies && note.reply_count > 0) {
      fetchReplies();
    }
  }, [note.id, note.reply_count]);

  const fetchReplies = async () => {
    setLoadingReplies(true);
    try {
      const response = await authenticatedFetch(`/api/unified-notes/${note.id}/replies`);
      if (!response.ok) throw new Error('Failed to fetch replies');
      const data = await response.json();
      setReplies(data.replies || []);
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await authenticatedFetch(`/api/unified-notes/${note.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete note');

      toast.success('Note deleted');
      if (onNoteDeleted) onNoteDeleted();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete note');
    }
  };

  const handleReplyCreated = () => {
    setShowReplyEditor(false);
    fetchReplies();
    if (onNoteUpdated) onNoteUpdated();
  };

  const visibilityIcon = {
    team: <Eye className="w-3 h-3" />,
    internal: <Lock className="w-3 h-3" />,
    private: <EyeOff className="w-3 h-3" />
  };

  const visibilityColor = {
    team: 'text-blue-600 dark:text-blue-400',
    internal: 'text-orange-600 dark:text-orange-400',
    private: 'text-neutral-600 dark:text-neutral-400'
  };

  return (
    <div className={`${isReply ? 'ml-12' : ''}`}>
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-neutral-200 dark:border-slate-700 hover:border-neutral-300 dark:hover:border-slate-600 transition-colors">
        {/* Note Header */}
        <div className="flex items-start justify-between p-4 pb-2">
          <div className="flex items-center gap-3 flex-1">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-accent-600 flex items-center justify-center text-white text-sm font-semibold">
              {note.created_by.substring(0, 2).toUpperCase()}
            </div>

            {/* User info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-900 dark:text-white text-sm">
                  {isAuthor ? 'You' : 'User'}
                </span>
                <span className="text-xs text-neutral-500">•</span>
                <RelativeTime date={note.created_at} className="text-xs text-neutral-500" />
                {note.edited && (
                  <>
                    <span className="text-xs text-neutral-500">•</span>
                    <span className="text-xs text-neutral-500">edited</span>
                  </>
                )}
                {/* Visibility badge */}
                <div className={`flex items-center gap-1 text-xs ${visibilityColor[note.visibility]}`}>
                  {visibilityIcon[note.visibility]}
                  <span className="capitalize">{note.visibility}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          {isAuthor && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-slate-700 rounded"
              >
                <MoreVertical className="w-4 h-4 text-neutral-500" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-neutral-200 dark:border-slate-700 py-1 z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      setShowEditForm(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Note Content */}
        <div className="px-4 pb-3">
          <div
            className="prose prose-sm dark:prose-invert max-w-none note-content"
            dangerouslySetInnerHTML={{ __html: note.content }}
          />
        </div>

        {/* Global Mention Styles */}
        <style jsx global>{`
          .note-content .mention {
            background: #dbeafe;
            color: #1e40af;
            padding: 2px 6px;
            border-radius: 6px;
            font-weight: 500;
            font-size: 0.875rem;
            white-space: nowrap;
          }

          .dark .note-content .mention {
            background: #1e3a8a;
            color: #93c5fd;
          }
        `}</style>

        {/* Note Actions */}
        {!isReply && (
          <div className="px-4 pb-3 flex items-center gap-4">
            <button
              onClick={() => setShowReplyEditor(!showReplyEditor)}
              className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Reply className="w-4 h-4" />
              <span>Reply</span>
            </button>

            {note.reply_count > 0 && (
              <span className="text-sm text-neutral-500">
                {note.reply_count} {note.reply_count === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Reply Editor */}
      {showReplyEditor && (
        <div className="mt-3 ml-12">
          <UnifiedNoteEditor
            entityType={note.entity_type as any}
            entityId={note.entity_id || undefined}
            entityTitle={note.entity_title || undefined}
            parentNoteId={note.id}
            visibility={note.visibility}
            mode="reply"
            onNoteCreated={handleReplyCreated}
            onCancel={() => setShowReplyEditor(false)}
            showCancelButton={true}
          />
        </div>
      )}

      {/* Replies */}
      {showReplies && note.is_root && replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {replies.map((reply) => (
            <NoteCard
              key={reply.id}
              note={reply}
              currentUserId={currentUserId}
              showReplies={false}
              onNoteUpdated={fetchReplies}
              onNoteDeleted={fetchReplies}
              isReply={true}
            />
          ))}
        </div>
      )}

      {/* Loading Replies */}
      {loadingReplies && (
        <div className="mt-3 ml-12 text-sm text-neutral-500">
          Loading replies...
        </div>
      )}
    </div>
  );
}
