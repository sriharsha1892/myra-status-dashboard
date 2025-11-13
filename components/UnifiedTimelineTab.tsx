'use client';

import TimelineView from './timeline/TimelineView';

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
    <div className="space-y-6">
      {/* Unified Timeline with AI-Powered Import */}
      <TimelineView
        orgId={orgId}
        orgName={organization?.org_name || 'Organization'}
      />
    </div>
  );
}
