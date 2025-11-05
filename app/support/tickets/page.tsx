'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { formatDistanceToNow } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import {
  Search,
  Filter,
  Plus,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ArrowUpDown,
  ChevronDown,
  XCircle,
} from 'lucide-react';

type Ticket = Database['public']['Tables']['tickets']['Row'];

const STATUS_OPTIONS = ['All', 'New', 'Open', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'];
const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High', 'Critical'];
const CATEGORY_OPTIONS = [
  'All',
  'Security',
  'Tool Functioning',
  'Feature Set',
  'Usage',
  'Requests',
  'Data Quality',
  'Performance',
  'Feature Request',
  'Other',
];

// Status badge config
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'New':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Circle };
    case 'Open':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Circle };
    case 'In Progress':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock };
    case 'Waiting on User':
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: AlertTriangle };
    case 'Resolved':
      return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 };
    case 'Closed':
      return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', icon: XCircle };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', icon: Circle };
  }
};

// Priority config
const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'Critical':
      return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    case 'High':
      return { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    case 'Medium':
      return { text: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    case 'Low':
      return { text: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' };
    default:
      return { text: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' };
  }
};

export default function TicketsListPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortField, setSortField] = useState<'created_at' | 'updated_at' | 'priority'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [tickets, searchQuery, statusFilter, priorityFilter, categoryFilter, sortField, sortDirection]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // For Account Managers: only fetch tickets from their assigned organizations
      if (role?.toLowerCase() === 'account_manager') {
        // First, get the AMs assigned trial organizations
        const { data: assignedOrgs, error: orgsError } = await supabase
          .from('trial_organizations')
          .select('org_id, org_name')
          .eq('account_manager_id', user?.id);

        if (orgsError) throw orgsError;

        const orgIds = assignedOrgs?.map((org) => org.org_id) || [];

        // Fetch tickets that belong to these organizations
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select('*')
          .in('trial_org_id', orgIds)
          .order('created_at', { ascending: false });

        if (ticketsError) throw ticketsError;
        setTickets(ticketsData || []);
      } else {
        // Admin and Product roles: see all tickets
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

  const applyFilters = () => {
    let filtered = [...tickets];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.ticket_number?.toLowerCase().includes(query) ||
          ticket.description?.toLowerCase().includes(query) ||
          ticket.organization?.toLowerCase().includes(query) ||
          ticket.user_name?.toLowerCase().includes(query) ||
          ticket.user_email?.toLowerCase().includes(query) ||
          ticket.category?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'All') {
      filtered = filtered.filter((ticket) => ticket.priority === priorityFilter);
    }

    // Category filter
    if (categoryFilter !== 'All') {
      filtered = filtered.filter((ticket) => ticket.category === categoryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'priority') {
        const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        aVal = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bVal = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredTickets(filtered);
  };

  const toggleSort = (field: 'created_at' | 'updated_at' | 'priority') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setPriorityFilter('All');
    setCategoryFilter('All');
  };

  const activeFiltersCount = [statusFilter, priorityFilter, categoryFilter].filter((f) => f !== 'All').length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading tickets...</div>
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {role?.toLowerCase() === 'account_manager' ? 'My Tickets' : 'All Tickets'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'}
                {activeFiltersCount > 0 && ` (${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active)`}
              </p>
            </div>

            <button
              onClick={() => router.push('/support/submit')}
              className="flex items-center gap-2 h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30"
            >
              <Plus className="w-4 h-4" />
              New Ticket
            </button>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets by number, description, organization, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-lg transition-all ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="h-10 px-4 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Tickets Table */}
        {filteredTickets.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tickets found</h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchQuery || activeFiltersCount > 0
                ? 'Try adjusting your filters or search query'
                : 'Get started by creating your first ticket'}
            </p>
            <button
              onClick={() => router.push('/support/submit')}
              className="inline-flex items-center gap-2 h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Ticket
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wide">
              <div className="col-span-2">Ticket #</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-2">Organization</div>
              <div className="col-span-1">
                <button
                  onClick={() => toggleSort('priority')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Priority
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">
                <button
                  onClick={() => toggleSort('created_at')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Created
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {filteredTickets.map((ticket) => {
                const statusConfig = getStatusConfig(ticket.status);
                const priorityConfig = getPriorityConfig(ticket.priority);
                const StatusIcon = statusConfig.icon;

                return (
                  <button
                    key={ticket.id}
                    onClick={() => router.push(`/support/tickets/${ticket.id}`)}
                    className="w-full grid grid-cols-12 gap-4 px-6 py-4 hover:bg-blue-50/50 transition-colors text-left"
                  >
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-blue-600 truncate">
                          {ticket.ticket_number}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{ticket.category}</div>
                    </div>

                    <div className="col-span-3">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{ticket.user_name}</span>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <p className="text-sm text-gray-900 truncate">{ticket.organization}</p>
                    </div>

                    <div className="col-span-1">
                      <span
                        className={`inline-flex items-center h-6 px-2 text-xs font-medium rounded-md border ${priorityConfig.bg} ${priorityConfig.text} ${priorityConfig.border}`}
                      >
                        {ticket.priority}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span
                        className={`inline-flex items-center gap-1.5 h-6 px-2 text-xs font-medium rounded-md border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {ticket.status}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Updated {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
