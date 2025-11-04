'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { Comment } from './Comment';
import { Select } from './ui/Select';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

type TicketComment = Database['public']['Tables']['ticket_comments']['Row'];

interface CommentListProps {
  ticketId: string;
  userRole: 'AM' | 'Team' | 'Admin' | null;
  refreshTrigger?: number; // Used to force refresh when new comment is added
}

type FilterOption = 'all' | 'external' | 'internal';

interface GroupedComments {
  [date: string]: TicketComment[];
}

export function CommentList({ ticketId, userRole, refreshTrigger }: CommentListProps) {
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('all');
  const supabase = createClient();

  useEffect(() => {
    fetchComments();
  }, [ticketId, refreshTrigger]);

  const fetchComments = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      // Server-side filtering for AMs - they should never see internal comments
      if (userRole === 'AM') {
        query = query.eq('is_internal', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering based on dropdown selection
  const filteredComments = comments.filter((comment) => {
    if (filter === 'external') {
      return !comment.is_internal;
    }
    if (filter === 'internal') {
      return comment.is_internal;
    }
    return true; // 'all'
  });

  // Group comments by date
  const groupedComments = filteredComments.reduce<GroupedComments>((groups, comment) => {
    const date = format(parseISO(comment.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(comment);
    return groups;
  }, {});

  // Format date header
  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return 'Today';
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'MMMM d, yyyy');
  };

  // Only show filter dropdown to Team and Admin
  const canSeeInternalFilter = userRole === 'Team' || userRole === 'Admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          Loading comments...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter dropdown - only for Team/Admin */}
      {canSeeInternalFilter && comments.length > 0 && (
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-700">
            {filteredComments.length}{' '}
            {filteredComments.length === 1 ? 'comment' : 'comments'}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="comment-filter" className="text-sm text-gray-600">
              Show:
            </label>
            <select
              id="comment-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterOption)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All comments</option>
              <option value="external">External only</option>
              <option value="internal">Internal only</option>
            </select>
          </div>
        </div>
      )}

      {/* Comments grouped by date */}
      {filteredComments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-sm text-gray-500">
            {comments.length === 0
              ? 'No comments yet'
              : `No ${filter === 'internal' ? 'internal' : filter === 'external' ? 'external' : ''} comments`}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedComments).map(([date, dateComments]) => (
            <div key={date} className="space-y-3">
              {/* Date header */}
              <div className="flex items-center gap-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {formatDateHeader(date)}
                </div>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Comments for this date */}
              <div className="space-y-3">
                {dateComments.map((comment) => (
                  <Comment
                    key={comment.id}
                    comment={comment}
                    userName={`User ${comment.user_id.slice(0, 8)}`}
                    userRole={userRole}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
