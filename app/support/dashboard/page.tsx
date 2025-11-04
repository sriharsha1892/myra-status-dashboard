// -nocheck
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { formatDistanceToNow } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import InlineStatusSelect from '@/components/support/inline/InlineStatusSelect';
import InlinePrioritySelect from '@/components/support/inline/InlinePrioritySelect';
import InlineAssigneeSelect from '@/components/support/inline/InlineAssigneeSelect';
import { FileText, Clock, CheckCircle2, AlertTriangle, Search, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { SkeletonCard, SkeletonTable } from '@/components/Skeleton';

type Ticket = Database['public']['Tables']['tickets']['Row'];

interface StatCardProps {
  title: string;
  value: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
}

function StatCard({ title, value, trend, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="text-slate-400">
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            {trend.isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-600" strokeWidth={2} />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" strokeWidth={2} />
            )}
            <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value}%
            </span>
          </div>
        )}
      </div>
      <div>
        <p className="text-4xl font-bold text-slate-900 mb-1">{value}</p>
        <p className="text-sm text-slate-600">{title}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut, role } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
      return;
    }

    // Fetch tickets as soon as user is authenticated
    if (user && !authLoading && (role?.toLowerCase() === 'team' || role?.toLowerCase() === 'admin')) {
      fetchTickets();
    }
  }, [user, authLoading, role, router]);

  const filteredTickets = tickets.filter((ticket) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.ticket_number.toLowerCase().includes(query) ||
        ticket.organization.toLowerCase().includes(query) ||
        ticket.user_name.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // For AMs: Get their org IDs first, then filter tickets
      if (role?.toLowerCase() === 'account_manager') {
        const { data: userOrgs } = await supabase
          .from('trial_organizations')
          .select('org_id')
          .eq('account_manager_id', user?.id);

        const orgIds = (userOrgs || []).map((org: any) => org.org_id);

        if (orgIds.length === 0) {
          setTickets([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .in('trial_org_id', orgIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTickets(data || []);
      } else {
        // Admin/Product: Show all tickets
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTickets(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const oldStatus = ticket.status;
    setTickets(tickets.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t)));

    try {
      const { error } = await supabase
        // -ignore - Supabase typing issue with dynamic columns

        .from('tickets')
        // @ts-ignore - Supabase typing issue with dynamic columns
        // -ignore - Supabase typing issue with dynamic columns

        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          resolved_at: newStatus === 'Resolved' ? new Date().toISOString() : null,
        })
        .eq('id', ticketId);

      if (error) throw error;

      await supabase.from('ticket_activities')
        // @ts-ignore - Supabase typing issue with dynamic columns
        // -ignore - Supabase typing issue with dynamic columns

        .insert({
          ticket_id: ticketId,
          user_id: user?.id || null,
          activity_type: 'status_changed',
        old_value: oldStatus,
        new_value: newStatus,
      });

      toast.success(`Status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating status:', error);
      setTickets(tickets.map((t) => (t.id === ticketId ? { ...t, status: oldStatus } : t)));
      toast.error('Failed to update status');
      throw error;
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const oldPriority = ticket.priority;
    setTickets(tickets.map((t) => (t.id === ticketId ? { ...t, priority: newPriority } : t)));

    try {
      const { error } = await supabase
        // -ignore - Supabase typing issue with dynamic columns

        .from('tickets')
        // @ts-ignore - Supabase typing issue with dynamic columns
        // -ignore - Supabase typing issue with dynamic columns

        .update({
          priority: newPriority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;
      toast.success(`Priority updated to ${newPriority}`);
    } catch (error: any) {
      console.error('Error updating priority:', error);
      setTickets(tickets.map((t) => (t.id === ticketId ? { ...t, priority: oldPriority } : t)));
      toast.error('Failed to update priority');
      throw error;
    }
  };

  const handleAssigneeChange = async (ticketId: string, newAssigneeId: string | null) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const oldAssigneeId = ticket.assigned_to;
    setTickets(tickets.map((t) => (t.id === ticketId ? { ...t, assigned_to: newAssigneeId } : t)));

    try {
      const { error } = await supabase
        // -ignore - Supabase typing issue with dynamic columns

        .from('tickets')
        // @ts-ignore - Supabase typing issue with dynamic columns
        // -ignore - Supabase typing issue with dynamic columns

        .update({
          assigned_to: newAssigneeId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;

      await supabase.from('ticket_activities')
        // @ts-ignore - Supabase typing issue with dynamic columns
        // -ignore - Supabase typing issue with dynamic columns

        .insert({
          ticket_id: ticketId,
          user_id: user?.id || null,
          activity_type: 'assigned',
          old_value: oldAssigneeId,
          new_value: newAssigneeId,
        });

      if (newAssigneeId && user?.id) {
        await supabase.from('notifications')
          // @ts-ignore - Supabase typing issue with dynamic columns
          // -ignore - Supabase typing issue with dynamic columns

          .insert({
            user_id: newAssigneeId,
            ticket_id: ticketId,
            type: 'assigned',
            message: `You have been assigned to ticket ${ticket.ticket_number}`,
          });
      }

      toast.success(newAssigneeId ? 'Assignee updated' : 'Ticket unassigned');
    } catch (error: any) {
      console.error('Error updating assignee:', error);
      setTickets(tickets.map((t) => (t.id === ticketId ? { ...t, assigned_to: oldAssigneeId } : t)));
      toast.error('Failed to update assignee');
      throw error;
    }
  };

  // Don't render anything while auth is loading - let layout handle it
  if (authLoading || !user) {
    return null;
  }

  if (role?.toLowerCase() !== 'team' && role?.toLowerCase() !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => !['Resolved', 'Closed'].includes(t.status)).length;
  const resolvedTickets = tickets.filter((t) => t.status === 'Resolved').length;
  const criticalTickets = tickets.filter((t) => t.priority === 'Critical').length;

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">Welcome back, {user?.email?.split('@')[0]}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search tickets, organizations, users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-96 h-12 pl-10 pr-4 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <button
                onClick={() => router.push('/support/submit')}
                className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                New Ticket
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <>
              {/* Skeleton for metric cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
              {/* Skeleton for table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                </div>
                <SkeletonTable rows={8} />
              </div>
            </>
          ) : (
            <>
              {/* Metric Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard
                  title="Total Tickets"
                  value={totalTickets}
                  icon={<FileText className="w-5 h-5" strokeWidth={2} />}
                />
                <StatCard
                  title="Open Tickets"
                  value={openTickets}
                  icon={<Clock className="w-5 h-5" strokeWidth={2} />}
                  trend={{ value: 12, isPositive: false }}
                />
                <StatCard
                  title="Resolved"
                  value={resolvedTickets}
                  icon={<CheckCircle2 className="w-5 h-5" strokeWidth={2} />}
                  trend={{ value: 8, isPositive: true }}
                />
                <StatCard
                  title="Critical"
                  value={criticalTickets}
                  icon={<AlertTriangle className="w-5 h-5" strokeWidth={2} />}
                />
              </div>

              {/* Tickets Table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-sm font-medium text-slate-700 uppercase tracking-wide">Recent Tickets</h2>
                </div>

                {filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="text-center max-w-md">
                  <h3 className="text-base font-semibold text-slate-900 mb-2">
                    {searchQuery ? 'No tickets found' : 'No tickets yet'}
                  </h3>
                  <p className="text-sm text-slate-600 mb-6">
                    {searchQuery
                      ? 'Try adjusting your search terms.'
                      : 'Get started by creating your first support ticket.'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => router.push('/support/submit')}
                      className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2} />
                      Create First Ticket
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="h-12 px-6 text-left text-xs font-medium text-slate-600 uppercase tracking-wide">
                        Ticket
                      </th>
                      <th className="h-12 px-6 text-left text-xs font-medium text-slate-600 uppercase tracking-wide">
                        Organization
                      </th>
                      <th className="h-12 px-6 text-left text-xs font-medium text-slate-600 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="h-12 px-6 text-left text-xs font-medium text-slate-600 uppercase tracking-wide">
                        Priority
                      </th>
                      <th className="h-12 px-6 text-left text-xs font-medium text-slate-600 uppercase tracking-wide">
                        Assignee
                      </th>
                      <th className="h-12 px-6 text-left text-xs font-medium text-slate-600 uppercase tracking-wide">
                        Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket, index) => (
                      <tr
                        key={ticket.id}
                        className="border-t border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td
                          className="py-4 px-6"
                          onClick={() => router.push(`/support/tickets/${ticket.id}`)}
                        >
                          <div className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors">
                            {ticket.ticket_number}
                          </div>
                          <div className="text-sm text-slate-600 mt-0.5 truncate max-w-xs" title={ticket.description}>
                            {ticket.description}
                          </div>
                        </td>
                        <td
                          className="py-4 px-6"
                          onClick={() => router.push(`/support/tickets/${ticket.id}`)}
                        >
                          <div className="text-sm text-slate-900">{ticket.organization}</div>
                        </td>
                        <td className="py-4 px-6">
                          <InlineStatusSelect
                            value={ticket.status}
                            ticketId={ticket.id}
                            onChange={handleStatusChange}
                          />
                        </td>
                        <td className="py-4 px-6">
                          <InlinePrioritySelect
                            value={ticket.priority}
                            ticketId={ticket.id}
                            onChange={handlePriorityChange}
                          />
                        </td>
                        <td className="py-4 px-6">
                          <InlineAssigneeSelect
                            value={ticket.assigned_to}
                            ticketId={ticket.id}
                            onChange={handleAssigneeChange}
                          />
                        </td>
                        <td
                          className="py-4 px-6 text-sm text-slate-600"
                          onClick={() => router.push(`/support/tickets/${ticket.id}`)}
                        >
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
              </div>
            </>
          )}
        </div>
      </main>
  );
}
