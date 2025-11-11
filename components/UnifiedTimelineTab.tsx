'use client';

import { useState } from 'react';
import { Clock, Activity, Calendar, Sparkles } from 'lucide-react';
import TimelineView from './timeline/TimelineView';
import ActivityEngagementTab from './ActivityEngagementTab';

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
  const [activeView, setActiveView] = useState<'unified' | 'ai-timeline'>('unified');

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center gap-2 p-1 bg-white/60 backdrop-blur-xl border border-gray-200 rounded-xl inline-flex">
        <button
          onClick={() => setActiveView('unified')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeView === 'unified'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white/80'
          }`}
        >
          <Activity className="w-4 h-4" />
          Activity Timeline
        </button>
        <button
          onClick={() => setActiveView('ai-timeline')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeView === 'ai-timeline'
              ? 'bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white/80'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Timeline
        </button>
      </div>

      {/* Description */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            {activeView === 'unified' ? (
              <Activity className="w-5 h-5 text-blue-600" />
            ) : (
              <Sparkles className="w-5 h-5 text-accent-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">
              {activeView === 'unified' ? 'Unified Activity Timeline' : 'AI-Powered Timeline Insights'}
            </h3>
            <p className="text-sm text-gray-600">
              {activeView === 'unified'
                ? 'Complete chronological view of meetings, user events, support queries, and system activities with smart filtering.'
                : 'AI-enhanced timeline with intelligent pattern detection, engagement insights, and predictive analytics.'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeView === 'unified' ? (
        <ActivityEngagementTab
          orgId={orgId}
          activities={activities}
          users={users}
          organization={organization}
          onAddActivity={onAddActivity}
        />
      ) : (
        <TimelineView orgId={orgId} />
      )}
    </div>
  );
}
