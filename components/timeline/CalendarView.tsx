'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Circle,
} from 'lucide-react';
import EventDetailPanel from './EventDetailPanel';

interface CalendarViewProps {
  orgId: string;
  filters: any;
  refreshTrigger: number;
}

interface TimelineEvent {
  id: string;
  event_timestamp: string;
  event_type: string;
  event_category: string;
  title: string;
  description: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  severity: 'low' | 'medium' | 'high' | 'critical';
  follow_up_required: boolean;
}

export default function CalendarView({ orgId, filters, refreshTrigger }: CalendarViewProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [detailPanelEventId, setDetailPanelEventId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [orgId, filters, refreshTrigger, currentMonth]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        org_id: orgId,
        limit: '1000',
      });

      if (filters.event_categories.length > 0) {
        queryParams.append('event_categories', filters.event_categories.join(','));
      }
      if (filters.sentiment.length > 0) {
        queryParams.append('sentiment', filters.sentiment.join(','));
      }
      if (filters.severity.length > 0) {
        queryParams.append('severity', filters.severity.join(','));
      }
      if (filters.follow_up_only) {
        queryParams.append('follow_up_only', 'true');
      }
      if (filters.search) {
        queryParams.append('search', filters.search);
      }

      const response = await fetch(`/api/timeline/events?${queryParams}`);
      const result = await response.json();

      if (result.success) {
        setEvents(result.data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event =>
      isSameDay(new Date(event.event_timestamp), day)
    );
  };

  // Get selected day events
  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleOpenDetailPanel = (eventId: string) => {
    setDetailPanelEventId(eventId);
    setIsPanelOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading timeline events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Calendar Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Calendar Grid */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="px-4 py-3 text-center text-sm font-medium text-gray-700 bg-gray-50"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="flex-1 grid grid-cols-7 overflow-auto">
              {daysInMonth.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`border-b border-r border-gray-100 p-3 text-left hover:bg-gray-50 transition-colors relative ${
                      !isSameMonth(day, currentMonth) ? 'bg-gray-50/50 text-gray-400' : ''
                    } ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''}`}
                  >
                    <div className="flex flex-col h-full">
                      <span
                        className={`text-sm font-medium mb-2 ${
                          isCurrentDay
                            ? 'w-7 h-7 flex items-center justify-center bg-blue-600 text-white rounded-full'
                            : ''
                        }`}
                      >
                        {format(day, 'd')}
                      </span>

                      {/* Event Indicators */}
                      {dayEvents.length > 0 && (
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className={`text-xs px-2 py-1 rounded truncate ${getCategoryColor(event.event_category)}`}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-500 px-2">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Day Events */}
        {selectedDate && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="p-4">
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Circle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No events on this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleOpenDetailPanel(event.id)}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(event.event_category)}`}>
                          {event.event_category}
                        </span>
                        {event.follow_up_required && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            Follow-up
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm mb-1">{event.title}</h4>
                      <p className="text-xs text-gray-600 line-clamp-2">{event.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {format(new Date(event.event_timestamp), 'h:mm a')}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Event Detail Panel */}
      <EventDetailPanel
        eventId={detailPanelEventId}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onSaved={fetchEvents}
        onDeleted={fetchEvents}
      />
    </div>
  );
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'onboarding':
      return 'bg-gray-100 text-gray-700';
    case 'engagement':
      return 'bg-blue-100 text-blue-700';
    case 'communication':
      return 'bg-accent-100 text-accent-700';
    case 'feedback':
      return 'bg-amber-100 text-amber-700';
    case 'support':
      return 'bg-red-100 text-red-700';
    case 'milestone':
      return 'bg-green-100 text-green-700';
    case 'sales':
      return 'bg-cyan-100 text-cyan-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}
