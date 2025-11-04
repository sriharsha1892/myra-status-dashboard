'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { format, differenceInDays } from 'date-fns';
import { Badge, getStatusBadgeVariant, getPriorityBadgeVariant } from './ui/Badge';

type Ticket = Database['public']['Tables']['tickets']['Row'];
type Organization = Database['public']['Tables']['organizations']['Row'];

interface OrganizationPanelProps {
  organizationName: string;
  isOpen: boolean;
  onClose: () => void;
  onTicketClick: (ticket: Ticket) => void;
}

export function OrganizationPanel({
  organizationName,
  isOpen,
  onClose,
  onTicketClick,
}: OrganizationPanelProps) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && organizationName) {
      fetchOrganizationData();
    }
  }, [isOpen, organizationName]);

  const fetchOrganizationData = async () => {
    setLoading(true);
    try {
      // Fetch organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('name', organizationName)
        .single();

      if (orgError) throw orgError;
      setOrganization(orgData);

      // Fetch tickets for this organization
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .eq('organization', organizationName)
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;
      setTickets(ticketsData || []);
    } catch (error) {
      console.error('Error fetching organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const openTickets = tickets.filter((t) => !['Resolved', 'Closed'].includes(t.status));
  const closedTickets = tickets.filter((t) => ['Resolved', 'Closed'].includes(t.status));
  const daysRemaining = organization
    ? differenceInDays(new Date(organization.trial_end_date), new Date())
    : 0;

  // Calculate category breakdown
  const categoryBreakdown = tickets.reduce((acc, ticket) => {
    acc[ticket.category] = (acc[ticket.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Calculate avg resolution time (mock data for now - would need resolved_at timestamps)
  const avgResolutionTime = '2.5 days';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white dark:bg-[#0d1117] border-l border-gray-200 dark:border-gray-800 z-50 overflow-y-auto animate-slideIn shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-800 px-6 py-4 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {organizationName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Organization Insights
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
            >
              <span className="text-xl">×</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        ) : (
          <div className="px-6 py-6 space-y-6">
            {/* Trial Status */}
            {organization && (
              <div className="bg-gray-50 dark:bg-[#161b22] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Trial Status
                  </span>
                  <Badge
                    variant={organization.status === 'Active' ? 'success' : 'default'}
                    size="sm"
                  >
                    {organization.status}
                  </Badge>
                </div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {daysRemaining} days
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Ends {format(new Date(organization.trial_end_date), 'MMM d, yyyy')}
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-[#161b22] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Open Tickets
                </div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {openTickets.length}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-[#161b22] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Closed
                </div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {closedTickets.length}
                </div>
              </div>
            </div>

            {/* Avg Resolution Time */}
            <div className="bg-gray-50 dark:bg-[#161b22] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Avg Resolution Time
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {avgResolutionTime}
              </div>
            </div>

            {/* Top Categories */}
            {topCategories.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Top Categories
                </h3>
                <div className="space-y-2">
                  {topCategories.map(([category, count]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-700 dark:text-gray-300">{category}</span>
                      <span className="text-gray-500 dark:text-gray-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Tickets */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Recent Tickets
              </h3>
              {tickets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No tickets yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.slice(0, 5).map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => {
                        onTicketClick(ticket);
                        onClose();
                      }}
                      className="w-full text-left p-3 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {ticket.ticket_number}
                        </span>
                        <Badge variant={getStatusBadgeVariant(ticket.status)} size="sm">
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-2">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityBadgeVariant(ticket.priority)} size="sm">
                          {ticket.priority}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(ticket.created_at), 'MMM d')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .animate-slideIn {
          animation: slideIn 300ms ease-out;
        }
      `}</style>
    </>
  );
}
