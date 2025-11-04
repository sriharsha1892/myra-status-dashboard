'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { format } from 'date-fns';
import { Database } from '@/lib/supabase/types';
import { MentionPill } from './MentionPill';
import { UserProfilePanel } from './UserProfilePanel';
import { formatMentionsInText } from '@/lib/support/mentions';

type TicketComment = Database['public']['Tables']['ticket_comments']['Row'];

interface CommentProps {
  comment: TicketComment;
  userName?: string;
  userRole: 'AM' | 'Team' | 'Admin' | null;
}

export function Comment({ comment, userName, userRole }: CommentProps) {
  const isInternal = comment.is_internal;
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // AMs should never see internal comments (this is a fallback, should be filtered server-side)
  if (isInternal && userRole === 'AM') {
    return null;
  }

  // Parse comment text for mentions
  const { parts } = formatMentionsInText(comment.comment);

  const handleMentionClick = (userId: string) => {
    setSelectedUserId(userId);
    setShowUserProfile(true);
  };

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${
        isInternal
          ? 'bg-gray-100 border-gray-300 border-l-4 border-l-gray-400'
          : 'bg-white border-gray-200'
      }`}
    >
      {/* Comment header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* User avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-semibold text-white">
              {userName?.charAt(0).toUpperCase() || 'U'}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {userName || 'Unknown User'}
                </span>
                {/* Internal badge */}
                {isInternal && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded">
                    <Lock className="w-3 h-3" />
                    INTERNAL
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comment body */}
      <div className="px-4 py-3">
        <div
          className={`text-sm whitespace-pre-wrap ${
            isInternal ? 'text-gray-700' : 'text-gray-900'
          }`}
        >
          {parts.map((part, index) => {
            if (part.type === 'mention') {
              return (
                <MentionPill
                  key={index}
                  username={part.content}
                  onProfileClick={handleMentionClick}
                />
              );
            }
            return <span key={index}>{part.content}</span>;
          })}
        </div>
      </div>

      {/* User Profile Panel */}
      {selectedUserId && (
        <UserProfilePanel
          userId={selectedUserId}
          isOpen={showUserProfile}
          onClose={() => setShowUserProfile(false)}
        />
      )}
    </div>
  );
}
