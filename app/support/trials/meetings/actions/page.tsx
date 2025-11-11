'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, isPast, isToday, isFuture } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useActionItemNotifications } from '@/hooks/useActionItemNotifications';

interface ActionItem {
  description: string;
  assigned_to: string;
  due_date: string;
  status: 'pending' | 'completed';
}

interface MeetingWithActions {
  meeting_id: string;
  org_id: string;
  org_name: string;
  meeting_date: string;
  meeting_type: string;
  action_items: ActionItem[];
}

interface ActionItemWithContext extends ActionItem {
  meeting_id: string;
  org_id: string;
  org_name: string;
  meeting_date: string;
  meeting_type: string;
}

export default function ActionItemsPage() {
  const [meetings, setMeetings] = useState<MeetingWithActions[]>([]);
  const [actionItems, setActionItems] = useState<ActionItemWithContext[]>([]);
  const [filteredItems, setFilteredItems] = useState<ActionItemWithContext[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('pending');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'due_date' | 'organization'>('due_date');

  // For filter dropdowns
  const [allAssignees, setAllAssignees] = useState<string[]>([]);

  useEffect(() => {
    fetchMeetingsWithActions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [actionItems, statusFilter, assignedToFilter]);

  // Enable smart notifications for overdue action items
  const notifications = useActionItemNotifications(filteredItems, {
    enabled: true,
    showOnMount: true,
    checkInterval: 300000, // Check every 5 minutes
  });

  const fetchMeetingsWithActions = async () => {
    setLoading(true);
    try {
      const { data: meetingsData, error } = await supabase
        .from('meeting_notes')
        .select('meeting_id, org_id, meeting_date, meeting_type, action_items, trial_organizations(org_name)');

      if (error) throw error;

      const formattedMeetings: MeetingWithActions[] = (meetingsData || []).map((meeting: any) => ({
        meeting_id: meeting.meeting_id,
        org_id: meeting.org_id,
        org_name: meeting.trial_organizations?.org_name || 'Unknown',
        meeting_date: meeting.meeting_date,
        meeting_type: meeting.meeting_type,
        action_items: typeof meeting.action_items === 'string'
          ? JSON.parse(meeting.action_items)
          : meeting.action_items || [],
      }));

      setMeetings(formattedMeetings);

      // Flatten action items with context
      const allItems: ActionItemWithContext[] = [];
      formattedMeetings.forEach((meeting) => {
        meeting.action_items.forEach((item) => {
          allItems.push({
            ...item,
            meeting_id: meeting.meeting_id,
            org_id: meeting.org_id,
            org_name: meeting.org_name,
            meeting_date: meeting.meeting_date,
            meeting_type: meeting.meeting_type,
          });
        });
      });

      setActionItems(allItems);

      // Extract unique assignees
      const uniqueAssignees = Array.from(
        new Set(allItems.map((item) => item.assigned_to).filter((a) => a))
      ).sort();
      setAllAssignees(uniqueAssignees);
    } catch (error: any) {
      console.error('Error fetching action items:', error);
      toast.error('Failed to load action items');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...actionItems];

    // Status filter
    if (statusFilter === 'pending') {
      filtered = filtered.filter((item) => item.status === 'pending');
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter((item) => item.status === 'completed');
    } else if (statusFilter === 'overdue') {
      filtered = filtered.filter(
        (item) =>
          item.status === 'pending' &&
          item.due_date &&
          isPast(new Date(item.due_date)) &&
          !isToday(new Date(item.due_date))
      );
    }

    // Assigned to filter
    if (assignedToFilter !== 'all') {
      filtered = filtered.filter((item) => item.assigned_to === assignedToFilter);
    }

    setFilteredItems(filtered);
  };

  const toggleItemStatus = async (item: ActionItemWithContext) => {
    try {
      // Find the meeting and update its action items
      const meeting = meetings.find((m) => m.meeting_id === item.meeting_id);
      if (!meeting) return;

      const updatedActionItems = meeting.action_items.map((ai) => {
        if (ai.description === item.description && ai.assigned_to === item.assigned_to) {
          return {
            ...ai,
            status: ai.status === 'completed' ? 'pending' : 'completed',
          } as ActionItem;
        }
        return ai;
      });

      const { error } = await supabase
        .from('meeting_notes')
        // @ts-ignore - Supabase typing issue with dynamic columns
        .update({ action_items: updatedActionItems })
        .eq('meeting_id', item.meeting_id);

      if (error) throw error;

      toast.success('Action item updated');
      await fetchMeetingsWithActions();
    } catch (error: any) {
      console.error('Error updating action item:', error);
      toast.error('Failed to update action item');
    }
  };

  const getItemStatus = (item: ActionItemWithContext) => {
    if (item.status === 'completed') {
      return { icon: '✅', label: 'Completed', color: 'text-green-600 bg-green-50' };
    }
    if (!item.due_date) {
      return { icon: '📅', label: 'No due date', color: 'text-gray-500 bg-gray-50' };
    }

    const dueDate = new Date(item.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) {
      return { icon: '🔴', label: 'Overdue', color: 'text-red-600 bg-red-50' };
    }
    if (isToday(dueDate)) {
      return { icon: '⏰', label: 'Due today', color: 'text-orange-600 bg-orange-50' };
    }
    return { icon: '📅', label: 'Upcoming', color: 'text-blue-600 bg-blue-50' };
  };

  const groupItemsByDueDate = () => {
    const overdue: ActionItemWithContext[] = [];
    const dueToday: ActionItemWithContext[] = [];
    const upcoming: ActionItemWithContext[] = [];
    const completed: ActionItemWithContext[] = [];

    filteredItems.forEach((item) => {
      if (item.status === 'completed') {
        completed.push(item);
      } else if (item.due_date) {
        const dueDate = new Date(item.due_date);
        if (isPast(dueDate) && !isToday(dueDate)) {
          overdue.push(item);
        } else if (isToday(dueDate)) {
          dueToday.push(item);
        } else {
          upcoming.push(item);
        }
      } else {
        upcoming.push(item);
      }
    });

    return { overdue, dueToday, upcoming, completed };
  };

  const groupItemsByOrganization = () => {
    const grouped: Record<string, ActionItemWithContext[]> = {};
    filteredItems.forEach((item) => {
      if (!grouped[item.org_name]) {
        grouped[item.org_name] = [];
      }
      grouped[item.org_name].push(item);
    });
    return grouped;
  };

  const renderActionItem = (item: ActionItemWithContext) => {
    const status = getItemStatus(item);
    return (
      <div
        key={`${item.meeting_id}-${item.description}`}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={item.status === 'completed'}
            onChange={() => toggleItemStatus(item)}
            className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium text-gray-900 mb-2 ${
                item.status === 'completed' ? 'line-through text-gray-500' : ''
              }`}
            >
              {item.description}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <Link
                href={`/support/trials/${item.org_id}`}
                className="text-blue-600 hover:underline font-medium"
              >
                {item.org_name}
              </Link>
              <span>•</span>
              <Link
                href={`/support/trials/meetings/${item.meeting_id}`}
                className="text-blue-600 hover:underline"
              >
                Meeting on {format(new Date(item.meeting_date), 'MMM d, yyyy')}
              </Link>
              {item.assigned_to && (
                <>
                  <span>•</span>
                  <span>Assigned to: {item.assigned_to}</span>
                </>
              )}
              {item.due_date && (
                <>
                  <span>•</span>
                  <span>Due: {format(new Date(item.due_date), 'MMM d, yyyy')}</span>
                </>
              )}
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${status.color}`}
          >
            {status.icon} {status.label}
          </span>
        </div>
      </div>
    );
  };

  const stats = {
    total: actionItems.length,
    overdue: actionItems.filter(
      (item) =>
        item.status === 'pending' &&
        item.due_date &&
        isPast(new Date(item.due_date)) &&
        !isToday(new Date(item.due_date))
    ).length,
    dueToday: actionItems.filter(
      (item) => item.status === 'pending' && item.due_date && isToday(new Date(item.due_date))
    ).length,
    pending: actionItems.filter((item) => item.status === 'pending').length,
    completed: actionItems.filter((item) => item.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Action Items Dashboard</h1>
            <p className="text-gray-600">Track all action items across meetings</p>
          </div>
          <Link
            href="/support/trials/meetings"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            ← Back to Meetings
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-neutral-200">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600 mt-1">Total Items</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border border-neutral-200">
            <div className="text-3xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-gray-600 mt-1">🔴 Overdue</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border border-neutral-200">
            <div className="text-3xl font-bold text-orange-600">{stats.dueToday}</div>
            <div className="text-sm text-gray-600 mt-1">⏰ Due Today</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border border-neutral-200">
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600 mt-1">📅 Pending</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border border-neutral-200">
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600 mt-1">✅ Completed</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Assigned To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
              <select
                value={assignedToFilter}
                onChange={(e) => setAssignedToFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                {allAssignees.map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee}
                  </option>
                ))}
              </select>
            </div>

            {/* Group By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group By</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="due_date">Due Date</option>
                <option value="organization">Organization</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600 mt-4">
            Showing {filteredItems.length} of {actionItems.length} action items
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading action items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">No action items found</p>
          </div>
        ) : groupBy === 'due_date' ? (
          <div className="space-y-8">
            {(() => {
              const groups = groupItemsByDueDate();
              return (
                <>
                  {groups.overdue.length > 0 && (
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        🔴 Overdue ({groups.overdue.length})
                      </h2>
                      <div className="space-y-3">{groups.overdue.map(renderActionItem)}</div>
                    </div>
                  )}

                  {groups.dueToday.length > 0 && (
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        ⏰ Due Today ({groups.dueToday.length})
                      </h2>
                      <div className="space-y-3">{groups.dueToday.map(renderActionItem)}</div>
                    </div>
                  )}

                  {groups.upcoming.length > 0 && (
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        📅 Upcoming ({groups.upcoming.length})
                      </h2>
                      <div className="space-y-3">{groups.upcoming.map(renderActionItem)}</div>
                    </div>
                  )}

                  {groups.completed.length > 0 && statusFilter !== 'pending' && (
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        ✅ Recently Completed ({groups.completed.length})
                      </h2>
                      <div className="space-y-3">{groups.completed.map(renderActionItem)}</div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupItemsByOrganization()).map(([orgName, items]) => (
              <div key={orgName}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {orgName} ({items.length})
                </h2>
                <div className="space-y-3">{items.map(renderActionItem)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
