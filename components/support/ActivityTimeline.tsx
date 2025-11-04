'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { TimelineEvent } from './TimelineEvent';
import { Button } from './ui/Button';
import { Download, RefreshCw } from 'lucide-react';
import { exportTimelineToPDF, exportTimelineToCSV } from '@/lib/exportTimeline';
import {
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  format,
  parseISO,
} from 'date-fns';

type TicketActivity = Database['public']['Tables']['ticket_activities']['Row'];

interface ActivityTimelineProps {
  ticketId: string;
  ticketNumber: string;
}

interface GroupedActivities {
  label: string;
  activities: TicketActivity[];
}

export function ActivityTimeline({ ticketId, ticketNumber }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchActivities();

    // Set up real-time subscription
    const channel = supabase
      .channel(`ticket-activities-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_activities',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setActivities((prev) => [payload.new as TicketActivity, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ticket_activities')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupActivitiesByDate = (): GroupedActivities[] => {
    const groups: Map<string, TicketActivity[]> = new Map();

    activities.forEach((activity) => {
      const date = parseISO(activity.created_at);
      let label: string;

      if (isToday(date)) {
        label = 'Today';
      } else if (isYesterday(date)) {
        label = 'Yesterday';
      } else if (isThisWeek(date)) {
        label = 'This Week';
      } else if (isThisMonth(date)) {
        label = 'This Month';
      } else {
        label = format(date, 'MMMM yyyy');
      }

      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label)!.push(activity);
    });

    return Array.from(groups.entries()).map(([label, activities]) => ({
      label,
      activities,
    }));
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    setExporting(format);
    try {
      if (format === 'pdf') {
        await exportTimelineToPDF(activities, ticketNumber);
      } else {
        exportTimelineToCSV(activities, ticketNumber);
      }
    } catch (error) {
      console.error('Error exporting timeline:', error);
      alert('Failed to export timeline. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const groupedActivities = groupActivitiesByDate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading activity timeline...</span>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <RefreshCw className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
          No Activity Yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Activity will appear here as changes are made to this ticket.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with export buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Activity Timeline
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activities.length} {activities.length === 1 ? 'event' : 'events'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            loading={exporting === 'csv'}
          >
            <Download className="w-4 h-4 mr-1.5" />
            CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            loading={exporting === 'pdf'}
          >
            <Download className="w-4 h-4 mr-1.5" />
            PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchActivities}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {groupedActivities.map((group, groupIndex) => (
          <div key={group.label} className="relative">
            {/* Date header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 py-2 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>

            {/* Timeline events */}
            <div className="relative">
              {/* Vertical connecting line */}
              {group.activities.length > 1 && (
                <div
                  className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"
                  style={{ height: 'calc(100% - 2rem)' }}
                />
              )}

              {/* Events */}
              <div className="space-y-0">
                {group.activities.map((activity, index) => (
                  <div key={activity.id} className="relative">
                    {/* Connecting line for this event */}
                    {index < group.activities.length - 1 && (
                      <div className="absolute left-4 top-8 w-0.5 bg-gray-200 dark:bg-gray-700 h-full" />
                    )}
                    {/* Continue line to next group */}
                    {index === group.activities.length - 1 &&
                      groupIndex < groupedActivities.length - 1 && (
                        <div className="absolute left-4 top-8 w-0.5 bg-gray-200 dark:bg-gray-700 h-16" />
                      )}
                    <TimelineEvent
                      type={
                        activity.activity_type as
                          | 'created'
                          | 'status_changed'
                          | 'assigned'
                          | 'commented'
                          | 'linked'
                          | 'watched'
                      }
                      user={{
                        name: activity.metadata?.user_name || 'System',
                        avatar: activity.metadata?.user_avatar,
                      }}
                      oldValue={activity.old_value}
                      newValue={activity.new_value}
                      metadata={activity.metadata}
                      timestamp={activity.created_at}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
