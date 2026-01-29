'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import {
  FileText, Building2, Users, MessageSquare, Calendar,
  TrendingUp, AlertCircle, CheckCircle2, XCircle,
  Edit, Plus, Trash, GitBranch, Lightbulb, Filter,
  Clock, ChevronRight, Sparkles
} from 'lucide-react';
import { UnifiedLoader } from '@/components/loading';

type ActivityType =
  | 'ticket_created'
  | 'ticket_updated'
  | 'trial_created'
  | 'trial_updated'
  | 'meeting_scheduled'
  | 'meeting_completed'
  | 'note_added'
  | 'status_changed'
  | 'feature_request'
  | 'user_activity'
  | 'all';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  entityId?: string;
  entityType?: string;
  actorName?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  actionUrl?: string;
}

interface UnifiedActivityFeedProps {
  /**
   * Filter by specific user ID (optional)
   */
  userId?: string;

  /**
   * Filter by organization ID (optional)
   */
  orgId?: string;

  /**
   * Maximum number of activities to display
   */
  limit?: number;

  /**
   * Show filter controls
   */
  showFilters?: boolean;

  /**
   * Compact mode (smaller cards)
   */
  compact?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * Unified Activity Feed - Aggregates activities from multiple sources
 * Use cases: Dashboard recent activity, Organization timeline, User activity log
 *
 * @example
 * ```tsx
 * // Full feed with filters
 * <UnifiedActivityFeed showFilters limit={50} />
 *
 * // Organization-specific activity
 * <UnifiedActivityFeed orgId="123" compact />
 *
 * // User activity log
 * <UnifiedActivityFeed userId="456" limit={20} />
 * ```
 */
export default function UnifiedActivityFeed({
  userId,
  orgId,
  limit = 50,
  showFilters = false,
  compact = false,
  className = '',
}: UnifiedActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchActivities();
  }, [userId, orgId, limit]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const allActivities: Activity[] = [];

      // Fetch tickets
      let ticketsQuery = supabase
        .from('tickets')
        .select('ticket_id, title, status, priority, trial_org_id, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(Math.min(limit, 100));

      if (orgId) ticketsQuery = ticketsQuery.eq('trial_org_id', orgId);

      const { data: tickets } = await ticketsQuery;

      tickets?.forEach(ticket => {
        allActivities.push({
          id: `ticket-${ticket.ticket_id}`,
          type: 'ticket_created',
          title: `Ticket created: ${ticket.title}`,
          description: `${ticket.priority} priority · ${ticket.status}`,
          entityId: ticket.ticket_id,
          entityType: 'ticket',
          timestamp: ticket.created_at,
          metadata: { priority: ticket.priority, status: ticket.status },
          actionUrl: `/status`,
        });
      });

      // Fetch trial organizations
      let orgsQuery = supabase
        .from('trial_organizations')
        .select('org_id, org_name, org_lifecycle_stage, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(Math.min(limit, 50));

      if (orgId) orgsQuery = orgsQuery.eq('org_id', orgId);

      const { data: orgs } = await orgsQuery;

      orgs?.forEach(org => {
        allActivities.push({
          id: `org-${org.org_id}`,
          type: 'trial_created',
          title: `Trial organization created: ${org.org_name}`,
          description: `Lifecycle stage: ${org.org_lifecycle_stage}`,
          entityId: org.org_id,
          entityType: 'trial_org',
          timestamp: org.created_at,
          metadata: { stage: org.org_lifecycle_stage },
          actionUrl: `/status`,
        });
      });

      // Fetch meetings
      let meetingsQuery = supabase
        .from('meeting_notes')
        .select(`
          meeting_id,
          meeting_type,
          meeting_date,
          trial_organizations(org_name),
          created_at
        `)
        .order('meeting_date', { ascending: false })
        .limit(Math.min(limit, 50));

      if (orgId) meetingsQuery = meetingsQuery.eq('org_id', orgId);

      const { data: meetings } = await meetingsQuery;

      meetings?.forEach(meeting => {
        const orgName = (meeting.trial_organizations as any)?.org_name || 'Unknown Org';
        allActivities.push({
          id: `meeting-${meeting.meeting_id}`,
          type: 'meeting_scheduled',
          title: `${meeting.meeting_type} scheduled`,
          description: `With ${orgName}`,
          entityId: meeting.meeting_id,
          entityType: 'meeting',
          timestamp: meeting.meeting_date || meeting.created_at,
          metadata: { type: meeting.meeting_type },
          actionUrl: `/status`,
        });
      });

      // Fetch feature requests
      let featuresQuery = supabase
        .from('feature_requests')
        .select(`
          request_id,
          title,
          priority,
          status,
          org_id,
          trial_organizations(org_name),
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(Math.min(limit, 50));

      if (orgId) featuresQuery = featuresQuery.eq('org_id', orgId);

      const { data: features } = await featuresQuery;

      features?.forEach(feature => {
        const orgName = (feature.trial_organizations as any)?.org_name || 'Unknown Org';
        allActivities.push({
          id: `feature-${feature.request_id}`,
          type: 'feature_request',
          title: `Feature request: ${feature.title}`,
          description: `From ${orgName} · ${feature.priority} priority`,
          entityId: feature.request_id,
          entityType: 'feature',
          timestamp: feature.created_at,
          metadata: { priority: feature.priority, status: feature.status },
          actionUrl: '/status',
        });
      });

      // Sort all activities by timestamp
      allActivities.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities.slice(0, limit));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Filter by type
    if (filter !== 'all') {
      filtered = filtered.filter(a => a.type === filter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activities, filter, searchQuery]);

  const getActivityIcon = (type: ActivityType) => {
    const icons = {
      ticket_created: FileText,
      ticket_updated: Edit,
      trial_created: Building2,
      trial_updated: TrendingUp,
      meeting_scheduled: Calendar,
      meeting_completed: CheckCircle2,
      note_added: MessageSquare,
      status_changed: GitBranch,
      feature_request: Lightbulb,
      user_activity: Users,
      all: Activity,
    };
    return icons[type] || Activity;
  };

  const getActivityColor = (type: ActivityType) => {
    const colors = {
      ticket_created: 'text-blue-600 bg-blue-50 border-blue-200',
      ticket_updated: 'text-purple-600 bg-purple-50 border-purple-200',
      trial_created: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      trial_updated: 'text-green-600 bg-green-50 border-green-200',
      meeting_scheduled: 'text-amber-600 bg-amber-50 border-amber-200',
      meeting_completed: 'text-green-600 bg-green-50 border-green-200',
      note_added: 'text-accent-600 bg-accent-50 border-accent-200',
      status_changed: 'text-orange-600 bg-orange-50 border-orange-200',
      feature_request: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      user_activity: 'text-sky-600 bg-sky-50 border-sky-200',
      all: 'text-neutral-600 bg-neutral-50 border-neutral-200',
    };
    return colors[type] || colors.all;
  };

  if (loading) {
    return <UnifiedLoader variant="inline" message="Loading activity feed..." />;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as ActivityType)}
              className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Activities</option>
              <option value="ticket_created">Tickets</option>
              <option value="trial_created">Trials</option>
              <option value="meeting_scheduled">Meetings</option>
              <option value="feature_request">Features</option>
            </select>
          </div>

          {/* Filter summary */}
          <div className="mt-3 flex items-center gap-2 text-xs text-neutral-600">
            <Filter className="w-3.5 h-3.5" />
            <span>
              Showing {filteredActivities.length} of {activities.length} activities
            </span>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
          <Sparkles className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-600 mb-1">No activities found</p>
          <p className="text-xs text-neutral-500">Check back later for updates</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredActivities.map((activity, idx) => {
            const Icon = getActivityIcon(activity.type);
            const colorClasses = getActivityColor(activity.type);

            return (
              <button
                key={activity.id}
                onClick={() => activity.actionUrl && router.push(activity.actionUrl)}
                className={`group w-full text-left bg-white rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all duration-200 ${
                  compact ? 'p-3' : 'p-4'
                }`}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg border flex items-center justify-center flex-shrink-0 ${colorClasses}`}>
                    <Icon className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} strokeWidth={2} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-neutral-900 mb-1 group-hover:text-blue-600 transition-colors`}>
                      {activity.title}
                    </h4>

                    {activity.description && (
                      <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-neutral-600 mb-2`}>
                        {activity.description}
                      </p>
                    )}

                    <div className={`flex items-center gap-2 ${compact ? 'text-[10px]' : 'text-xs'} text-neutral-500`}>
                      <Clock className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                      <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  {activity.actionUrl && (
                    <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
