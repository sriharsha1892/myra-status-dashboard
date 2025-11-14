'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Eye, ClipboardList, Rocket, CheckCircle, XCircle, Copy, Circle, AlertTriangle, ThumbsUp, Building2, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLoading } from '@/lib/loading';

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
  trial_organizations?: {
    org_id: string;
    org_name: string;
    org_lifecycle_stage: string;
    health_status: string;
  };
}

interface Stats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  total_votes: number;
}

const STATUS_CONFIG: { [key: string]: { icon: any; color: string; label: string } } = {
  submitted: { icon: Mail, color: 'blue', label: 'Submitted' },
  reviewed: { icon: Eye, color: 'purple', label: 'Reviewed' },
  planned: { icon: ClipboardList, color: 'yellow', label: 'Planned' },
  in_progress: { icon: Rocket, color: 'orange', label: 'In Progress' },
  completed: { icon: CheckCircle, color: 'green', label: 'Completed' },
  rejected: { icon: XCircle, color: 'red', label: 'Rejected' },
  duplicate: { icon: Copy, color: 'gray', label: 'Duplicate' },
};

const PRIORITY_CONFIG: { [key: string]: { icon: any; color: string; label: string } } = {
  low: { icon: Circle, color: 'green', label: 'Low' },
  medium: { icon: Circle, color: 'yellow', label: 'Medium' },
  high: { icon: Circle, color: 'red', label: 'High' },
  critical: { icon: AlertTriangle, color: 'red', label: 'Critical' },
};

export default function FeatureRequestsPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const { isLoading: pageLoading, startLoading, stopLoading } = useLoading('page', 'feature-requests');

  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'votes' | 'date' | 'priority'>('votes');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [sortBy]);

  const fetchRequests = async () => {
    startLoading();
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);
      params.append('sort_by', sortBy);

      const response = await fetch(`/api/feature-requests?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setRequests(result.data || []);
        setStats(result.stats);
      } else {
        toast.error(result.error || 'Failed to load feature requests');
      }
    } catch (error: any) {
      console.error('Error fetching feature requests:', error);
      toast.error('Failed to load feature requests');
    } finally {
      stopLoading();
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filterStatus && req.status !== filterStatus) return false;
    if (filterPriority && req.priority !== filterPriority) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    const config = STATUS_CONFIG[status];
    switch (config?.color) {
      case 'blue':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'purple':
        return 'text-accent-600 bg-accent-50 border-accent-200';
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

  const clearFilters = () => {
    setFilterStatus(null);
    setFilterPriority(null);
  };

  const activeFilterCount = [filterStatus, filterPriority].filter(Boolean).length;

  if (pageLoading && requests.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-gray-600">Loading feature requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Feature Requests</h1>
        <p className="text-sm text-gray-600 mt-1">Aggregated view of all customer feature requests across trial organizations</p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <ClipboardList className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {(stats.by_status.submitted || 0) + (stats.by_status.reviewed || 0) + (stats.by_status.planned || 0) + (stats.by_status.in_progress || 0)}
                </p>
              </div>
              <Rocket className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.by_status.completed || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Votes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_votes}</p>
              </div>
              <ThumbsUp className="w-8 h-8 text-accent-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters and Sort */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showFilters || activeFilterCount > 0
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear filters
            </button>
          )}

          {/* Sort By */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'votes' | 'date' | 'priority')}
              className="h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="votes">Most Votes</option>
              <option value="date">Latest First</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>

        {/* Expandable Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            {/* Status Filters */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Status</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                  const IconComponent = config.icon;
                  const count = stats?.by_status[status] || 0;
                  return (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(filterStatus === status ? null : status)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterStatus === status
                          ? `${getStatusColor(status)} border`
                          : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      {config.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Filters */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Priority</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => {
                  const IconComponent = config.icon;
                  const count = stats?.by_priority[priority] || 0;
                  return (
                    <button
                      key={priority}
                      onClick={() => setFilterPriority(filterPriority === priority ? null : priority)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        filterPriority === priority
                          ? getPriorityColor(priority)
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      {config.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-xl border border-dashed border-gray-300">
          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 font-medium">No feature requests found</p>
          <p className="text-sm text-gray-500 mt-1">
            {activeFilterCount > 0 ? 'Try adjusting your filters' : 'No requests have been submitted yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const statusConfig = STATUS_CONFIG[request.status];
            const priorityConfig = PRIORITY_CONFIG[request.priority];
            const StatusIcon = statusConfig.icon;
            const PriorityIcon = priorityConfig.icon;

            return (
              <div
                key={request.id}
                className={`rounded-lg border-2 p-4 transition-all hover:shadow-md cursor-pointer ${getStatusColor(request.status)}`}
                onClick={() => router.push(`/support/trials/${request.org_id}?tab=timeline`)}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <StatusIcon className="w-5 h-5 flex-shrink-0" />
                      <h4 className="text-base font-semibold text-gray-900 break-words">{request.title}</h4>
                    </div>
                    {/* Organization */}
                    {request.trial_organizations && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          {request.trial_organizations.org_name}
                        </span>
                        <span className="px-2 py-0.5 bg-white/50 rounded text-xs text-gray-600">
                          {request.trial_organizations.org_lifecycle_stage}
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-gray-700">{request.description}</p>
                    {request.use_case && (
                      <p className="text-xs text-gray-600 mt-2 italic">Use case: {request.use_case}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-col items-end">
                    <div className="flex gap-2">
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(request.priority)}`}>
                        <PriorityIcon className="w-3.5 h-3.5" />
                        {priorityConfig.label}
                      </div>
                      <div className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded-lg">
                        <ThumbsUp className="w-3.5 h-3.5 text-gray-700" />
                        <span className="text-sm font-medium text-gray-700">{request.votes}</span>
                      </div>
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
    </div>
  );
}
