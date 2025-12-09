'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  Users,
  ChevronDown,
  ChevronUp,
  Plus,
  Video,
  Phone,
  MessageSquare,
  Presentation,
  Target,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface MeetingNote {
  meeting_id: string;
  org_id: string;
  meeting_type: string;
  meeting_date: string;
  duration_minutes: number | null;
  conducted_by: string;
  attendees: string[];
  meeting_summary: string | null;
  pain_points_discussed: string | null;
  objections_raised: string | null;
  positive_signals: string | null;
  action_items: Array<{
    description: string;
    assigned_to: string;
    due_date: string;
    status: 'pending' | 'completed';
  }> | null;
  next_meeting_date: string | null;
  created_at: string;
}

interface MeetingsTabProps {
  orgId: string;
  onAddMeeting?: () => void;
}

const MEETING_TYPE_CONFIG: Record<string, { icon: typeof Video; color: string; label: string }> = {
  demo: { icon: Presentation, color: 'bg-blue-100 text-blue-700', label: 'Demo' },
  follow_up_call: { icon: Phone, color: 'bg-green-100 text-green-700', label: 'Follow-up Call' },
  check_in: { icon: MessageSquare, color: 'bg-purple-100 text-purple-700', label: 'Check-in' },
  technical_review: { icon: Target, color: 'bg-orange-100 text-orange-700', label: 'Technical Review' },
  executive_briefing: { icon: Users, color: 'bg-red-100 text-red-700', label: 'Executive Briefing' },
  other: { icon: Calendar, color: 'bg-gray-100 text-gray-700', label: 'Other' },
};

export default function MeetingsTab({ orgId, onAddMeeting }: MeetingsTabProps) {
  const [meetings, setMeetings] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    fetchMeetings();
  }, [orgId]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('org_id', orgId)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (meetingId: string) => {
    setExpandedMeetings((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(meetingId)) {
        newSet.delete(meetingId);
      } else {
        newSet.add(meetingId);
      }
      return newSet;
    });
  };

  const toggleActionItemStatus = async (
    meetingId: string,
    actionIndex: number,
    currentItems: MeetingNote['action_items']
  ) => {
    if (!currentItems) return;

    const updatedItems = [...currentItems];
    updatedItems[actionIndex] = {
      ...updatedItems[actionIndex],
      status: updatedItems[actionIndex].status === 'pending' ? 'completed' : 'pending',
    };

    try {
      const { error } = await supabase
        .from('meeting_notes')
        .update({ action_items: updatedItems })
        .eq('meeting_id', meetingId);

      if (error) throw error;

      setMeetings((prev) =>
        prev.map((m) => (m.meeting_id === meetingId ? { ...m, action_items: updatedItems } : m))
      );
    } catch (error) {
      console.error('Error updating action item:', error);
    }
  };

  const getPendingActionCount = (meeting: MeetingNote) => {
    return meeting.action_items?.filter((item) => item.status === 'pending').length || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Meeting Notes</h3>
          <p className="text-sm text-gray-500">{meetings.length} meeting{meetings.length !== 1 ? 's' : ''} recorded</p>
        </div>
        {onAddMeeting && (
          <button
            onClick={onAddMeeting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Meeting
          </button>
        )}
      </div>

      {/* Meetings List */}
      {meetings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="text-gray-900 font-medium mb-1">No meetings recorded</h4>
          <p className="text-gray-500 text-sm mb-4">Start by adding your first meeting note</p>
          {onAddMeeting && (
            <button
              onClick={onAddMeeting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Meeting
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => {
            const isExpanded = expandedMeetings.has(meeting.meeting_id);
            const typeConfig = MEETING_TYPE_CONFIG[meeting.meeting_type] || MEETING_TYPE_CONFIG.other;
            const TypeIcon = typeConfig.icon;
            const pendingActions = getPendingActionCount(meeting);

            return (
              <div
                key={meeting.meeting_id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
              >
                {/* Meeting Header */}
                <button
                  onClick={() => toggleExpanded(meeting.meeting_id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeConfig.color}`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{typeConfig.label}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConfig.color}`}>
                        {meeting.meeting_type.replace(/_/g, ' ')}
                      </span>
                      {pendingActions > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                          {pendingActions} action{pendingActions !== 1 ? 's' : ''} pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(meeting.meeting_date), 'MMM d, yyyy')}
                      </span>
                      {meeting.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {meeting.duration_minutes} min
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {meeting.conducted_by}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(meeting.meeting_date), { addSuffix: true })}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    {/* Attendees */}
                    {meeting.attendees && meeting.attendees.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">Attendees</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {meeting.attendees.map((attendee, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                            >
                              {attendee}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meeting Summary */}
                    {meeting.meeting_summary && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Summary</h5>
                        <div
                          className="text-sm text-gray-600 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: meeting.meeting_summary }}
                        />
                      </div>
                    )}

                    {/* Insights Grid */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Pain Points */}
                      {meeting.pain_points_discussed && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-red-700">Pain Points</span>
                          </div>
                          <div
                            className="text-xs text-red-600 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: meeting.pain_points_discussed }}
                          />
                        </div>
                      )}

                      {/* Objections */}
                      {meeting.objections_raised && (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-700">Objections</span>
                          </div>
                          <div
                            className="text-xs text-amber-600 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: meeting.objections_raised }}
                          />
                        </div>
                      )}

                      {/* Positive Signals */}
                      {meeting.positive_signals && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">Positive Signals</span>
                          </div>
                          <div
                            className="text-xs text-green-600 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: meeting.positive_signals }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Action Items */}
                    {meeting.action_items && meeting.action_items.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Action Items
                        </h5>
                        <div className="space-y-2">
                          {meeting.action_items.map((item, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-3 p-2 rounded-lg ${
                                item.status === 'completed' ? 'bg-green-50' : 'bg-gray-50'
                              }`}
                            >
                              <button
                                onClick={() =>
                                  toggleActionItemStatus(meeting.meeting_id, idx, meeting.action_items)
                                }
                                className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border ${
                                  item.status === 'completed'
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'border-gray-300 hover:border-blue-500'
                                }`}
                              >
                                {item.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm ${
                                    item.status === 'completed'
                                      ? 'text-gray-500 line-through'
                                      : 'text-gray-700'
                                  }`}
                                >
                                  {item.description}
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                  {item.assigned_to && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {item.assigned_to}
                                    </span>
                                  )}
                                  {item.due_date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {format(new Date(item.due_date), 'MMM d')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next Meeting */}
                    {meeting.next_meeting_date && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-700">Next Meeting:</span>
                          <span className="text-blue-600">
                            {format(new Date(meeting.next_meeting_date), "EEEE, MMM d 'at' h:mm a")}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
