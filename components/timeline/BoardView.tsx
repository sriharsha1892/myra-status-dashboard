'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Loader2,
  Circle,
  Calendar,
  User,
} from 'lucide-react';
import EventDetailPanel from './EventDetailPanel';
import { authenticatedFetch } from '@/lib/api-client';

interface BoardViewProps {
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
  tags: string[];
  mentioned_people: string[];
  follow_up_required: boolean;
  source: string;
}

const COLUMNS = [
  { id: 'positive', label: 'Positive Signals', color: 'border-green-200 bg-green-50' },
  { id: 'neutral', label: 'Neutral Activity', color: 'border-gray-200 bg-gray-50' },
  { id: 'negative', label: 'Issues & Concerns', color: 'border-red-200 bg-red-50' },
];

export default function BoardView({ orgId, filters, refreshTrigger }: BoardViewProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailPanelEventId, setDetailPanelEventId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [orgId, filters, refreshTrigger]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        org_id: orgId,
        limit: '100',
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

      const response = await authenticatedFetch(`/api/timeline/events?${queryParams}`);
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

  const getEventsForColumn = (columnId: string) => {
    return events.filter(event => event.sentiment === columnId);
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

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <Circle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-900 mb-2">No events yet</p>
          <p className="text-sm text-gray-500">
            Start by importing CRM notes or manually logging events to build your timeline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 h-full">
          {COLUMNS.map((column) => {
            const columnEvents = getEventsForColumn(column.id);

            return (
              <div key={column.id} className="flex flex-col min-h-0">
                {/* Column Header */}
                <div className={`px-4 py-3 rounded-t-xl border-2 ${column.color}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{column.label}</h3>
                    <span className="px-2 py-1 bg-white/80 rounded-full text-sm font-medium text-gray-700">
                      {columnEvents.length}
                    </span>
                  </div>
                </div>

                {/* Column Content */}
                <div className="flex-1 bg-white border-2 border-t-0 border-gray-200 rounded-b-xl p-3 overflow-auto space-y-3">
                  {columnEvents.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Circle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No events</p>
                    </div>
                  ) : (
                    columnEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => handleOpenDetailPanel(event.id)}
                        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md cursor-pointer transition-all"
                      >
                        {/* Category Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(event.event_category)}`}>
                            {event.event_category}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(event.severity)}`}>
                            {event.severity}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
                          {event.title}
                        </h4>

                        {/* Description */}
                        <p className="text-xs text-gray-600 line-clamp-3 mb-3">
                          {event.description}
                        </p>

                        {/* Tags */}
                        {event.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {event.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                            {event.tags.length > 3 && (
                              <span className="px-2 py-0.5 text-gray-400 text-xs">
                                +{event.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Follow-up Badge */}
                        {event.follow_up_required && (
                          <div className="mb-3">
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                              Requires Follow-up
                            </span>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-3 text-xs text-gray-500 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(event.event_timestamp), 'MMM d')}
                          </div>
                          {event.mentioned_people.length > 0 && (
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {event.mentioned_people.length}
                            </div>
                          )}
                          <div className="ml-auto text-gray-400">
                            {event.source === 'bulk_import' ? 'Imported' : 'Manual'}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
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

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-700';
    case 'high':
      return 'bg-orange-100 text-orange-700';
    case 'medium':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-blue-100 text-blue-700';
  }
}
