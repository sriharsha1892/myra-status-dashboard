// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface ActionItem {
  description: string;
  assigned_to: string;
  due_date: string;
  status: 'pending' | 'completed';
}

interface MeetingFormData {
  org_id: string;
  meeting_type: string;
  meeting_date: string;
  duration_minutes: number | null;
  conducted_by: string;
  attendees: string;
  meeting_summary: string;
  pain_points_discussed: string;
  objections_raised: string;
  positive_signals: string;
  next_meeting_date: string;
}

interface AddMeetingNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MEETING_TYPES = [
  { value: 'demo', label: 'Demo' },
  { value: 'follow_up_call', label: 'Follow-up Call' },
  { value: 'check_in', label: 'Check-in' },
  { value: 'technical_review', label: 'Technical Review' },
  { value: 'executive_briefing', label: 'Executive Briefing' },
  { value: 'other', label: 'Other' },
];

// Smart suggestions for action items based on meeting type
const ACTION_ITEM_SUGGESTIONS: Record<string, Array<{ description: string; defaultDays: number }>> = {
  demo: [
    { description: 'Send follow-up email with demo recording and key features', defaultDays: 1 },
    { description: 'Share trial account credentials and onboarding guide', defaultDays: 2 },
    { description: 'Schedule follow-up call to discuss feedback', defaultDays: 7 },
    { description: 'Prepare custom proposal based on discussed use cases', defaultDays: 3 },
  ],
  follow_up_call: [
    { description: 'Address technical questions raised during the call', defaultDays: 2 },
    { description: 'Send additional resources or documentation', defaultDays: 1 },
    { description: 'Schedule next check-in meeting', defaultDays: 7 },
    { description: 'Follow up on pricing and contract discussions', defaultDays: 3 },
  ],
  check_in: [
    { description: 'Review product usage metrics and share insights', defaultDays: 3 },
    { description: 'Address any blockers or technical issues', defaultDays: 1 },
    { description: 'Provide training on underutilized features', defaultDays: 5 },
    { description: 'Schedule next check-in', defaultDays: 14 },
  ],
  technical_review: [
    { description: 'Document technical requirements and integration needs', defaultDays: 2 },
    { description: 'Provide API documentation and integration examples', defaultDays: 3 },
    { description: 'Schedule technical deep-dive with engineering team', defaultDays: 7 },
    { description: 'Address security and compliance questions', defaultDays: 5 },
  ],
  executive_briefing: [
    { description: 'Send executive summary and ROI analysis', defaultDays: 2 },
    { description: 'Prepare business case presentation', defaultDays: 5 },
    { description: 'Schedule follow-up with decision makers', defaultDays: 7 },
    { description: 'Provide customer success stories and case studies', defaultDays: 3 },
  ],
  other: [
    { description: 'Send meeting summary to all attendees', defaultDays: 1 },
    { description: 'Follow up on action items discussed', defaultDays: 3 },
    { description: 'Schedule next meeting', defaultDays: 7 },
  ],
};

export default function AddMeetingNoteModal({
  isOpen,
  onClose,
  onSuccess,
}: AddMeetingNoteModalProps) {
  const supabase = createClient();
  const [organizations, setOrganizations] = useState<Array<{ org_id: string; org_name: string }>>(
    []
  );
  const [saving, setSaving] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<MeetingFormData>({
    defaultValues: {
      meeting_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      conducted_by: 'Current User', // You can replace with actual user name
    },
  });

  // Watch the meeting type to enable smart suggestions
  const selectedMeetingType = watch('meeting_type');

  useEffect(() => {
    if (isOpen) {
      fetchOrganizations();
    }
  }, [isOpen]);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name')
        .order('org_name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    }
  };

  const addActionItem = () => {
    setActionItems([
      ...actionItems,
      {
        description: '',
        assigned_to: '',
        due_date: '',
        status: 'pending',
      },
    ]);
  };

  const removeActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const updateActionItem = (index: number, field: keyof ActionItem, value: any) => {
    const updated = [...actionItems];
    updated[index] = { ...updated[index], [field]: value };
    setActionItems(updated);
  };

  const loadSuggestions = () => {
    if (!selectedMeetingType || !ACTION_ITEM_SUGGESTIONS[selectedMeetingType]) {
      toast.error('Please select a meeting type first');
      return;
    }

    const suggestions = ACTION_ITEM_SUGGESTIONS[selectedMeetingType];
    const meetingDate = watch('meeting_date') || format(new Date(), "yyyy-MM-dd'T'HH:mm");
    const conductedBy = watch('conducted_by') || '';

    const newActionItems = suggestions.map((suggestion) => {
      const dueDate = new Date(meetingDate);
      dueDate.setDate(dueDate.getDate() + suggestion.defaultDays);

      return {
        description: suggestion.description,
        assigned_to: conductedBy,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status: 'pending' as const,
      };
    });

    setActionItems([...actionItems, ...newActionItems]);
    toast.success(`Added ${suggestions.length} suggested action items`);
  };

  const onSubmit = async (data: MeetingFormData) => {
    setSaving(true);
    try {
      // Parse attendees (one per line)
      const attendeesArray = data.attendees
        ? data.attendees.split('\n').map((a) => a.trim()).filter((a) => a)
        : [];

      // Prepare meeting data
      const meetingData = {
        org_id: data.org_id,
        meeting_type: data.meeting_type,
        meeting_date: new Date(data.meeting_date).toISOString(),
        duration_minutes: data.duration_minutes || null,
        conducted_by: data.conducted_by,
        attendees: attendeesArray,
        meeting_summary: data.meeting_summary || null,
        pain_points_discussed: data.pain_points_discussed || null,
        objections_raised: data.objections_raised || null,
        positive_signals: data.positive_signals || null,
        action_items: actionItems,
        next_meeting_date: data.next_meeting_date
          ? new Date(data.next_meeting_date).toISOString()
          : null,
      };

      const { error } = await supabase.from('meeting_notes').insert([meetingData]);

      if (error) throw error;

      toast.success('Meeting note created successfully!');
      reset();
      setActionItems([]);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating meeting note:', error);
      toast.error('Failed to create meeting note: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className="bg-white rounded-xl max-w-4xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add Meeting Note</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Organization */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization <span className="text-red-500">*</span>
            </label>
            <select
              {...register('org_id', { required: 'Organization is required' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Organization</option>
              {organizations.map((org) => (
                <option key={org.org_id} value={org.org_id}>
                  {org.org_name}
                </option>
              ))}
            </select>
            {errors.org_id && (
              <p className="text-red-500 text-sm mt-1">{errors.org_id.message}</p>
            )}
          </div>

          {/* Meeting Type & Date/Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('meeting_type', { required: 'Meeting type is required' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Type</option>
                {MEETING_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.meeting_type && (
                <p className="text-red-500 text-sm mt-1">{errors.meeting_type.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                {...register('meeting_date', { required: 'Date and time are required' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.meeting_date && (
                <p className="text-red-500 text-sm mt-1">{errors.meeting_date.message}</p>
              )}
            </div>
          </div>

          {/* Duration & Conducted By */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                {...register('duration_minutes')}
                placeholder="e.g., 60"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conducted By <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('conducted_by', { required: 'Conducted by is required' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.conducted_by && (
                <p className="text-red-500 text-sm mt-1">{errors.conducted_by.message}</p>
              )}
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attendees (one per line)
            </label>
            <textarea
              {...register('attendees')}
              rows={3}
              placeholder="John Doe&#10;Jane Smith&#10;Bob Wilson"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Meeting Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Summary</label>
            <textarea
              {...register('meeting_summary')}
              rows={4}
              placeholder="Brief summary of the meeting discussion..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Pain Points */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pain Points Discussed
            </label>
            <textarea
              {...register('pain_points_discussed')}
              rows={3}
              placeholder="What problems or challenges did they mention?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Objections */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Objections Raised
            </label>
            <textarea
              {...register('objections_raised')}
              rows={3}
              placeholder="Any concerns or objections raised during the meeting?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Positive Signals */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Positive Signals
            </label>
            <textarea
              {...register('positive_signals')}
              rows={3}
              placeholder="What positive indicators or buying signals did you notice?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Action Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Action Items</label>
              <div className="flex gap-2">
                {selectedMeetingType && ACTION_ITEM_SUGGESTIONS[selectedMeetingType] && (
                  <button
                    type="button"
                    onClick={loadSuggestions}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition flex items-center gap-1"
                    title={`Load ${ACTION_ITEM_SUGGESTIONS[selectedMeetingType].length} suggested action items for ${MEETING_TYPES.find((t) => t.value === selectedMeetingType)?.label}`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    Load Suggestions
                  </button>
                )}
                <button
                  type="button"
                  onClick={addActionItem}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition"
                >
                  + Add Action Item
                </button>
              </div>
            </div>

            {actionItems.length === 0 ? (
              <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 text-sm">No action items yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {actionItems.map((item, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg p-4 relative">
                    <button
                      type="button"
                      onClick={() => removeActionItem(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            updateActionItem(index, 'description', e.target.value)
                          }
                          placeholder="What needs to be done?"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assigned To
                          </label>
                          <input
                            type="text"
                            value={item.assigned_to}
                            onChange={(e) =>
                              updateActionItem(index, 'assigned_to', e.target.value)
                            }
                            placeholder="Person name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Due Date
                          </label>
                          <input
                            type="date"
                            value={item.due_date}
                            onChange={(e) => updateActionItem(index, 'due_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={item.status === 'completed'}
                          onChange={(e) =>
                            updateActionItem(
                              index,
                              'status',
                              e.target.checked ? 'completed' : 'pending'
                            )
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm text-gray-700">Mark as completed</label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Next Meeting Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Next Meeting Date (optional)
            </label>
            <input
              type="datetime-local"
              {...register('next_meeting_date')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Meeting Note'}
          </button>
        </div>
      </div>
    </div>
  );
}
