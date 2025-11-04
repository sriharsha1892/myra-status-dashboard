'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { Badge, getStatusBadgeVariant, getPriorityBadgeVariant } from './ui/Badge';
import { Button } from './ui/Button';
import { format } from 'date-fns';

type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketComment = Database['public']['Tables']['ticket_comments']['Row'];

interface TicketPreviewCardProps {
  ticket: Ticket;
  onClose: () => void;
  onOpenFull: () => void;
  onStatusChange?: (newStatus: string) => void;
  position: { x: number; y: number };
}

export function TicketPreviewCard({
  ticket,
  onClose,
  onOpenFull,
  onStatusChange,
  position,
}: TicketPreviewCardProps) {
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchComments();

    // Close on Escape key
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [ticket.id]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: false })
        .limit(2);

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(newStatus);
      onClose();
    }
  };

  // Position the card near the cursor but keep it in viewport
  const cardStyle = {
    top: `${Math.min(position.y + 10, window.innerHeight - 400)}px`,
    left: `${Math.min(position.x + 10, window.innerWidth - 420)}px`,
  };

  return (
    <div
      ref={cardRef}
      className="fixed z-50 w-96 bg-white dark:bg-[#161b22] border-2 border-gray-300 dark:border-gray-700 rounded-lg shadow-2xl animate-scaleIn"
      style={cardStyle}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {ticket.ticket_number}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {ticket.organization}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
          >
            <span className="text-xl">×</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(ticket.status)} size="sm">
            {ticket.status}
          </Badge>
          <Badge variant={getPriorityBadgeVariant(ticket.priority)} size="sm">
            {ticket.priority}
          </Badge>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {format(new Date(ticket.created_at), 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-4 max-h-80 overflow-y-auto">
        {/* Description */}
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Description
          </div>
          <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>

        {/* Contact */}
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Contact
          </div>
          <div className="text-sm text-gray-900 dark:text-white">{ticket.user_name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{ticket.user_email}</div>
        </div>

        {/* Recent Comments */}
        {loading ? (
          <div className="text-xs text-gray-500 dark:text-gray-400">Loading comments...</div>
        ) : comments.length > 0 ? (
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Recent Comments ({comments.length})
            </div>
            <div className="space-y-2">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`text-sm rounded p-2 ${
                    comment.is_internal
                      ? 'bg-gray-100 dark:bg-gray-800/70 border-l-2 border-gray-400'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  {comment.is_internal && (
                    <div className="flex items-center gap-1 mb-1">
                      <svg
                        className="w-3 h-3 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                        Internal
                      </span>
                    </div>
                  )}
                  <div className="text-gray-900 dark:text-white line-clamp-2">
                    {comment.comment}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Quick Actions
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['In Progress', 'Waiting on User', 'Resolved'].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={ticket.status === status}
              className={`px-2 py-1 text-xs rounded transition-colors duration-200 ${
                ticket.status === status
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <Button variant="primary" size="sm" fullWidth onClick={onOpenFull}>
          Open Full View
        </Button>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-scaleIn {
          animation: scaleIn 150ms ease-out;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
