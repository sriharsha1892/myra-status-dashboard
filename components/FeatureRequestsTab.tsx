'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import AddFeatureRequestModal from './AddFeatureRequestModal';
import LinkIndicator from './LinkIndicator';
import LinkedItemsDisplay from './LinkedItemsDisplay';
import LinkFeatureRoadmapModal from './LinkFeatureRoadmapModal';
import ForwardFeatureModal from './ForwardFeatureModal';

interface FeatureRequest {
  id: string;
  org_id: string;
  user_id?: string;
  title: string;
  description: string;
  use_case?: string;
  status: 'submitted' | 'reviewed' | 'planned' | 'in_progress' | 'completed' | 'rejected' | 'duplicate';
  priority: 'low' | 'medium' | 'high' | 'critical';
  votes: number;
  product_response?: string;
  product_responded_at?: string;
  product_responded_by?: string;
  expected_availability_date?: string;
  created_at: string;
  updated_at: string;
  linked_roadmap_count?: number;
}

interface FeatureRequestsTabProps {
  orgId: string;
}

const STATUS_CONFIG: { [key: string]: { icon: string; color: string; label: string } } = {
  submitted: { icon: '📬', color: 'blue', label: 'Submitted' },
  reviewed: { icon: '👀', color: 'purple', label: 'Reviewed' },
  planned: { icon: '📋', color: 'yellow', label: 'Planned' },
  in_progress: { icon: '🚀', color: 'orange', label: 'In Progress' },
  completed: { icon: '✅', color: 'green', label: 'Completed' },
  rejected: { icon: '❌', color: 'red', label: 'Rejected' },
  duplicate: { icon: '⚡', color: 'gray', label: 'Duplicate' },
};

const PRIORITY_CONFIG: { [key: string]: { icon: string; color: string; label: string } } = {
  low: { icon: '🟢', color: 'green', label: 'Low' },
  medium: { icon: '🟡', color: 'yellow', label: 'Medium' },
  high: { icon: '🔴', color: 'red', label: 'High' },
  critical: { icon: '🚨', color: 'red', label: 'Critical' },
};

export default function FeatureRequestsTab({ orgId }: FeatureRequestsTabProps) {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'votes' | 'date'>('votes');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedItemTitle, setSelectedItemTitle] = useState<string>('');
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [selectedForwardId, setSelectedForwardId] = useState<string>('');
  const [selectedForwardTitle, setSelectedForwardTitle] = useState<string>('');

  const supabase = createClient();

  useEffect(() => {
    fetchRequests();
  }, [orgId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .eq('org_id', orgId)
        .order(sortBy === 'votes' ? 'votes' : 'created_at', {
          ascending: sortBy === 'votes' ? false : false,
        });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load feature requests');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = filterStatus ? requests.filter((req) => req.status === filterStatus) : requests;

  const getStatusColor = (status: string) => {
    const config = STATUS_CONFIG[status];
    switch (config?.color) {
      case 'blue':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'purple':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'yellow':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'orange':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'green':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'red':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'gray':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    const config = PRIORITY_CONFIG[priority];
    switch (config?.color) {
      case 'green':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'yellow':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'red':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-600">Loading feature requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Feature Requests</h3>
          <p className="text-sm text-gray-600 mt-1">Track customer feature requests and feedback</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>New Request</span>
        </button>
      </div>

      {/* Filters and Sort */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus(null)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              filterStatus === null
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            All ({requests.length})
          </button>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const count = requests.filter((req) => req.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === status
                    ? `${getStatusColor(status)} border`
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {config.icon} ({count})
              </button>
            );
          })}
        </div>
        <div className="ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'votes' | 'date')}
            className="h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="votes">Sort by Votes</option>
            <option value="date">Sort by Date</option>
          </select>
        </div>
      </div>

      {/* Feature Requests */}
      {filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/50 rounded-lg border border-dashed border-gray-300">
          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 font-medium">No feature requests</p>
          <p className="text-sm text-gray-500 mt-1">
            {filterStatus ? 'No requests with this status' : 'Start by creating your first feature request'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const statusConfig = STATUS_CONFIG[request.status];
            const priorityConfig = PRIORITY_CONFIG[request.priority];

            return (
              <div key={request.id} className={`rounded-lg border-2 p-4 ${getStatusColor(request.status)}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{statusConfig.icon}</span>
                      <h4 className="text-base font-semibold text-gray-900 break-words">{request.title}</h4>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{request.description}</p>
                    {request.use_case && (
                      <p className="text-xs text-gray-600 mt-2 italic">Use case: {request.use_case}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-col items-end">
                    <div className="flex gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(request.priority)}`}>
                        {priorityConfig.icon} {priorityConfig.label}
                      </div>
                      <div className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded-lg">
                        <span className="text-sm font-bold text-gray-900">👍</span>
                        <span className="text-sm font-medium text-gray-700">{request.votes}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <LinkIndicator
                        linkedCount={request.linked_roadmap_count || 0}
                        type="feature"
                        size="sm"
                        onClick={() => {
                          setSelectedItemId(request.id);
                          setSelectedItemTitle(request.title);
                          setShowLinkModal(true);
                        }}
                      />
                      <button
                        onClick={() => {
                          setSelectedForwardId(request.id);
                          setSelectedForwardTitle(request.title);
                          setShowForwardModal(true);
                        }}
                        title="Forward to admin with context"
                        className="px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium text-xs transition-all"
                      >
                        ⬆️ Forward
                      </button>
                    </div>
                  </div>
                </div>

                {/* Product Response */}
                {request.product_response && (
                  <div className="mt-3 p-3 bg-white/40 rounded border border-current border-opacity-20">
                    <p className="text-xs font-medium text-gray-700 mb-1">Product Response:</p>
                    <p className="text-sm text-gray-800">{request.product_response}</p>
                    {request.product_responded_by && (
                      <p className="text-xs text-gray-600 mt-1">by {request.product_responded_by}</p>
                    )}
                  </div>
                )}

                {/* Linked Roadmap Items */}
                {request.linked_roadmap_count && request.linked_roadmap_count > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300/30">
                    <LinkedItemsDisplay
                      orgId={orgId}
                      itemId={request.id}
                      type="feature"
                      title={request.title}
                      onLinkClick={() => {
                        setSelectedItemId(request.id);
                        setSelectedItemTitle(request.title);
                        setShowLinkModal(true);
                      }}
                    />
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
                  <span>Submitted {format(new Date(request.created_at), 'MMM dd, yyyy')}</span>
                  {request.expected_availability_date && (
                    <span>Expected: {format(new Date(request.expected_availability_date), 'MMM dd, yyyy')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <AddFeatureRequestModal
        orgId={orgId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchRequests}
      />

      <LinkFeatureRoadmapModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        orgId={orgId}
        mode="feature"
        selectedId={selectedItemId}
        selectedTitle={selectedItemTitle}
        onSuccess={() => {
          setShowLinkModal(false);
          fetchRequests();
        }}
      />

      <ForwardFeatureModal
        isOpen={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        orgId={orgId}
        featureId={selectedForwardId}
        featureTitle={selectedForwardTitle}
        onSuccess={fetchRequests}
      />
    </div>
  );
}
