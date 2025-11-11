'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import AddResearchActionModal from './AddResearchActionModal';
import { format } from 'date-fns';

interface ResearchAction {
  id: string;
  org_id: string;
  action_type: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigned_to?: string;
  due_date?: string;
  outcome?: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

interface ResearchActionsTabProps {
  orgId: string;
}

const ACTION_TYPE_CONFIG: { [key: string]: { icon: string; color: string; label: string } } = {
  proposal_needed: { icon: '📄', color: 'blue', label: 'Proposal Needed' },
  technical_guidance_needed: { icon: '🔧', color: 'purple', label: 'Technical Guidance Needed' },
  pricing_decision: { icon: '💰', color: 'green', label: 'Pricing Decision' },
  competitive_analysis: { icon: '📊', color: 'orange', label: 'Competitive Analysis' },
  market_fit_assessment: { icon: '🎯', color: 'pink', label: 'Market Fit Assessment' },
  customization_needs: { icon: '⚙️', color: 'indigo', label: 'Customization Needs' },
  integration_assessment: { icon: '🔗', color: 'cyan', label: 'Integration Assessment' },
  roi_modeling: { icon: '📈', color: 'red', label: 'ROI Modeling' },
};

export default function ResearchActionsTab({ orgId }: ResearchActionsTabProps) {
  const [actions, setActions] = useState<ResearchAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trial_research_actions')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActions(data || []);
    } catch (error: any) {
      console.error('Error fetching research actions:', error);
      toast.error('Failed to load research actions');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (actionId: string, newStatus: string) => {
    setUpdatingActionId(actionId);
    try {
      const { error } = await supabase
        .from('trial_research_actions')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', actionId);

      if (error) throw error;

      toast.success(`Research action status updated to ${newStatus}`);
      await fetchData();
    } catch (error: any) {
      console.error('Error updating action status:', error);
      toast.error('Failed to update research action status');
    } finally {
      setUpdatingActionId(null);
    }
  };

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: string } = {
      blue: 'text-blue-600 bg-blue-50 border-blue-200',
      purple: 'text-accent-600 bg-accent-50 border-accent-200',
      green: 'text-green-600 bg-green-50 border-green-200',
      orange: 'text-orange-600 bg-orange-50 border-orange-200',
      pink: 'text-pink-600 bg-pink-50 border-pink-200',
      indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      cyan: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      red: 'text-red-600 bg-red-50 border-red-200',
    };
    return colorMap[color] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-red-600 bg-red-50 border border-red-200';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-50 border border-yellow-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border border-green-200';
      case 'on_hold':
        return 'text-gray-600 bg-gray-50 border border-gray-200';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100 border border-gray-300';
      default:
        return 'text-gray-600 bg-gray-50 border border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Filter actions
  let filteredActions = actions;
  if (statusFilter !== 'all') {
    filteredActions = filteredActions.filter((a) => a.status === statusFilter);
  }
  if (priorityFilter !== 'all') {
    filteredActions = filteredActions.filter((a) => a.priority === priorityFilter);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-600">Loading research actions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Research Team Actions ({filteredActions.length})</h3>
          <p className="text-sm text-gray-600 mt-1">Track research team involvement requests</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 h-9 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Action</span>
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
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Priority:</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Actions List */}
      {filteredActions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/50 rounded-lg border border-dashed border-gray-300">
          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 font-medium">No research actions</p>
          <p className="text-sm text-gray-500 mt-1">Create a research action to track team involvement</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActions.map((action) => {
            const actionInfo = ACTION_TYPE_CONFIG[action.action_type] || ACTION_TYPE_CONFIG.proposal_needed;
            const colorClasses = getColorClasses(actionInfo.color);

            return (
              <div
                key={action.id}
                className="bg-white/80 rounded-xl border border-gray-200/60 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-lg ${colorClasses}`}>{actionInfo.icon}</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colorClasses}`}>
                        {actionInfo.label}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getPriorityColor(action.priority)}`}>
                        {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-gray-900 mb-1">{action.title}</h4>

                    {action.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{action.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 flex-wrap">
                      {action.assigned_to && (
                        <span>👤 Assigned to: <span className="font-medium">{action.assigned_to}</span></span>
                      )}
                      {action.due_date && (
                        <span>📅 Due: <span className="font-medium">{format(new Date(action.due_date), 'MMM dd, yyyy')}</span></span>
                      )}
                      <span>Created: {format(new Date(action.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={action.status}
                      onChange={(e) => handleStatusChange(action.id, e.target.value)}
                      disabled={updatingActionId === action.id}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-md border cursor-pointer transition-all ${getStatusColor(action.status)}`}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {action.outcome && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs font-semibold text-green-900 mb-1">Outcome:</p>
                    <p className="text-xs text-green-800">{action.outcome}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Research Action Modal */}
      <AddResearchActionModal
        orgId={orgId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
