'use client';

import { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import MentionTextEditor from './MentionTextEditor';
import { toast } from 'react-hot-toast';

interface UnifiedNoteEditorProps {
  entityType: 'trial_org' | 'meeting' | 'roadmap_item' | 'ticket' | 'todo' | 'standalone';
  entityId?: string;
  entityTitle?: string;
  parentNoteId?: string; // For replies
  visibility?: 'team' | 'internal' | 'private';
  placeholder?: string;
  onNoteCreated?: (note: any) => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
  mode?: 'root' | 'reply'; // Display mode
}

export default function UnifiedNoteEditor({
  entityType,
  entityId,
  entityTitle,
  parentNoteId,
  visibility = 'team',
  placeholder,
  onNoteCreated,
  onCancel,
  showCancelButton = false,
  mode = 'root'
}: UnifiedNoteEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (content: string, mentions: string[]) => {
    if (!content.trim()) {
      toast.error('Note cannot be empty');
      return;
    }

    setIsSubmitting(true);

    try {
      // Strip HTML tags for plain text
      const plainText = content.replace(/<[^>]*>/g, '').trim();

      // Extract mentioned user IDs from the HTML content
      // TipTap mentions are in the format: data-id="user_id"
      const mentionedUserIds: string[] = [];
      const mentionRegex = /data-id="([^"]+)"/g;
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        mentionedUserIds.push(match[1]);
      }

      // Create note via API
      const response = await fetch('/api/unified-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId || null,
          entity_title: entityTitle,
          content,
          plain_text: plainText,
          parent_note_id: parentNoteId || null,
          mentioned_user_ids: mentionedUserIds,
          visibility
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create note');
      }

      const result = await response.json();

      toast.success(mode === 'reply' ? 'Reply posted!' : 'Note created!');

      // Call callback
      if (onNoteCreated) {
        onNoteCreated(result.note);
      }

    } catch (error: any) {
      console.error('Error creating note:', error);
      toast.error(error.message || 'Failed to create note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultPlaceholder = mode === 'reply'
    ? 'Write a reply... Use @ to mention someone'
    : 'Add a note... Use @ to mention someone';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      {/* Header */}
      {mode === 'root' && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <MessageSquare className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Add Note
          </span>
          <select
            value={visibility}
            disabled={isSubmitting}
            className="ml-auto text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
            onChange={(e) => {
              // This would need to be lifted to parent component to be functional
              console.log('Visibility changed:', e.target.value);
            }}
          >
            <option value="team">Team</option>
            <option value="internal">Internal</option>
            <option value="private">Private</option>
          </select>
        </div>
      )}

      {/* Editor */}
      <div className="p-4">
        <MentionTextEditor
          placeholder={placeholder || defaultPlaceholder}
          onSubmit={handleSubmit}
          onCancel={showCancelButton ? onCancel : undefined}
          submitButtonText={isSubmitting ? 'Posting...' : (mode === 'reply' ? 'Reply' : 'Post Note')}
          minHeight={mode === 'reply' ? '80px' : '120px'}
          showToolbar={true}
        />
      </div>

      {/* Visibility indicator */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {visibility === 'team' && (
            <span>👥 Visible to all team members</span>
          )}
          {visibility === 'internal' && (
            <span>🔒 Visible to internal admins only</span>
          )}
          {visibility === 'private' && (
            <span>🔐 Private - only you can see this</span>
          )}
        </div>
      </div>
    </div>
  );
}
