'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Clock,
  User,
  Tag,
  AlertCircle,
  CheckCircle2,
  Circle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import EventDetailPanel from './EventDetailPanel';
import { authenticatedFetch } from '@/lib/api-client';

interface ListViewProps {
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
  mentioned_features: string[];
  follow_up_required: boolean;
  parse_confidence: number;
  source: string;
  users?: {
    full_name: string;
    email: string;
  };
}

export default function ListView({ orgId, filters, refreshTrigger }: ListViewProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
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

  const handleOpenDetailPanel = (eventId: string) => {
    setDetailPanelEventId(eventId);
    setIsPanelOpen(true);
  };

  const handleCloseDetailPanel = () => {
    setIsPanelOpen(false);
    setDetailPanelEventId(null);
  };

  const handleEventSaved = () => {
    fetchEvents();
  };

  const handleEventDeleted = () => {
    fetchEvents();
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
    <div className="max-w-5xl mx-auto px-6 py-6">
      <div className="space-y-3">
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
            className={`bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer ${
              selectedEvent === event.id ? 'ring-2 ring-blue-500 shadow-md' : ''
            }`}
          >
            {/* Header Row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                {/* Timestamp */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(event.event_timestamp), 'MMM d, yyyy h:mm a')}
                </div>

                {/* Category Badge */}
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${getCategoryColor(event.event_category)}`}>
                  {event.event_category}
                </span>

                {/* Sentiment Badge */}
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${getSentimentColor(event.sentiment)}`}>
                  {event.sentiment}
                </span>

                {/* Severity Badge */}
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${getSeverityColor(event.severity)}`}>
                  {event.severity}
                </span>

                {/* Follow-up Indicator */}
                {event.follow_up_required && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-medium">
                    Follow-up
                  </span>
                )}
              </div>

              <ChevronRight
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  selectedEvent === event.id ? 'rotate-90' : ''
                }`}
              />
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              {event.title}
            </h3>

            {/* Description */}
            <p className={`text-sm text-gray-600 mb-3 ${selectedEvent === event.id ? '' : 'line-clamp-2'}`}>
              {event.description}
            </p>

            {/* Metadata Row */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
              {/* Event Type */}
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                {event.event_type.replace(/_/g, ' ')}
              </div>

              {/* Logged By */}
              {event.users && (
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {event.users.full_name}
                </div>
              )}

              {/* Source */}
              <div className="flex items-center gap-1.5">
                <Circle className="w-3.5 h-3.5" />
                {event.source === 'bulk_import' ? 'Imported' : 'Manual'}
              </div>

              {/* Confidence (if imported) */}
              {event.source === 'bulk_import' && event.parse_confidence && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {(event.parse_confidence * 100).toFixed(0)}% confidence
                </div>
              )}
            </div>

            {/* Expanded Content */}
            {selectedEvent === event.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t border-gray-100"
              >
                {/* Tags */}
                {event.tags.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mentioned People */}
                {event.mentioned_people.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">People Mentioned</p>
                    <div className="flex flex-wrap gap-2">
                      {event.mentioned_people.map((person, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                          {person}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mentioned Features */}
                {event.mentioned_features.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Features Mentioned</p>
                    <div className="flex flex-wrap gap-2">
                      {event.mentioned_features.map((feature, i) => (
                        <span key={i} className="px-2 py-1 bg-accent-50 text-accent-700 text-xs rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleOpenDetailPanel(event.id)}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                    Link Event
                  </button>
                  {event.follow_up_required && (
                    <button className="px-3 py-1.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Mark Complete
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Load More (placeholder for pagination) */}
      {events.length >= 100 && (
        <div className="text-center mt-6">
          <button className="px-6 py-2 text-sm text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
            Load More
          </button>
        </div>
      )}

      {/* Event Detail Panel */}
      <EventDetailPanel
        eventId={detailPanelEventId}
        isOpen={isPanelOpen}
        onClose={handleCloseDetailPanel}
        onSaved={handleEventSaved}
        onDeleted={handleEventDeleted}
      />
    </div>
  );
}

// Helper functions for styling (Notion-style muted colors)
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

function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'positive':
      return 'bg-green-100 text-green-700';
    case 'negative':
      return 'bg-red-100 text-red-700';
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
