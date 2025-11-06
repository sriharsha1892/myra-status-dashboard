'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { formatDistanceToNow } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  Tag,
  AlertCircle,
  MessageSquare,
  Link as LinkIcon,
  Edit3,
} from 'lucide-react';
import { WatchButton } from '@/components/support/WatchButton';
import { WatchersList } from '@/components/support/WatchersList';
import { StatusChangeModalWrapper } from '@/components/support/StatusChangeModalWrapper';
import { TicketLinks } from '@/components/support/TicketLinks';
import { CommentForm } from '@/components/support/CommentForm';
import { CommentList } from '@/components/support/CommentList';
import { LinkedTicketsPanel } from '@/components/support/LinkedTicketsPanel';
import { LinkTicketModal } from '@/components/support/LinkTicketModal';
import { MergeTicketsModal } from '@/components/support/MergeTicketsModal';
import { notifyNewComment } from '@/lib/support/notifications';
import { linkTickets, mergeTickets } from '@/lib/support/ticketLinks';
import EmailThreadViewer from '@/components/support/email/EmailThreadViewer';
import CalendarEventList from '@/components/support/calendar/CalendarEventList';
import CalendarEventForm from '@/components/support/calendar/CalendarEventForm';

type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketComment = Database['public']['Tables']['ticket_comments']['Row'];

// Status badge helper
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'New':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'In Progress':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'Waiting on User':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Resolved':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'Closed':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

// Priority helper
const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'Critical':
      return 'text-red-600';
    case 'High':
      return 'text-orange-600';
    case 'Medium':
      return 'text-yellow-600';
    case 'Low':
      return 'text-gray-500';
    default:
      return 'text-gray-500';
  }
};

export default function TicketDetailPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const params = useParams();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedTicketForMerge, setSelectedTicketForMerge] = useState<{ id: string; linkType: string } | null>(null);
  const [targetTicket, setTargetTicket] = useState<Ticket | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [emailThreads, setEmailThreads] = useState<any[]>([]);
  const [showCalendarForm, setShowCalendarForm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && ticketId) {
      const supabase = createClient();
      fetchTicket();
      fetchEmailThreads();

      // Set up real-time subscription for ticket changes
      const ticketChannel = supabase
        .channel(`ticket-${ticketId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tickets',
            filter: `id=eq.${ticketId}`,
          },
          () => {
            fetchTicket();
          }
        )
        .subscribe();

      // Set up real-time subscription for comments
      const commentsChannel = supabase
        .channel(`ticket-comments-${ticketId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ticket_comments',
            filter: `ticket_id=eq.${ticketId}`,
          },
          () => {
            setRefreshTrigger((prev) => prev + 1);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(ticketChannel);
        supabase.removeChannel(commentsChannel);
      };
    }
  }, [user, ticketId]);

  const fetchTicket = async () => {
    const supabase = createClient();
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
      toast.error('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailThreads = async () => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('email_threads')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('timestamp', { ascending: false });

      if (!error && data) {
        setEmailThreads(data.map((thread: any) => ({
          id: thread.id,
          from: thread.from_email,
          to: thread.to_email,
          subject: thread.subject,
          body: thread.body,
          html: thread.html,
          timestamp: new Date(thread.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error fetching email threads:', error);
    }
  };

  const handleReply = (messageId: string) => {
    // TODO: Implement reply functionality
    toast.success('Reply functionality coming soon');
  };

  const handleCalendarEventSaved = async (event: any) => {
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          title: event.title,
          description: event.description,
          start_time: event.start_time,
          end_time: event.end_time,
          attendees: event.attendees,
          includeTeamsMeeting: event.includeTeamsMeeting,
        })
      });

      if (!response.ok) throw new Error('Failed to create event');

      toast.success('Calendar event created successfully');
      setShowCalendarForm(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Error creating calendar event:', error);
      toast.error(error.message || 'Failed to create calendar event');
      throw error;
    }
  };

  const handleCommentAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
    toast.success('Comment added');
  };

  const handleStatusChange = async () => {
    setShowStatusModal(false);
    await fetchTicket();
    toast.success('Status updated successfully');
  };

  const handleLinkCreated = async (linkedTicketId: string, linkType: string, shouldMerge: boolean) => {
    const supabase = createClient();
    if (shouldMerge) {
      // Fetch the target ticket for merge modal
      const { data: linkedTicket } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', linkedTicketId)
        .single();

      if (linkedTicket) {
        setTargetTicket(linkedTicket);
        setSelectedTicketForMerge({ id: linkedTicketId, linkType });
        setShowMergeModal(true);
      }
    } else {
      // Just create the link
      if (!user) return;

      const result = await linkTickets({
        ticketId: ticketId,
        relatedTicketId: linkedTicketId,
        linkType: linkType as any,
        userId: user.id,
      });

      if (result.success) {
        toast.success('Tickets linked successfully');
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error(result.error || 'Failed to link tickets');
      }
    }
  };

  const handleConfirmMerge = async () => {
    if (!selectedTicketForMerge || !user) return;

    // First create the link
    const linkResult = await linkTickets({
      ticketId: ticketId,
      relatedTicketId: selectedTicketForMerge.id,
      linkType: selectedTicketForMerge.linkType as any,
      userId: user.id,
    });

    if (!linkResult.success) {
      toast.error(linkResult.error || 'Failed to link tickets');
      return;
    }

    // Then merge the tickets
    const mergeResult = await mergeTickets({
      parentId: selectedTicketForMerge.id,
      childId: ticketId,
      userId: user.id,
    });

    if (mergeResult.success) {
      toast.success('Tickets merged successfully');
      setShowMergeModal(false);
      setSelectedTicketForMerge(null);
      setTargetTicket(null);
      await fetchTicket();
      setRefreshTrigger((prev) => prev + 1);
    } else {
      toast.error(mergeResult.error || 'Failed to merge tickets');
    }
  };

  const handleSkipMerge = async () => {
    if (!selectedTicketForMerge || !user) return;

    // Just create the link without merging
    const result = await linkTickets({
      ticketId: ticketId,
      relatedTicketId: selectedTicketForMerge.id,
      linkType: selectedTicketForMerge.linkType as any,
      userId: user.id,
    });

    if (result.success) {
      toast.success('Tickets linked successfully');
      setShowMergeModal(false);
      setSelectedTicketForMerge(null);
      setTargetTicket(null);
      setRefreshTrigger((prev) => prev + 1);
    } else {
      toast.error(result.error || 'Failed to link tickets');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Ticket not found</h2>
          <button
            onClick={() => router.push('/support/dashboard')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/support/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {ticket.ticket_number}
                </h1>
                <p className="text-sm text-gray-500">{ticket.organization}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <WatchButton ticketId={ticketId} />
              {(role?.toLowerCase() === 'team' || role?.toLowerCase() === 'admin') && (
                <>
                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="h-9 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Link Ticket
                  </button>
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="h-9 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Update Status
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="col-span-2 space-y-6">
            {/* Ticket Details Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center h-6 px-2.5 text-xs font-medium rounded-md border ${getStatusConfig(
                      ticket.status
                    )}`}
                  >
                    {ticket.status}
                  </span>
                  <span
                    className={`text-sm font-medium ${getPriorityConfig(
                      ticket.priority
                    )}`}
                  >
                    {ticket.priority}
                  </span>
                </div>
              </div>

              <h2 className="text-base font-semibold text-gray-900 mb-2">
                Description
              </h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>
            </div>

            {/* Comments Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments
              </h3>

              {/* Comments List */}
              <div className="mb-6">
                <CommentList
                  ticketId={ticketId}
                  userRole={role}
                  refreshTrigger={refreshTrigger}
                />
              </div>

              {/* Add Comment Form */}
              {(role?.toLowerCase() === 'team' || role?.toLowerCase() === 'admin') && (
                <CommentForm
                  ticketId={ticketId}
                  onCommentAdded={handleCommentAdded}
                  userRole={role}
                />
              )}
            </div>

            {/* Ticket Links */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <TicketLinks ticketId={ticketId} ticketNumber={ticket.ticket_number} />
            </div>

            {/* Email Thread Viewer */}
            {emailThreads.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Email Thread
                </h3>
                <EmailThreadViewer messages={emailThreads} onReply={handleReply} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Linked Tickets Panel */}
            <LinkedTicketsPanel ticketId={ticketId} />

            {/* Watchers Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <WatchersList ticketId={ticketId} />
            </div>

            {/* Calendar Events */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <CalendarEventList
                ticketId={ticketId}
                onSchedule={() => setShowCalendarForm(true)}
              />
            </div>

            {/* Details Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Details
              </h3>

              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Submitted by
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {ticket.user_name}
                  </dd>
                  <dd className="text-xs text-gray-500">{ticket.user_email}</dd>
                </div>

                <div>
                  <dt className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Category
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {ticket.category}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Created
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {formatDistanceToNow(new Date(ticket.created_at), {
                      addSuffix: true,
                    })}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Updated
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {formatDistanceToNow(new Date(ticket.updated_at), {
                      addSuffix: true,
                    })}
                  </dd>
                </div>

                {ticket.assigned_to && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Assigned to
                    </dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {ticket.assigned_to}
                    </dd>
                  </div>
                )}

                {ticket.resolved_at && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Resolved
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {formatDistanceToNow(new Date(ticket.resolved_at), {
                        addSuffix: true,
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <StatusChangeModalWrapper
          ticket={ticket}
          onClose={() => setShowStatusModal(false)}
          onSuccess={handleStatusChange}
        />
      )}

      {/* Link Ticket Modal */}
      {showLinkModal && (
        <LinkTicketModal
          isOpen={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          currentTicketId={ticketId}
          currentTicketNumber={ticket.ticket_number}
          onLinkCreated={handleLinkCreated}
        />
      )}

      {/* Merge Tickets Modal */}
      {showMergeModal && ticket && targetTicket && (
        <MergeTicketsModal
          isOpen={showMergeModal}
          onClose={() => {
            setShowMergeModal(false);
            setSelectedTicketForMerge(null);
            setTargetTicket(null);
          }}
          currentTicket={ticket}
          targetTicket={targetTicket}
          onConfirmMerge={handleConfirmMerge}
          onSkipMerge={handleSkipMerge}
        />
      )}

      {/* Calendar Event Form Modal */}
      {showCalendarForm && ticket && (
        <CalendarEventForm
          ticketId={ticketId}
          ticketNumber={ticket.ticket_number}
          onClose={() => setShowCalendarForm(false)}
          onSave={handleCalendarEventSaved}
        />
      )}
    </div>
  );
}
