'use client';

import { useState } from 'react';
import { Calendar, Clock, X, Video } from 'lucide-react';
import { format } from 'date-fns';

interface CalendarEventFormProps {
  ticketId: string;
  ticketNumber: string;
  onClose: () => void;
  onSave: (event: CalendarEvent) => Promise<void>;
}

export interface CalendarEvent {
  title: string;
  description: string;
  start_time: Date;
  end_time: Date;
  attendees: string[];
  includeTeamsMeeting?: boolean;
}

export default function CalendarEventForm({
  ticketId,
  ticketNumber,
  onClose,
  onSave
}: CalendarEventFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CalendarEvent>({
    title: `Follow-up: ${ticketNumber}`,
    description: '',
    start_time: new Date(),
    end_time: new Date(Date.now() + 3600000), // +1 hour
    attendees: [],
    includeTeamsMeeting: false,
  });
  const [attendeeEmail, setAttendeeEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAttendee = () => {
    if (attendeeEmail && !formData.attendees.includes(attendeeEmail)) {
      setFormData({
        ...formData,
        attendees: [...formData.attendees, attendeeEmail]
      });
      setAttendeeEmail('');
    }
  };

  const removeAttendee = (email: string) => {
    setFormData({
      ...formData,
      attendees: formData.attendees.filter(a => a !== email)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Schedule Event</h2>
              <p className="text-sm text-gray-600">Create an Outlook calendar event for this ticket</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Event Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full h-11 px-4 text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              placeholder="Add event details..."
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={format(formData.start_time, "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => setFormData({ ...formData, start_time: new Date(e.target.value) })}
              required
              className="w-full h-11 px-4 text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              End Time
            </label>
            <input
              type="datetime-local"
              value={format(formData.end_time, "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => setFormData({ ...formData, end_time: new Date(e.target.value) })}
              required
              className="w-full h-11 px-4 text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Teams Meeting */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="teamsMeeting"
              checked={formData.includeTeamsMeeting}
              onChange={(e) => setFormData({ ...formData, includeTeamsMeeting: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="teamsMeeting" className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <Video className="w-4 h-4" />
              Include Teams Meeting Link
            </label>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Attendees
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="email"
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAttendee())}
                placeholder="email@example.com"
                className="flex-1 h-11 px-4 text-base text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addAttendee}
                className="px-4 h-11 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
            {formData.attendees.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.attendees.map((email) => (
                  <div
                    key={email}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeAttendee(email)}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 h-11 bg-white border border-gray-300 text-gray-700 text-base font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
