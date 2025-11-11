'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Loader2,
  Circle,
} from 'lucide-react';
import EventDetailPanel from './EventDetailPanel';

interface GroupedViewProps {
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
}

type GroupBy = 'category' | 'severity' | 'sentiment';

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  onboarding: { label: 'Onboarding', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  engagement: { label: 'Engagement', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  communication: { label: 'Communication', color: 'bg-accent-100 text-accent-700 border-accent-200' },
  feedback: { label: 'Feedback', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  support: { label: 'Support', color: 'bg-red-100 text-red-700 border-red-200' },
  milestone: { label: 'Milestone', color: 'bg-green-100 text-green-700 border-green-200' },
  sales: { label: 'Sales', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
};

export default function GroupedView({ orgId, filters, refreshTrigger }: GroupedViewProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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

      const response = await fetch(`/api/timeline/events?${queryParams}`);
      const result = await response.json();

      if (result.success) {
        setEvents(result.data);
        // Expand all groups by default
        const allGroups = new Set(result.data.map((e: TimelineEvent) => getGroupKey(e, groupBy)));
        setExpandedGroups(allGroups);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGroupKey = (event: TimelineEvent, groupByField: GroupBy): string => {
    switch (groupByField) {
      case 'category':
        return event.event_category;
      case 'severity':
        return event.severity;
      case 'sentiment':
        return event.sentiment;
      default:
        return 'other';
    }
  };

  const getGroupLabel = (key: string, groupByField: GroupBy): string => {
    switch (groupByField) {
      case 'category':
        return CATEGORY_CONFIG[key]?.label || key;
      case 'severity':
      case 'sentiment':
        return key.charAt(0).toUpperCase() + key.slice(1);
      default:
        return key;
    }
  };

  const getGroupColor = (key: string, groupByField: GroupBy): string => {
    switch (groupByField) {
      case 'category':
        return CATEGORY_CONFIG[key]?.color || 'bg-gray-100 text-gray-700 border-gray-200';
      case 'severity':
        if (key === 'critical') return 'bg-red-100 text-red-700 border-red-200';
        if (key === 'high') return 'bg-orange-100 text-orange-700 border-orange-200';
        if (key === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'sentiment':
        if (key === 'positive') return 'bg-green-100 text-green-700 border-green-200';
        if (key === 'negative') return 'bg-red-100 text-red-700 border-red-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const groupedEvents = events.reduce((acc, event) => {
    const key = getGroupKey(event, groupBy);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
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
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Group By Selector */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Group by:</span>
        <div className="flex gap-2">
          {(['category', 'severity', 'sentiment'] as GroupBy[]).map((option) => (
            <button
              key={option}
              onClick={() => setGroupBy(option)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                groupBy === option
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped Events */}
      <div className="space-y-4">
        {Object.entries(groupedEvents).map(([groupKey, groupEvents]) => {
          const isExpanded = expandedGroups.has(groupKey);
          const groupColor = getGroupColor(groupKey, groupBy);
          const groupLabel = getGroupLabel(groupKey, groupBy);

          return (
            <div key={groupKey} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(groupKey)}
                className={`w-full px-5 py-4 flex items-center justify-between border-2 ${groupColor} hover:opacity-80 transition-opacity`}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                  <h3 className="text-lg font-semibold">{groupLabel}</h3>
                  <span className="px-2 py-0.5 bg-white/50 rounded-full text-sm font-medium">
                    {groupEvents.length}
                  </span>
                </div>
              </button>

              {/* Group Events */}
              {isExpanded && (
                <div className="bg-white divide-y divide-gray-100">
                  {groupEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => handleOpenDetailPanel(event.id)}
                      className="px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{event.title}</h4>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(new Date(event.event_timestamp), 'MMM d, yyyy h:mm a')}
                            </div>
                            {event.follow_up_required && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md">
                                Follow-up
                              </span>
                            )}
                            {event.mentioned_people.length > 0 && (
                              <span className="text-gray-400">
                                {event.mentioned_people.length} people
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
