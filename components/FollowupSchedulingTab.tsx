'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format, isPast } from 'date-fns';
import AddFollowupModal from './AddFollowupModal';

interface FollowupSchedule {
  id: string;
  org_id: string;
  followup_date: string;
  followup_time?: string;
  status: 'scheduled' | 'pending' | 'completed' | 'cancelled';
  title: string;
  description?: string;
  followup_type?: string;
  assigned_to?: string;
  completed_at?: string;
  completion_notes?: string;
  outcome?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface FollowupSchedulingTabProps {
  orgId: string;
}

const STATUS_CONFIG: { [key: string]: { icon: string; color: string; label: string } } = {
  scheduled: { icon: '📅', color: 'blue', label: 'Scheduled' },
  pending: { icon: '⏰', color: 'orange', label: 'Pending' },
  completed: { icon: '✅', color: 'green', label: 'Completed' },
  cancelled: { icon: '❌', color: 'gray', label: 'Cancelled' },
};

export default function FollowupSchedulingTab({ orgId }: FollowupSchedulingTabProps) {
  const [followups, setFollowups] = useState<FollowupSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');

  const supabase = createClient();

  useEffect(() => {
    fetchFollowups();
  }, [orgId]);

  const fetchFollowups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('followup_schedules')
        .select('*')
        .eq('org_id', orgId)
        .order('followup_date', { ascending: true });

      if (error) throw error;
      setFollowups(data || []);
    } catch (error: any) {
      console.error('Error fetching followups:', error);
      toast.error('Failed to load follow-up schedules');
    } finally {
      setLoading(false);
    }
  };

  const filteredFollowups = filterStatus
    ? followups.filter((f) => f.status === filterStatus)
    : followups;

  const getStatusColor = (status: string) => {
    const config = STATUS_CONFIG[status];
    switch (config?.color) {
      case 'blue':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'orange':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'green':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'gray':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const isOverdue = (followupDate: string, status: string) => {
    return status !== 'completed' && status !== 'cancelled' && isPast(new Date(followupDate));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-600">Loading follow-ups...</p>
        </div>
      </div>
    );
  }

  const upcomingCount = followups.filter((f) => f.status === 'scheduled' || f.status === 'pending').length;
  const completedCount = followups.filter((f) => f.status === 'completed').length;
  const overdueCount = followups.filter((f) => isOverdue(f.followup_date, f.status)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Follow-up Schedule</h3>
          <p className="text-sm text-gray-600 mt-1">Track and manage follow-up activities</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Schedule Follow-up</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-medium text-blue-700 mb-1">Total Follow-ups</p>
          <p className="text-2xl font-bold text-blue-900">{followups.length}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
          <p className="text-xs font-medium text-orange-700 mb-1">Upcoming</p>
          <p className="text-2xl font-bold text-orange-900">{upcomingCount}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <p className="text-xs font-medium text-green-700 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-900">{completedCount}</p>
        </div>
        {overdueCount > 0 && (
          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
            <p className="text-xs font-medium text-red-700 mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-900">{overdueCount}</p>
          </div>
        )}
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
            All ({filteredFollowups.length})
          </button>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const count = followups.filter((f) => f.status === status).length;
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
      </div>

      {/* Follow-ups List */}
      {filteredFollowups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/50 rounded-lg border border-dashed border-gray-300">
          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 font-medium">No follow-ups scheduled</p>
          <p className="text-sm text-gray-500 mt-1">
            {filterStatus ? 'No follow-ups with this status' : 'Schedule your first follow-up'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFollowups.map((followup) => {
            const statusConfig = STATUS_CONFIG[followup.status];
            const overdue = isOverdue(followup.followup_date, followup.status);

            return (
              <div
                key={followup.id}
                className={`rounded-lg border-2 p-4 ${getStatusColor(followup.status)} ${
                  overdue ? 'ring-2 ring-red-400' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl">{statusConfig.icon}</span>
                      <h4 className="text-base font-semibold text-gray-900">{followup.title}</h4>
                      {overdue && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    {followup.description && (
                      <p className="text-sm text-gray-700 mt-1">{followup.description}</p>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                  <div>
                    <span className="text-xs font-medium text-gray-700 opacity-75">Date</span>
                    <p className="text-gray-900 font-medium">
                      {format(new Date(followup.followup_date), 'MMM dd, yyyy')}
                      {followup.followup_time && ` at ${followup.followup_time}`}
                    </p>
                  </div>
                  {followup.followup_type && (
                    <div>
                      <span className="text-xs font-medium text-gray-700 opacity-75">Type</span>
                      <p className="text-gray-900">{followup.followup_type}</p>
                    </div>
                  )}
                  {followup.assigned_to && (
                    <div>
                      <span className="text-xs font-medium text-gray-700 opacity-75">Assigned To</span>
                      <p className="text-gray-900">{followup.assigned_to}</p>
                    </div>
                  )}
                  {followup.status === 'completed' && followup.outcome && (
                    <div>
                      <span className="text-xs font-medium text-gray-700 opacity-75">Outcome</span>
                      <p className="text-gray-900">{followup.outcome}</p>
                    </div>
                  )}
                </div>

                {/* Completion Notes */}
                {followup.status === 'completed' && followup.completion_notes && (
                  <div className="mt-3 p-3 bg-white/40 rounded border border-current border-opacity-20">
                    <p className="text-xs font-medium text-gray-700 mb-1">Completion Notes:</p>
                    <p className="text-sm text-gray-800">{followup.completion_notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <AddFollowupModal
        orgId={orgId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchFollowups}
      />
    </div>
  );
}
