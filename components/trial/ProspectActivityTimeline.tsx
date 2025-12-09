'use client';

/**
 * ProspectActivityTimeline - Shows outreach and activity history for a prospect
 * Displays prospect_activities and timeline_events in chronological order
 *
 * Performance optimizations:
 * - Parallel queries with Promise.all
 * - Select only needed columns
 * - Real-time subscription for auto-refresh
 * - Proper error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// Activity type configuration
const ACTIVITY_TYPES = {
  email_sent: { label: 'Email Sent', icon: '📧', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  email_received: { label: 'Reply Received', icon: '📥', color: 'bg-green-100 text-green-700 border-green-300' },
  call: { label: 'Phone Call', icon: '📞', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  linkedin: { label: 'LinkedIn', icon: '💼', color: 'bg-sky-100 text-sky-700 border-sky-300' },
  meeting: { label: 'Meeting', icon: '📅', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  note: { label: 'Note', icon: '📝', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  screening: { label: 'Screening', icon: '🔍', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  demo: { label: 'Demo', icon: '🎯', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  stage_change: { label: 'Stage Change', icon: '⏭️', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  created: { label: 'Created', icon: '✨', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  outreach_logged: { label: 'Outreach', icon: '📤', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  prospect_created: { label: 'Created', icon: '✨', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
} as const;

interface Activity {
  id: string;
  type: string;
  direction?: string;
  subject?: string;
  content?: string;
  activity_date: string;
  logged_by?: string;
  created_at: string;
}

interface ProspectActivityTimelineProps {
  orgId: string;
  className?: string;
  maxItems?: number;
}

function getActivityConfig(type: string) {
  return ACTIVITY_TYPES[type as keyof typeof ACTIVITY_TYPES] || ACTIVITY_TYPES.note;
}

function ActivityItem({ activity }: { activity: Activity }) {
  const config = getActivityConfig(activity.type);
  const isOutbound = activity.direction === 'outbound';

  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-200 last:hidden" />

      {/* Icon */}
      <div className={cn(
        'relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm border',
        config.color
      )}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">{config.label}</span>
          {activity.direction && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              isOutbound ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
            )}>
              {isOutbound ? '↗ Outbound' : '↙ Inbound'}
            </span>
          )}
        </div>

        {activity.subject && (
          <div className="text-sm text-gray-700 font-medium mb-1">{activity.subject}</div>
        )}

        {activity.content && (
          <p className="text-sm text-gray-600 line-clamp-2">{activity.content}</p>
        )}

        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
          <span>{formatDistanceToNow(new Date(activity.activity_date), { addSuffix: true })}</span>
          {activity.logged_by && (
            <>
              <span>•</span>
              <span>by {activity.logged_by}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProspectActivityTimeline({
  orgId,
  className,
  maxItems = 10,
}: ProspectActivityTimelineProps) {
  const supabase = createClient();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized fetch function for reuse by real-time subscription
  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // OPTIMIZATION: Parallel queries with Promise.all + select only needed columns
      const [activitiesResult, timelineResult] = await Promise.all([
        // Query 1: prospect_activities (primary source)
        supabase
          .from('prospect_activities')
          .select('id, activity_type, direction, subject, content, activity_date, logged_by, created_at')
          .eq('org_id', orgId)
          .order('activity_date', { ascending: false })
          .limit(maxItems),

        // Query 2: timeline_events (backward compatibility)
        supabase
          .from('timeline_events')
          .select('event_id, event_type, title, description, event_timestamp, logged_by, created_at, metadata')
          .eq('org_id', orgId)
          .in('event_type', ['outreach_logged', 'stage_change', 'prospect_created'])
          .order('event_timestamp', { ascending: false })
          .limit(maxItems),
      ]);

      const { data: prospectActivities, error: actError } = activitiesResult;
      const { data: timelineEvents, error: timelineError } = timelineResult;

      // OPTIMIZATION: Better error handling - show actual errors to user
      const errors: string[] = [];
      if (actError && !actError.message?.includes('does not exist')) {
        console.error('Error fetching prospect activities:', actError);
        errors.push('activities');
      }
      if (timelineError && !timelineError.message?.includes('does not exist')) {
        console.error('Error fetching timeline events:', timelineError);
        errors.push('timeline');
      }

      // If both queries failed, show error
      if (errors.length === 2) {
        setError('Failed to load activity timeline. Please try again.');
        setActivities([]);
        return;
      }

      // Combine and transform activities
      const allActivities: Activity[] = [];

      // Add prospect activities
      if (prospectActivities) {
        for (const item of prospectActivities) {
          const pa = item as any;
          allActivities.push({
            id: pa.id,
            type: pa.activity_type,
            direction: pa.direction,
            subject: pa.subject,
            content: pa.content,
            activity_date: pa.activity_date || pa.created_at,
            logged_by: pa.logged_by,
            created_at: pa.created_at,
          });
        }
      }

      // Add timeline events (if not duplicates)
      if (timelineEvents) {
        const existingIds = new Set(allActivities.map(a => a.id));
        for (const item of timelineEvents) {
          const te = item as any;
          if (!existingIds.has(te.event_id)) {
            const metadata = te.metadata || {};
            allActivities.push({
              id: te.event_id,
              type: metadata.outreach_type || te.event_type,
              direction: metadata.direction,
              subject: te.title,
              content: te.description,
              activity_date: te.event_timestamp,
              logged_by: te.logged_by,
              created_at: te.created_at,
            });
          }
        }
      }

      // Sort by date (most recent first)
      allActivities.sort((a, b) =>
        new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime()
      );

      // Limit and set
      setActivities(allActivities.slice(0, maxItems));
      setError(null);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activity timeline. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [orgId, maxItems, supabase]);

  // Initial fetch
  useEffect(() => {
    if (orgId) {
      fetchActivities();
    }
  }, [orgId, fetchActivities]);

  // OPTIMIZATION: Real-time subscription for auto-refresh
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`prospect-activities-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'prospect_activities',
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          // Refetch on any change
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, supabase, fetchActivities]);

  if (isLoading) {
    return (
      <div className={cn('animate-pulse space-y-4', className)}>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-48 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-4', className)}>
        <div className="text-red-400 mb-2">
          <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-sm text-red-600 mb-2">{error}</p>
        <button
          onClick={fetchActivities}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="text-gray-400 mb-2">
          <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">No activities recorded yet</p>
        <p className="text-xs text-gray-400 mt-1">Log outreach to track your engagement</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-0', className)}>
      {activities.map(activity => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

export default ProspectActivityTimeline;
