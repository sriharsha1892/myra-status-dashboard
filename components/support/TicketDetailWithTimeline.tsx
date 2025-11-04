'use client';

/**
 * Example integration showing how to use ActivityTimeline in a ticket detail view
 * This demonstrates the complete implementation with all features
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { ActivityTimeline } from './ActivityTimeline';
import { Badge, getStatusBadgeVariant, getPriorityBadgeVariant } from './ui/Badge';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { logCommentActivity, logWatcherActivity } from '@/lib/support/activityLogger';
import { format } from 'date-fns';
import { Eye, EyeOff, Send } from 'lucide-react';

type Ticket = Database['public']['Tables']['tickets']['Row'];

interface TicketDetailWithTimelineProps {
  ticketId: string;
}

export function TicketDetailWithTimeline({ ticketId }: TicketDetailWithTimelineProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWatching, setIsWatching] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const supabase = createClient();

  useEffect(() => {
    fetchTicket();
    checkWatchStatus();
  }, [ticketId]);

  const fetchTicket = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error) throw error;
      setTicket(data);
    } catch (error) {
      console.error('Error fetching ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkWatchStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('ticket_watchers')
        .select('id')
        .eq('ticket_id', ticketId)
        .eq('user_id', user.id)
        .single();

      setIsWatching(!!data);
    } catch (error) {
      console.error('Error checking watch status:', error);
    }
  };

  const handleToggleWatch = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (isWatching) {
        // Remove watcher
        await supabase
          .from('ticket_watchers')
          .delete()
          .eq('ticket_id', ticketId)
          .eq('user_id', user.id);

        setIsWatching(false);
      } else {
        // Add watcher
        await supabase.from('ticket_watchers').insert({
          ticket_id: ticketId,
          user_id: user.id,
        });

        // Log watcher activity
        await logWatcherActivity(ticketId, user.id);

        setIsWatching(true);
      }
    } catch (error) {
      console.error('Error toggling watch:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert comment
      const { error: commentError } = await supabase.from('ticket_comments').insert({
        ticket_id: ticketId,
        user_id: user.id,
        comment: newComment,
        is_internal: false,
      });

      if (commentError) throw commentError;

      // Log comment activity
      await logCommentActivity(ticketId, user.id, newComment);

      setNewComment('');
      alert('Comment added successfully!');
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading || !ticket) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Loading ticket details...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {ticket.ticket_number}
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(ticket.status)}>
                {ticket.status}
              </Badge>
              <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                {ticket.priority}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleWatch}
            className="flex items-center gap-2"
          >
            {isWatching ? (
              <>
                <EyeOff className="w-4 h-4" />
                Unwatch
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Watch
              </>
            )}
          </Button>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Organization:</span>{' '}
            <span className="text-gray-900 dark:text-white font-medium">
              {ticket.organization}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Contact:</span>{' '}
            <span className="text-gray-900 dark:text-white">
              {ticket.user_name} ({ticket.user_email})
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Created:</span>{' '}
            <span className="text-gray-900 dark:text-white">
              {format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-violet-600 text-violet-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Details & Comments
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-violet-600 text-violet-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Activity Timeline
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' ? (
        <div className="space-y-6">
          {/* Description */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Description
            </h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          {/* Add Comment */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Add Comment
            </h3>
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type your comment here..."
              rows={4}
              className="mb-3"
            />
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submittingComment}
              loading={submittingComment}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Comment
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <ActivityTimeline ticketId={ticketId} ticketNumber={ticket.ticket_number} />
        </div>
      )}
    </div>
  );
}
