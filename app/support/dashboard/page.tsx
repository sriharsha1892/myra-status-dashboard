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
import { FileText, Clock, CheckCircle2, AlertTriangle, Search, Plus, TrendingUp, TrendingDown, Building2, Users, Rocket, Target } from 'lucide-react';
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
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  subtitle?: string;
}

function StatCard({ title, value, trend, icon, variant = 'default', subtitle }: StatCardProps) {
  // Asana-style color schemes - clean and minimal
  const variantStyles = {
    default: {
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-700',
      accentColor: 'text-slate-900',
    },
    success: {
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      accentColor: 'text-emerald-900',
    },
    warning: {
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      accentColor: 'text-amber-900',
    },
    danger: {
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      accentColor: 'text-rose-900',
    },
    info: {
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      accentColor: 'text-blue-900',
    },
    purple: {
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      accentColor: 'text-purple-900',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="relative bg-white rounded-xl p-5 border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200 group">
      {/* Content */}
      <div className="flex items-start justify-between mb-4">
        <div className={`${styles.iconBg} p-2.5 rounded-lg ${styles.iconColor}`}>
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-md">
            {trend.isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" strokeWidth={2} />
            )}
            <span className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.value}%
            </span>
          </div>
        )}
      </div>
      <div>
        <p className={`text-3xl font-semibold ${styles.accentColor} mb-1.5 tracking-tight`}>{value.toLocaleString()}</p>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        )}
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

  // Organizations state - moved to top to avoid conditional hook calls
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);

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

  // Fetch organizations
  useEffect(() => {
    if (user && !authLoading) {
      fetchOrganizations();
    }
  }, [user, authLoading, role]);

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

  const fetchOrganizations = async () => {
    setOrgLoading(true);
    try {
      let query = supabase.from('trial_organizations').select('*');

      // Role-based filtering
      if (role?.toLowerCase() === 'account_manager') {
        query = query.eq('account_manager_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setOrgLoading(false);
    }
  };

  // Calculate stats
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => !['Resolved', 'Closed'].includes(t.status)).length;
  const resolvedTickets = tickets.filter((t) => t.status === 'Resolved').length;
  const criticalTickets = tickets.filter((t) => t.priority === 'Critical').length;

  // Organization stats
  const totalOrgs = organizations.length;
  const activeTrials = organizations.filter((org) =>
    org.trial_status === 'active' || org.trial_status === 'requested'
  ).length;
  const prospectOrgs = organizations.filter((org) =>
    org.org_lifecycle_stage === 'prospect'
  ).length;
  const customerOrgs = organizations.filter((org) =>
    org.org_lifecycle_stage === 'customer'
  ).length;

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
          {loading || orgLoading ? (
            <>
              {/* Skeleton for metric cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
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
              {/* Key Metrics - Focused view */}
              <div className="grid grid-cols-4 gap-4 mb-5">
                <StatCard
                  title="Active Trials"
                  value={activeTrials}
                  icon={<Rocket className="w-5 h-5" strokeWidth={2} />}
                  variant="purple"
                  subtitle="Currently running"
                />
                <StatCard
                  title="Open Tickets"
                  value={openTickets}
                  icon={<Clock className="w-5 h-5" strokeWidth={2} />}
                  variant="warning"
                  subtitle="Needs attention"
                />
                <StatCard
                  title="Critical Tickets"
                  value={criticalTickets}
                  icon={<AlertTriangle className="w-5 h-5" strokeWidth={2} />}
                  variant="danger"
                  subtitle="High priority"
                />
                {/* Show different 4th card based on context */}
                {criticalTickets > 0 || openTickets > 10 ? (
                  <StatCard
                    title="Resolved This Week"
                    value={resolvedTickets}
                    icon={<CheckCircle2 className="w-5 h-5" strokeWidth={2} />}
                    variant="success"
                    subtitle="Completed issues"
                  />
                ) : (
                  <StatCard
                    title={role?.toLowerCase() === 'account_manager' ? "My Organizations" : "Total Organizations"}
                    value={totalOrgs}
                    icon={<Building2 className="w-5 h-5" strokeWidth={2} />}
                    variant="info"
                    subtitle="Across all stages"
                  />
                )}
              </div>

              {/* Tickets Table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-slate-700 uppercase tracking-wide">Recent Tickets</h2>
                  {filteredTickets.length > 7 && (
                    <button
                      onClick={() => router.push('/support/tickets')}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      View All ({filteredTickets.length})
                    </button>
                  )}
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
                    {filteredTickets.slice(0, 7).map((ticket, index) => (
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

              {/* Charts Section */}
              <div className="grid grid-cols-2 gap-6 mt-6">
                {/* Ticket Status Chart */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-6">Tickets by Status</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Open', count: tickets.filter(t => t.status === 'Open').length, color: 'bg-blue-500' },
                      { label: 'In Progress', count: tickets.filter(t => t.status === 'In Progress').length, color: 'bg-yellow-500' },
                      { label: 'Resolved', count: tickets.filter(t => t.status === 'Resolved').length, color: 'bg-green-500' },
                      { label: 'Closed', count: tickets.filter(t => t.status === 'Closed').length, color: 'bg-slate-400' },
                    ].map((status) => {
                      const percentage = totalTickets > 0 ? (status.count / totalTickets) * 100 : 0;
                      return (
                        <div key={status.label}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">{status.label}</span>
                            <span className="text-sm font-bold text-slate-900">{status.count}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full ${status.color} transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Organizations by Lifecycle Stage */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-6">Organizations by Stage</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Prospect', count: prospectOrgs, color: 'bg-purple-500' },
                      { label: 'Trial Active', count: activeTrials, color: 'bg-blue-500' },
                      { label: 'Customer', count: customerOrgs, color: 'bg-green-500' },
                    ].map((stage) => {
                      const percentage = totalOrgs > 0 ? (stage.count / totalOrgs) * 100 : 0;
                      return (
                        <div key={stage.label}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">{stage.label}</span>
                            <span className="text-sm font-bold text-slate-900">{stage.count}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full ${stage.color} transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Activity Section */}
              <div className="grid grid-cols-3 gap-6 mt-6">
                {/* Quick Actions */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => router.push('/support/trials/new')}
                      className="w-full flex items-center gap-3 p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Building2 className="w-5 h-5 text-blue-600" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">New Organization</p>
                        <p className="text-xs text-slate-500">Create trial org</p>
                      </div>
                    </button>

                    <button
                      onClick={() => router.push('/support/submit')}
                      className="w-full flex items-center gap-3 p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <Plus className="w-5 h-5 text-green-600" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">New Ticket</p>
                        <p className="text-xs text-slate-500">Create support ticket</p>
                      </div>
                    </button>

                    <button
                      onClick={() => router.push('/support/trials')}
                      className="w-full flex items-center gap-3 p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <FileText className="w-5 h-5 text-purple-600" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">View All Orgs</p>
                        <p className="text-xs text-slate-500">Browse organizations</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Recent Organizations */}
                <div className="col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Recent Organizations</h3>
                    <button
                      onClick={() => router.push('/support/trials')}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View All →
                    </button>
                  </div>
                  {organizations.length === 0 ? (
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
                      <p className="text-sm text-slate-600">No organizations yet</p>
                      <button
                        onClick={() => router.push('/support/trials/new')}
                        className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Create your first organization →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {organizations.slice(0, 5).map((org) => (
                        <button
                          key={org.org_id}
                          onClick={() => router.push(`/support/trials/${org.org_id}`)}
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 rounded-lg transition-colors group"
                        >
                          {org.logo_url ? (
                            <img
                              src={org.logo_url}
                              alt={org.org_name}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg border-2 border-slate-200 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                              <span className="text-xs font-bold text-slate-600">
                                {org.org_name.split(' ').map((word: string) => word[0]).join('').toUpperCase().substring(0, 2)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {org.org_name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                org.trial_status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : org.trial_status === 'requested'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {org.trial_status || 'Unknown'}
                              </span>
                              {org.domain && (
                                <span className="text-xs text-slate-500">
                                  {org.domain}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(org.created_at), { addSuffix: true })}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
  );
}
