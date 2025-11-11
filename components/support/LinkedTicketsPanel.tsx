'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { getLinkedTickets } from '@/lib/support/ticketLinks';
import { Badge } from './ui/Badge';
import {
  Link as LinkIcon,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  GitBranch,
  Copy,
} from 'lucide-react';

type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketLink = Database['public']['Tables']['ticket_links']['Row'];

interface LinkedTicketWithDetails extends TicketLink {
  related_ticket?: Ticket;
  isIncoming?: boolean;
}

interface LinkedTicketsPanelProps {
  ticketId: string;
}

interface GroupedLinks {
  duplicates: LinkedTicketWithDetails[];
  related: LinkedTicketWithDetails[];
  blocks: LinkedTicketWithDetails[];
  blocked_by: LinkedTicketWithDetails[];
}

const getStatusBadgeClass = (status: string) => {
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

const getLinkTypeColor = (linkType: string) => {
  switch (linkType) {
    case 'blocks':
      return 'text-red-600 bg-red-50';
    case 'blocked_by':
      return 'text-orange-600 bg-orange-50';
    case 'related':
      return 'text-blue-600 bg-blue-50';
    case 'duplicate':
      return 'text-accent-600 bg-accent-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const getLinkTypeIcon = (linkType: string) => {
  switch (linkType) {
    case 'blocks':
      return <AlertCircle className="w-3.5 h-3.5" />;
    case 'blocked_by':
      return <AlertCircle className="w-3.5 h-3.5" />;
    case 'related':
      return <GitBranch className="w-3.5 h-3.5" />;
    case 'duplicate':
      return <Copy className="w-3.5 h-3.5" />;
    default:
      return <LinkIcon className="w-3.5 h-3.5" />;
  }
};

export function LinkedTicketsPanel({ ticketId }: LinkedTicketsPanelProps) {
  const [links, setLinks] = useState<LinkedTicketWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['duplicates', 'related', 'blocks', 'blocked_by'])
  );
  const [hoveredTicket, setHoveredTicket] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchLinks();

    // Set up real-time subscription for link changes
    const channel = supabase
      .channel(`ticket-links-${ticketId}`)
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_links',
          filter: `related_ticket_id=eq.${ticketId}`,
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
        // Mark incoming links for proper display
        const enrichedLinks = result.links.map(link => ({
          ...link,
          isIncoming: link.related_ticket_id === ticketId,
        }));
        setLinks(enrichedLinks);
      }
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const navigateToTicket = (ticketIdToNavigate: string) => {
    router.push(`/support/tickets/${ticketIdToNavigate}`);
  };

  // Group links by type
  const groupedLinks: GroupedLinks = {
    duplicates: links.filter(l => l.link_type === 'duplicate'),
    related: links.filter(l => l.link_type === 'related'),
    blocks: links.filter(l => l.link_type === 'blocks' && !l.isIncoming),
    blocked_by: links.filter(l => l.link_type === 'blocked_by' || (l.link_type === 'blocks' && l.isIncoming)),
  };

  const totalLinks = links.length;

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (totalLinks === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <LinkIcon className="w-4 h-4" />
          Linked Tickets
        </h3>
        <p className="text-sm text-gray-500">No linked tickets</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <LinkIcon className="w-4 h-4" />
        Linked Tickets
        <span className="ml-auto text-xs font-normal text-gray-500">
          {totalLinks} total
        </span>
      </h3>

      <div className="space-y-3">
        {/* Duplicates Section */}
        {groupedLinks.duplicates.length > 0 && (
          <div className="border border-accent-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('duplicates')}
              className="w-full px-3 py-2 bg-accent-50 hover:bg-accent-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {expandedSections.has('duplicates') ? (
                  <ChevronDown className="w-4 h-4 text-accent-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-accent-600" />
                )}
                <span className="text-xs font-semibold text-purple-900">
                  Duplicates
                </span>
                <span className="text-xs text-accent-700">
                  ({groupedLinks.duplicates.length})
                </span>
              </div>
            </button>
            {expandedSections.has('duplicates') && (
              <div className="divide-y divide-purple-100">
                {groupedLinks.duplicates.map((link) => (
                  <LinkedTicketItem
                    key={link.id}
                    link={link}
                    onNavigate={navigateToTicket}
                    hoveredTicket={hoveredTicket}
                    onHover={setHoveredTicket}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Blocks Section */}
        {groupedLinks.blocks.length > 0 && (
          <div className="border border-red-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('blocks')}
              className="w-full px-3 py-2 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {expandedSections.has('blocks') ? (
                  <ChevronDown className="w-4 h-4 text-red-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-red-600" />
                )}
                <span className="text-xs font-semibold text-red-900">
                  Blocks
                </span>
                <span className="text-xs text-red-700">
                  ({groupedLinks.blocks.length})
                </span>
              </div>
            </button>
            {expandedSections.has('blocks') && (
              <div className="divide-y divide-red-100">
                {groupedLinks.blocks.map((link) => (
                  <LinkedTicketItem
                    key={link.id}
                    link={link}
                    onNavigate={navigateToTicket}
                    hoveredTicket={hoveredTicket}
                    onHover={setHoveredTicket}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Blocked By Section */}
        {groupedLinks.blocked_by.length > 0 && (
          <div className="border border-orange-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('blocked_by')}
              className="w-full px-3 py-2 bg-orange-50 hover:bg-orange-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {expandedSections.has('blocked_by') ? (
                  <ChevronDown className="w-4 h-4 text-orange-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-orange-600" />
                )}
                <span className="text-xs font-semibold text-orange-900">
                  Blocked by
                </span>
                <span className="text-xs text-orange-700">
                  ({groupedLinks.blocked_by.length})
                </span>
              </div>
            </button>
            {expandedSections.has('blocked_by') && (
              <div className="divide-y divide-orange-100">
                {groupedLinks.blocked_by.map((link) => (
                  <LinkedTicketItem
                    key={link.id}
                    link={link}
                    onNavigate={navigateToTicket}
                    hoveredTicket={hoveredTicket}
                    onHover={setHoveredTicket}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Related Section */}
        {groupedLinks.related.length > 0 && (
          <div className="border border-blue-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('related')}
              className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {expandedSections.has('related') ? (
                  <ChevronDown className="w-4 h-4 text-blue-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-blue-600" />
                )}
                <span className="text-xs font-semibold text-blue-900">
                  Related
                </span>
                <span className="text-xs text-blue-700">
                  ({groupedLinks.related.length})
                </span>
              </div>
            </button>
            {expandedSections.has('related') && (
              <div className="divide-y divide-blue-100">
                {groupedLinks.related.map((link) => (
                  <LinkedTicketItem
                    key={link.id}
                    link={link}
                    onNavigate={navigateToTicket}
                    hoveredTicket={hoveredTicket}
                    onHover={setHoveredTicket}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LinkedTicketItem({
  link,
  onNavigate,
  hoveredTicket,
  onHover,
}: {
  link: LinkedTicketWithDetails;
  onNavigate: (ticketId: string) => void;
  hoveredTicket: string | null;
  onHover: (ticketId: string | null) => void;
}) {
  const ticket = link.related_ticket;
  if (!ticket) return null;

  const isHovered = hoveredTicket === ticket.id;

  return (
    <div
      className="relative"
      onMouseEnter={() => onHover(ticket.id)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        onClick={() => onNavigate(ticket.id)}
        className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-900">
                {ticket.ticket_number}
              </span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded border ${getStatusBadgeClass(
                  ticket.status
                )}`}
              >
                {ticket.status}
              </span>
            </div>
            <p className="text-xs text-gray-600 line-clamp-1">
              {ticket.description}
            </p>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
        </div>
      </button>

      {/* Hover Tooltip */}
      {isHovered && (
        <div className="absolute left-full ml-2 top-0 z-50 w-72 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-900">
              {ticket.ticket_number}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${getStatusBadgeClass(
                ticket.status
              )}`}
            >
              {ticket.status}
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2">{ticket.organization}</p>
          <p className="text-xs text-gray-700 line-clamp-3">
            {ticket.description}
          </p>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Priority: <span className="font-medium">{ticket.priority}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
