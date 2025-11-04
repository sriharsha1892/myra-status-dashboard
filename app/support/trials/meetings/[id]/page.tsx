'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, isPast, isToday } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface ActionItem {
  description: string;
  assigned_to: string;
  due_date: string;
  status: 'pending' | 'completed';
}

interface MeetingNote {
  meeting_id: string;
  org_id: string;
  org_name?: string;
  meeting_type: string;
  meeting_date: string;
  duration_minutes: number | null;
  conducted_by: string;
  attendees: string[] | null;
  meeting_summary: string | null;
  pain_points_discussed: string | null;
  objections_raised: string | null;
  positive_signals: string | null;
  action_items: ActionItem[];
  next_meeting_date: string | null;
}

const MEETING_TYPE_LABELS: Record<string, string> = {
  demo: 'Demo',
  follow_up_call: 'Follow-up Call',
  check_in: 'Check-in',
  technical_review: 'Technical Review',
  executive_briefing: 'Executive Briefing',
  other: 'Other',
};

const MEETING_TYPE_ICONS: Record<string, string> = {
  demo: '🎯',
  follow_up_call: '📞',
  check_in: '✅',
  technical_review: '🔧',
  executive_briefing: '💼',
  other: '📝',
};

export default function MeetingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [meeting, setMeeting] = useState<MeetingNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'actions'>('summary');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editable fields
  const [editableMeeting, setEditableMeeting] = useState<Partial<MeetingNote>>({});

  useEffect(() => {
    fetchMeeting();
  }, [params.id]);

  // Keyboard shortcuts for quick editing
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // E key to toggle edit mode (when not in an input)
      if (e.key === 'e' && !editing && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        setEditing(true);
        toast.success('Edit mode enabled. Press Esc to cancel or Ctrl/Cmd+S to save.');
      }

      // Escape key to cancel editing
      if (e.key === 'Escape' && editing) {
        e.preventDefault();
        setEditing(false);
        setEditableMeeting(meeting || {});
        toast.success('Edit mode cancelled');
      }

      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && editing) {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [editing, meeting]);

  const fetchMeeting = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('*, trial_organizations(org_name)')
        .eq('meeting_id', params.id)
        .single();

      if (error) throw error;

      const formattedMeeting: MeetingNote = {
        // @ts-ignore - Supabase typing issue with dynamic columns
        ...(data as any),
        org_name: (data as any).trial_organizations?.org_name || 'Unknown Org',
        action_items: typeof (data as any).action_items === 'string'
          ? JSON.parse((data as any).action_items)
          : (data as any).action_items || [],
      };

      setMeeting(formattedMeeting);
      setEditableMeeting(formattedMeeting);
    } catch (error: any) {
      console.error('Error fetching meeting:', error);
      toast.error('Failed to load meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('meeting_notes')
        // @ts-ignore - Supabase typing issue with dynamic columns
        // -ignore - Supabase typing issue with dynamic columns

        .update({
          meeting_summary: editableMeeting.meeting_summary,
          pain_points_discussed: editableMeeting.pain_points_discussed,
          objections_raised: editableMeeting.objections_raised,
          positive_signals: editableMeeting.positive_signals,
          action_items: editableMeeting.action_items,
        })
        .eq('meeting_id', params.id);

      if (error) throw error;

      toast.success('Changes saved successfully!');
      setEditing(false);
      await fetchMeeting();
    } catch (error: any) {
      console.error('Error saving meeting:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('meeting_notes')
        .delete()
        .eq('meeting_id', params.id);

      if (error) throw error;

      toast.success('Meeting deleted successfully');
      router.push('/support/trials/meetings');
    } catch (error: any) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
    }
  };

  const toggleActionItemStatus = (index: number) => {
    const updatedActionItems = [...(editableMeeting.action_items || [])];
    updatedActionItems[index].status =
      updatedActionItems[index].status === 'completed' ? 'pending' : 'completed';
    setEditableMeeting({ ...editableMeeting, action_items: updatedActionItems });
  };

  const addActionItem = () => {
    const newItem: ActionItem = {
      description: '',
      assigned_to: '',
      due_date: '',
      status: 'pending',
    };
    setEditableMeeting({
      ...editableMeeting,
      action_items: [...(editableMeeting.action_items || []), newItem],
    });
  };

  const updateActionItem = (index: number, field: keyof ActionItem, value: any) => {
    const updatedActionItems = [...(editableMeeting.action_items || [])];
    updatedActionItems[index] = { ...updatedActionItems[index], [field]: value };
    setEditableMeeting({ ...editableMeeting, action_items: updatedActionItems });
  };

  const removeActionItem = (index: number) => {
    const updatedActionItems = (editableMeeting.action_items || []).filter((_, i) => i !== index);
    setEditableMeeting({ ...editableMeeting, action_items: updatedActionItems });
  };

  const getActionItemStatus = (item: ActionItem) => {
    if (item.status === 'completed') return { icon: '✅', label: 'Completed', color: 'text-green-600' };
    if (!item.due_date) return { icon: '📅', label: 'No due date', color: 'text-gray-500' };

    const dueDate = new Date(item.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) {
      return { icon: '🔴', label: 'Overdue', color: 'text-red-600' };
    }
    if (isToday(dueDate)) {
      return { icon: '⏰', label: 'Due today', color: 'text-orange-600' };
    }
    return { icon: '📅', label: 'Upcoming', color: 'text-blue-600' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">Meeting not found</p>
            <Link
              href="/support/trials/meetings"
              className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Meetings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const icon = MEETING_TYPE_ICONS[meeting.meeting_type] || '📝';
  const typeLabel = MEETING_TYPE_LABELS[meeting.meeting_type] || 'Meeting';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/support/trials/meetings"
            className="text-blue-600 hover:underline flex items-center gap-2 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Meetings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Meeting Details</h1>
        </div>

        {/* Meeting Info Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {typeLabel}
                  </span>
                  <Link
                    href={`/support/trials/${meeting.org_id}`}
                    className="text-xl font-semibold text-blue-600 hover:underline"
                  >
                    {meeting.org_name}
                  </Link>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {format(new Date(meeting.meeting_date), 'PPpp')}
                  {meeting.duration_minutes && <span className="ml-3">• {meeting.duration_minutes} minutes</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Conducted by:</span>{' '}
              <span className="text-gray-900">{meeting.conducted_by}</span>
            </div>
            {meeting.attendees && meeting.attendees.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Attendees:</span>{' '}
                <span className="text-gray-900">{meeting.attendees.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Edit Mode Banner */}
        {editing && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-xl shadow-lg mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <div>
                <p className="font-semibold">Edit Mode Active</p>
                <p className="text-sm text-blue-100">Make your changes and save when ready</p>
              </div>
            </div>
            <div className="flex gap-2 text-sm">
              <kbd className="px-2 py-1 bg-white/20 rounded text-xs">Esc</kbd>
              <span className="text-blue-100">to cancel</span>
              <kbd className="px-2 py-1 bg-white/20 rounded text-xs ml-3">⌘/Ctrl+S</kbd>
              <span className="text-blue-100">to save</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'summary'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'actions'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Action Items ({meeting.action_items.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'summary' && (
              <div className="space-y-6">
                {/* Meeting Summary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Summary</label>
                  {editing ? (
                    <textarea
                      value={editableMeeting.meeting_summary || ''}
                      onChange={(e) =>
                        setEditableMeeting({ ...editableMeeting, meeting_summary: e.target.value })
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {meeting.meeting_summary || 'No summary provided'}
                    </p>
                  )}
                </div>

                {/* Pain Points */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pain Points Discussed</label>
                  {editing ? (
                    <textarea
                      value={editableMeeting.pain_points_discussed || ''}
                      onChange={(e) =>
                        setEditableMeeting({ ...editableMeeting, pain_points_discussed: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {meeting.pain_points_discussed || 'No pain points recorded'}
                    </p>
                  )}
                </div>

                {/* Objections */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Objections Raised</label>
                  {editing ? (
                    <textarea
                      value={editableMeeting.objections_raised || ''}
                      onChange={(e) =>
                        setEditableMeeting({ ...editableMeeting, objections_raised: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {meeting.objections_raised || 'No objections recorded'}
                    </p>
                  )}
                </div>

                {/* Positive Signals */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Positive Signals</label>
                  {editing ? (
                    <textarea
                      value={editableMeeting.positive_signals || ''}
                      onChange={(e) =>
                        setEditableMeeting({ ...editableMeeting, positive_signals: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {meeting.positive_signals || 'No positive signals recorded'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'actions' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Action Items</h3>
                  {editing && (
                    <button
                      onClick={addActionItem}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
                    >
                      + Add Action Item
                    </button>
                  )}
                </div>

                {meeting.action_items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No action items</div>
                ) : (
                  <div className="space-y-4">
                    {(editing ? editableMeeting.action_items : meeting.action_items)?.map((item, index) => {
                      const status = getActionItemStatus(item);
                      return (
                        <div
                          key={index}
                          className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          {editing ? (
                            <div className="space-y-3">
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={item.status === 'completed'}
                                  onChange={() => toggleActionItemStatus(index)}
                                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => updateActionItem(index, 'description', e.target.value)}
                                  placeholder="Description"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  onClick={() => removeActionItem(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-3 ml-6">
                                <input
                                  type="text"
                                  value={item.assigned_to}
                                  onChange={(e) => updateActionItem(index, 'assigned_to', e.target.value)}
                                  placeholder="Assigned to"
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                  type="date"
                                  value={item.due_date}
                                  onChange={(e) => updateActionItem(index, 'due_date', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-start gap-3 mb-2">
                                <input
                                  type="checkbox"
                                  checked={item.status === 'completed'}
                                  readOnly
                                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                                />
                                <div className="flex-1">
                                  <p className={`text-gray-900 ${item.status === 'completed' ? 'line-through' : ''}`}>
                                    {item.description}
                                  </p>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                    {item.assigned_to && (
                                      <span>
                                        <span className="font-medium">Assigned to:</span> {item.assigned_to}
                                      </span>
                                    )}
                                    {item.due_date && (
                                      <span>
                                        <span className="font-medium">Due:</span>{' '}
                                        {format(new Date(item.due_date), 'PPP')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className={`${status.color} text-sm flex items-center gap-1`}>
                                  {status.icon} {status.label}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Delete Meeting
          </button>

          <div className="flex gap-3">
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setEditableMeeting(meeting);
                    setEditing(false);
                  }}
                  disabled={saving}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                title="Press 'E' to enable edit mode"
              >
                Edit Meeting
                <span className="text-xs opacity-75 bg-blue-700 px-2 py-0.5 rounded">E</span>
              </button>
            )}
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Meeting?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this meeting? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
