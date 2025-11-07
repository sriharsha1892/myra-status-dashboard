'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import AddSupportQueryModal from './AddSupportQueryModal';
import { format } from 'date-fns';

interface SupportQuery {
  id: string;
  org_id: string;
  user_id?: string;
  query_type: string;
  title: string;
  description?: string;
  status: string;
  created_by: string;
  created_by_role: string;
  product_notes?: string;
  product_updated_by?: string;
  product_updated_at?: string;
  created_at: string;
  updated_at: string;
}

interface TrialUser {
  user_id: string;
  name: string;
}

interface SupportQueriesTabProps {
  orgId: string;
}

const QUERY_TYPES: { [key: string]: string } = {
  general_support: 'General Support',
  security_related: 'Security Related',
  functionality_related: 'Functionality Related',
  onboard_more_users: 'Onboard More Users',
  technical_guidance: 'Technical Guidance',
  other: 'Other',
};

export default function SupportQueriesTab({ orgId }: SupportQueriesTabProps) {
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [trialUsers, setTrialUsers] = useState<TrialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [updatingQueryId, setUpdatingQueryId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch queries
      const { data: queriesData, error: queriesError } = await supabase
        .from('trial_support_queries')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (queriesError) throw queriesError;
      setQueries(queriesData || []);

      // Fetch trial users for reference
      const { data: usersData, error: usersError } = await supabase
        .from('trial_users')
        .select('user_id, name')
        .eq('org_id', orgId);

      if (usersError) throw usersError;
      setTrialUsers(usersData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load support queries');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (queryId: string, newStatus: string) => {
    setUpdatingQueryId(queryId);
    try {
      const { error } = await supabase
        .from('trial_support_queries')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', queryId);

      if (error) throw error;

      toast.success(`Query status updated to ${newStatus}`);
      await fetchData();
    } catch (error: any) {
      console.error('Error updating query status:', error);
      toast.error('Failed to update query status');
    } finally {
      setUpdatingQueryId(null);
    }
  };

  const getUserName = (userId: string | undefined) => {
    if (!userId) return '(Organization Level)';
    return trialUsers.find((u) => u.user_id === userId)?.full_name || userId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-red-600 bg-red-50 border border-red-200';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-50 border border-yellow-200';
      case 'resolved':
        return 'text-green-600 bg-green-50 border border-green-200';
      case 'closed':
        return 'text-gray-600 bg-gray-50 border border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      general_support: 'text-blue-600 bg-blue-50',
      security_related: 'text-red-600 bg-red-50',
      functionality_related: 'text-purple-600 bg-purple-50',
      onboard_more_users: 'text-green-600 bg-green-50',
      technical_guidance: 'text-orange-600 bg-orange-50',
      other: 'text-gray-600 bg-gray-50',
    };
    return colors[type] || 'text-gray-600 bg-gray-50';
  };

  const formatStatus = (status: string) => {
    return status.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Filter queries
  let filteredQueries = queries;
  if (statusFilter !== 'all') {
    filteredQueries = filteredQueries.filter((q) => q.status === statusFilter);
  }
  if (levelFilter === 'org') {
    filteredQueries = filteredQueries.filter((q) => !q.user_id);
  } else if (levelFilter === 'user') {
    filteredQueries = filteredQueries.filter((q) => q.user_id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-600">Loading support queries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button and Filters */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Support Queries ({filteredQueries.length})</h3>
          <p className="text-sm text-gray-600 mt-1">Track support requests and queries from users</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Log Query</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Level:</label>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="h-8 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="org">Organization Level</option>
            <option value="user">User Level</option>
          </select>
        </div>
      </div>

      {/* Queries List */}
      {filteredQueries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/50 rounded-lg border border-dashed border-gray-300">
          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 font-medium">No support queries</p>
          <p className="text-sm text-gray-500 mt-1">Log your first support query to track customer issues</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQueries.map((query) => (
            <div
              key={query.id}
              className="bg-white/80 rounded-xl border border-gray-200/60 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getTypeColor(query.query_type)}`}>
                      {QUERY_TYPES[query.query_type] || query.query_type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {query.user_id ? '👤 User Level' : '🏢 Org Level'}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{query.title}</h4>

                  {query.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{query.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <span>{query.user_id ? `User: ${getUserName(query.user_id)}` : 'Organization Level'}</span>
                    <span>Created: {format(new Date(query.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={query.status}
                    onChange={(e) => handleStatusChange(query.id, e.target.value)}
                    disabled={updatingQueryId === query.id}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-md border cursor-pointer transition-all ${getStatusColor(query.status)}`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {query.product_notes && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-semibold text-blue-900 mb-1">Product Notes:</p>
                  <p className="text-xs text-blue-800">{query.product_notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Query Modal */}
      <AddSupportQueryModal
        orgId={orgId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
