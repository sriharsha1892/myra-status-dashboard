'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database } from '@/lib/supabase/types';
import { getLinkedTickets } from '@/lib/support/ticketLinks';
import { Badge } from './ui/Badge';
import {
  ChevronDown,
  ChevronRight,
  Link as LinkIcon,
  Copy,
  AlertCircle,
  GitBranch,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketLink = Database['public']['Tables']['ticket_links']['Row'];

interface LinkedTicketWithDetails extends TicketLink {
  related_ticket?: Ticket;
}

interface TicketClusterViewProps {
  ticket: Ticket;
  isExpanded?: boolean;
  onToggle?: () => void;
  showBorder?: boolean;
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

const getLinkTypeIcon = (linkType: string) => {
  switch (linkType) {
    case 'duplicate':
      return <Copy className="w-3 h-3" />;
    case 'blocks':
    case 'blocked_by':
      return <AlertCircle className="w-3 h-3" />;
    case 'related':
      return <GitBranch className="w-3 h-3" />;
    default:
      return <LinkIcon className="w-3 h-3" />;
  }
};

const getLinkTypeBadgeClass = (linkType: string) => {
  switch (linkType) {
    case 'duplicate':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'blocks':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'blocked_by':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'related':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export function TicketClusterView({
  ticket,
  isExpanded = false,
  onToggle,
  showBorder = true,
}: TicketClusterViewProps) {
  const [links, setLinks] = useState<LinkedTicketWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchLinks();
  }, [ticket.id]);

  const fetchLinks = async () => {
    try {
      const result = await getLinkedTickets(ticket.id);
      if (result.success && result.links) {
        setLinks(result.links);
      }
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToTicket = (ticketId: string) => {
    router.push(`/support/tickets/${ticketId}`);
  };

  const isDuplicate = links.some(link => link.link_type === 'duplicate');
  const isBlocked = links.some(link => link.link_type === 'blocked_by');
  const linkedCount = links.length;

  // If no links, render as normal ticket (no cluster)
  if (linkedCount === 0) {
    return null;
  }

  return (
    <div className={showBorder ? 'border-l-2 border-blue-300 pl-3' : ''}>
      {/* Parent Ticket */}
      <div
        className={`rounded-lg ${
          isDuplicate ? 'bg-gray-100' : isBlocked ? 'border-l-4 border-orange-400' : ''
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          {/* Chain Icon Indicator */}
          <LinkIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />

          <button
            onClick={onToggle}
            className="flex items-center gap-2 hover:bg-gray-50 rounded px-2 py-1 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
            <span className="text-xs font-medium text-gray-700">
              {linkedCount} linked ticket{linkedCount !== 1 ? 's' : ''}
            </span>
          </button>

          {isDuplicate && (
            <Badge className="text-xs bg-gray-500 text-white">DUPLICATE</Badge>
          )}
          {isBlocked && (
            <Badge className="text-xs bg-orange-500 text-white">BLOCKED</Badge>
          )}
        </div>

        {/* Expanded Linked Tickets */}
        {isExpanded && (
          <div className="mt-2 space-y-2 pl-6">
            {links.map((link) => {
              const linkedTicket = link.related_ticket;
              if (!linkedTicket) return null;

              return (
                <button
                  key={link.id}
                  onClick={() => navigateToTicket(linkedTicket.id)}
                  className="w-full text-left p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${getLinkTypeBadgeClass(
                            link.link_type
                          )}`}
                        >
                          {getLinkTypeIcon(link.link_type)}
                          {link.link_type.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {linkedTicket.ticket_number}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${getStatusBadgeClass(
                            linkedTicket.status
                          )}`}
                        >
                          {linkedTicket.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        {linkedTicket.organization}
                      </p>
                      <p className="text-xs text-gray-700 line-clamp-2">
                        {linkedTicket.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Updated {formatDistanceToNow(new Date(linkedTicket.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper component for use in dashboard with toggle state management
export function TicketClusterViewWithState({
  ticket,
  showBorder = true,
}: {
  ticket: Ticket;
  showBorder?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <TicketClusterView
      ticket={ticket}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      showBorder={showBorder}
    />
  );
}
