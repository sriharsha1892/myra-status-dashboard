'use client';

import TimelineView from './timeline/TimelineView';
import ActivityTimeline from './trial/ActivityTimeline';

interface UnifiedTimelineTabProps {
  orgId: string;
  activities: any[];
  users: any[];
  organization: any;
  onAddActivity: (type: 'meeting' | 'note') => void;
}

export default function UnifiedTimelineTab({
  orgId,
  activities,
  users,
  organization,
  onAddActivity,
}: UnifiedTimelineTabProps) {
  return (
    <div className="space-y-8">
      {/* Activity History Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <ActivityTimeline orgId={orgId} />
      </div>

      {/* Unified Timeline with AI-Powered Import */}
      <TimelineView
        orgId={orgId}
        orgName={organization?.org_name || 'Organization'}
      />
    </div>
  );
}
