'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Lightbulb, Filter, Search, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import LoadingState from '@/components/LoadingState';
import NoteCard from '@/components/NoteCard';

type ProposalStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

interface Proposal {
  id: string;
  entity_type: string;
  entity_id: string | null;
  entity_title: string | null;
  content: string;
  plain_text: string | null;
  created_by: string;
  created_at: string;
  status?: ProposalStatus;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: Clock,
  },
  under_review: {
    label: 'Under Review',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    icon: AlertCircle,
  },
  approved: {
    label: 'Approved',
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-600 bg-red-50 border-red-200',
    icon: XCircle,
  },
};

export default function FeatureProposalsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const isAdmin = user?.user_metadata?.role === 'Admin';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/support/login');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchProposals();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [proposals, statusFilter, searchQuery, showOnlyMine]);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('unified_notes')
        .select('*')
        .eq('entity_type', 'feature_proposal')
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      // Non-admins can only see their own proposals
      if (!isAdmin) {
        query = query.eq('created_by', user!.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProposals(data || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast.error('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...proposals];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => (p.status || 'pending') === statusFilter);
    }

    // Creator filter
    if (showOnlyMine) {
      filtered = filtered.filter(p => p.created_by === user?.id);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.plain_text?.toLowerCase().includes(query) ||
          p.entity_title?.toLowerCase().includes(query)
      );
    }

    setFilteredProposals(filtered);
  };

  const updateProposalStatus = async (proposalId: string, newStatus: ProposalStatus) => {
    try {
      const { error } = await supabase
        .from('unified_notes')
        .update({ status: newStatus })
        .eq('id', proposalId);

      if (error) throw error;

      toast.success(`Proposal marked as ${STATUS_CONFIG[newStatus].label}`);
      fetchProposals();
    } catch (error) {
      console.error('Error updating proposal status:', error);
      toast.error('Failed to update status');
    }
  };

  if (authLoading || loading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Feature Proposals</h1>
              <p className="text-gray-600 mt-1">
                {isAdmin ? 'Review and manage feature proposals from your team' : 'Submit and track your feature proposals'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Creator Filter (Admins only) */}
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Creator</label>
                <button
                  onClick={() => setShowOnlyMine(!showOnlyMine)}
                  className={`w-full px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                    showOnlyMine
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {showOnlyMine ? 'My Proposals Only' : 'All Proposals'}
                </button>
              </div>
            )}

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search proposals..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredProposals.length} of {proposals.length} proposals
          </div>
        </div>

        {/* Proposals List */}
        {filteredProposals.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No proposals found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Be the first to propose a feature!'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => router.push('/support/trials')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Lightbulb className="w-5 h-5" />
                Go to Trials to Create Proposal
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredProposals.map((proposal) => {
              const status = (proposal.status || 'pending') as ProposalStatus;
              const statusConfig = STATUS_CONFIG[status];
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={proposal.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Proposal Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium border ${statusConfig.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            {statusConfig.label}
                          </span>
                          {proposal.entity_title && (
                            <span className="text-sm text-gray-600">
                              Related to: <span className="font-medium">{proposal.entity_title}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          Proposed {format(new Date(proposal.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>

                      {/* Admin Actions */}
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <select
                            value={status}
                            onChange={(e) => updateProposalStatus(proposal.id, e.target.value as ProposalStatus)}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="pending">Pending</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Proposal Content */}
                  <div className="p-6">
                    <NoteCard
                      note={proposal}
                      currentUserId={user?.id || ''}
                      showReplies={true}
                      onNoteUpdated={fetchProposals}
                      onNoteDeleted={fetchProposals}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
