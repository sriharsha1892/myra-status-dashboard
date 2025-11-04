'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { getLinkedTickets, unlinkTickets } from '@/lib/support/ticketLinks';
import { Badge } from './ui/Badge';
import { ExternalLink, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketLink = Database['public']['Tables']['ticket_links']['Row'];

interface LinkedTicketWithDetails extends TicketLink {
  related_ticket?: Ticket;
}

interface TicketLinksProps {
  ticketId: string;
  ticketNumber: string;
}

const LINK_TYPE_COLORS: Record<string, string> = {
  blocks: 'bg-red-100 text-red-700',
  blocked_by: 'bg-orange-100 text-orange-700',
  related: 'bg-blue-100 text-blue-700',
  duplicate: 'bg-purple-100 text-purple-700',
};

export function TicketLinks({ ticketId, ticketNumber }: TicketLinksProps) {
  const { user } = useAuth();
  const [links, setLinks] = useState<LinkedTicketWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchLinks();

    // Set up real-time subscription
    const channel = supabase
      .channel(`ticket-links-history-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_links',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          fetchLinks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const fetchLinks = async () => {
    try {
      const result = await getLinkedTickets(ticketId);
      if (result.success && result.links) {
        setLinks(result.links);
      }
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    if (!user) return;

    const result = await unlinkTickets(linkId, user.id);
    if (result.success) {
      toast.success('Link removed');
      fetchLinks();
    } else {
      toast.error(result.error || 'Failed to remove link');
    }
  };

  const navigateToTicket = (ticketIdToNavigate: string) => {
    router.push(`/support/tickets/${ticketIdToNavigate}`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Link History</h3>
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Link History</h3>
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">No link history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Link History</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {links.map((link) => {
          const ticket = link.related_ticket;
          if (!ticket) return null;

          return (
            <div
              key={link.id}
              className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => navigateToTicket(ticket.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        LINK_TYPE_COLORS[link.link_type]
                      }`}
                    >
                      {link.link_type.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {ticket.ticket_number}
                    </span>
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-1">
                    {ticket.description}
                  </p>
                </button>
                {(user?.id === link.created_by || user) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveLink(link.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 p-1"
                    title="Remove link"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
