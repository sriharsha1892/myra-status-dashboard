'use client';

import { Database } from '@/lib/supabase/types';
import { formatDistanceToNow } from 'date-fns';
import { Eye, User } from 'lucide-react';

type Ticket = Database['public']['Tables']['tickets']['Row'];

interface MobileTicketCardProps {
  ticket: Ticket;
  onClick: () => void;
  watcherCount?: number;
}

export default function MobileTicketCard({ ticket, onClick, watcherCount }: MobileTicketCardProps) {
  const statusColors: Record<string, string> = {
    'New': 'bg-blue-50 text-blue-700 border-blue-200',
    'In Progress': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'Waiting on User': 'bg-accent-50 text-accent-700 border-accent-200',
    'Resolved': 'bg-green-50 text-green-700 border-green-200',
    'Closed': 'bg-gray-50 text-gray-700 border-gray-200',
  };

  const priorityColors: Record<string, string> = {
    'Critical': 'text-red-600',
    'High': 'text-orange-600',
    'Medium': 'text-blue-600',
    'Low': 'text-gray-600',
  };

  return (
    <div onClick={onClick} className="bg-white border border-gray-200 rounded-lg p-4 active:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-500">#{ticket.id.slice(0, 8)}</span>
            <span className={'inline-flex items-center px-2 h-5 text-xs font-medium rounded border ' + (statusColors[ticket.status] || statusColors.New)}>
              {ticket.status}
            </span>
          </div>
          <p className="text-sm text-gray-900 line-clamp-2">{ticket.description}</p>
        </div>
        <div className={'text-xs font-semibold ' + (priorityColors[ticket.priority] || priorityColors.Medium)}>
          {ticket.priority}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
        <span className="truncate">{ticket.organization}</span>
        <div className="flex items-center gap-3">
          {watcherCount !== undefined && watcherCount > 0 && (
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{watcherCount}</span>
            </div>
          )}
          <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
}
