'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { MessageCircle, Search, Filter, Calendar, User, Mail, Clock, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CustomerTicket {
  ticket_id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  user_name: string;
  user_email: string;
  created_at: string;
  updated_at: string;
}

export default function CustomerSupportDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<CustomerTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<CustomerTicket | null>(null);

  // Check if user is super admin
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/support/login');
        return;
      }

      // Check if user is admin or super admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_super_admin, role')
        .eq('id', authUser.id)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user data:', userError);
        toast.error('Error verifying permissions');
        router.push('/support/dashboard');
        return;
      }

      // If user doesn't exist in users table, deny access
      if (!userData) {
        console.log('User not found in users table. User ID:', authUser.id);
        toast.error('User account not found. Please contact support.');
        router.push('/support/dashboard');
        return;
      }

      console.log('User role check:', { role: userData?.role, is_super_admin: userData?.is_super_admin });

      const isAdmin = userData?.role?.toLowerCase().includes('admin');
      const isSuperAdmin = userData?.is_super_admin === true;

      if (!isAdmin && !isSuperAdmin) {
        console.log('Access denied. Role:', userData?.role, 'is_super_admin:', userData?.is_super_admin);
        toast.error('Access denied. Admin access required.');
        router.push('/support/dashboard');
        return;
      }

      setUser(authUser);
      fetchCustomerTickets();
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/support/login');
    }
  };

  const fetchCustomerTickets = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('source', 'customer_chat')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTickets(data || []);
      setFilteredTickets(data || []);
    } catch (error: any) {
      console.error('Error fetching customer tickets:', error);
      toast.error('Failed to load customer tickets');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...tickets];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.ticket_number?.toLowerCase().includes(query) ||
        t.title?.toLowerCase().includes(query) ||
        t.user_name?.toLowerCase().includes(query) ||
        t.user_email?.toLowerCase().includes(query)
      );
    }

    setFilteredTickets(filtered);
  }, [tickets, statusFilter, priorityFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      open: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: AlertCircle, label: 'Open' },
      in_progress: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, label: 'In Progress' },
      resolved: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, label: 'Resolved' },
      closed: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle, label: 'Closed' },
    };

    const config = statusConfig[status] || statusConfig.open;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[priority] || priorityConfig.medium}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Support</h1>
              <p className="text-sm text-gray-600">Manage customer inquiries from the chat widget</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Tickets', value: tickets.length, color: 'blue' },
            { label: 'Open', value: tickets.filter(t => t.status === 'open').length, color: 'orange' },
            { label: 'In Progress', value: tickets.filter(t => t.status === 'in_progress').length, color: 'yellow' },
            { label: 'Resolved', value: tickets.filter(t => t.status === 'resolved').length, color: 'green' },
          ].map((stat, index) => (
            <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets, name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Tickets List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredTickets.length === 0 ? (
            <div className="p-12 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No customer tickets yet</p>
              <p className="text-sm text-gray-500">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Customer messages will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.ticket_id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Ticket Number & Status */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-gray-500">#{ticket.ticket_number}</span>
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-1">
                        {ticket.title}
                      </h3>

                      {/* Customer Info */}
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          {ticket.user_name}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          {ticket.user_email}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(ticket.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTicket(null)}>
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-gray-500">#{selectedTicket.ticket_number}</span>
                      {getStatusBadge(selectedTicket.status)}
                      {getPriorityBadge(selectedTicket.priority)}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedTicket.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Customer Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Customer Information</h3>
                    <a
                      href={`mailto:${selectedTicket.user_email}?subject=Re: ${selectedTicket.title} (Ticket #${selectedTicket.ticket_number})`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Email User
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-medium text-gray-900">{selectedTicket.user_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium text-gray-900">{selectedTicket.user_email}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <p className="font-medium text-gray-900">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Last Updated:</span>
                      <p className="font-medium text-gray-900">{new Date(selectedTicket.updated_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Message</h3>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedTicket.description }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
