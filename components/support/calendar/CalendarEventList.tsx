'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, ExternalLink, Trash2, Plus, Video } from 'lucide-react';
import { format, isPast, isFuture } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  attendees?: string[];
  metadata?: {
    webLink?: string;
    onlineMeeting?: {
      joinUrl?: string;
    };
  };
}

interface CalendarEventListProps {
  ticketId: string;
  onSchedule: () => void;
}

export default function CalendarEventList({ ticketId, onSchedule }: CalendarEventListProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvents();
  }, [ticketId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tickets/${ticketId}/calendar-events`);
      if (!response.ok) throw new Error('Failed to load events');

      const data = await response.json();
      setEvents(data.events.map((e: any) => ({
        ...e,
        start_time: new Date(e.start_time),
        end_time: new Date(e.end_time)
      })));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Delete this calendar event?')) return;

    try {
      const response = await fetch(`/api/tickets/${ticketId}/calendar-events/${eventId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete event');

      setEvents(events.filter(e => e.id !== eventId));
    } catch (err: any) {
      alert(`Failed to delete event: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">Failed to load calendar events: {error}</p>
      </div>
    );
  }

  const upcomingEvents = events.filter(e => isFuture(e.start_time));
  const pastEvents = events.filter(e => isPast(e.end_time));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-semibold text-gray-900">Calendar Events</h3>
          <span className="text-sm text-gray-500">
            ({upcomingEvents.length} upcoming)
          </span>
        </div>
        <button
          onClick={onSchedule}
          className="inline-flex items-center gap-2 px-4 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Schedule Event
        </button>
      </div>

      {/* Events list */}
      {events.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-4">No calendar events scheduled</p>
          <button
            onClick={onSchedule}
            className="inline-flex items-center gap-2 px-4 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Schedule Your First Event
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upcoming events */}
          {upcomingEvents.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Upcoming</h4>
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onDelete={deleteEvent}
                    upcoming
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past events */}
          {pastEvents.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">Past</h4>
              <div className="space-y-3">
                {pastEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onDelete={deleteEvent}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  onDelete,
  upcoming = false
}: {
  event: CalendarEvent;
  onDelete: (id: string) => void;
  upcoming?: boolean;
}) {
  return (
    <div className={`bg-white border rounded-lg p-4 transition-all ${
      upcoming
        ? 'border-blue-200 hover:border-blue-300 hover:shadow-sm'
        : 'border-gray-200 opacity-75'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h5 className="text-sm font-semibold text-gray-900 mb-2">
            {event.title}
          </h5>

          {/* Time */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Clock className="w-4 h-4" />
            <span>
              {format(event.start_time, 'MMM d, yyyy h:mm a')} - {format(event.end_time, 'h:mm a')}
            </span>
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <Users className="w-4 h-4" />
              <div className="flex flex-wrap gap-1">
                {event.attendees.slice(0, 3).map((email, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                    {email}
                  </span>
                ))}
                {event.attendees.length > 3 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    +{event.attendees.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex items-center gap-3">
            {event.metadata?.webLink && (
              <a
                href={event.metadata.webLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="w-3 h-3" />
                View in Outlook
              </a>
            )}
            {event.metadata?.onlineMeeting?.joinUrl && (
              <a
                href={event.metadata.onlineMeeting.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Video className="w-3 h-3" />
                Join Teams Meeting
              </a>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={() => onDelete(event.id)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete event"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
