'use client';

import ContactsSidebar from './ContactsSidebar';
import DealSummaryCard from './DealSummaryCard';
import UpcomingTasksCard from './UpcomingTasksCard';
import QuickActionsBar from './QuickActionsBar';
import EngagementGauge from './EngagementGauge';
import { Activity } from 'lucide-react';

interface ProspectSidebarProps {
  orgId: string;
  engagementScore?: number | null;
  healthStatus?: string;
  onAddContact?: () => void;
  onEditDeal?: () => void;
  onAddTask?: () => void;
  onLogCall?: () => void;
  onSendEmail?: () => void;
  onScheduleMeeting?: () => void;
  onAddNote?: () => void;
  onLogActivity?: () => void;
  onAIAssist?: () => void;
}

export default function ProspectSidebar({
  orgId,
  engagementScore,
  healthStatus,
  onAddContact,
  onEditDeal,
  onAddTask,
  onLogCall,
  onSendEmail,
  onScheduleMeeting,
  onAddNote,
  onLogActivity,
  onAIAssist,
}: ProspectSidebarProps) {
  const getTrendFromHealth = (status?: string) => {
    if (status === 'healthy') return 'up';
    if (status === 'at-risk' || status === 'critical') return 'down';
    return 'stable';
  };

  return (
    <div className="space-y-4">
      {/* Engagement Score Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-gray-900">Engagement</h3>
        </div>
        <div className="flex items-center justify-center">
          <EngagementGauge
            score={engagementScore ?? null}
            trend={getTrendFromHealth(healthStatus)}
            size="md"
          />
        </div>
        {healthStatus && (
          <div className="mt-3 text-center">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              healthStatus === 'healthy' ? 'bg-emerald-100 text-emerald-700' :
              healthStatus === 'warning' ? 'bg-amber-100 text-amber-700' :
              healthStatus === 'at-risk' ? 'bg-orange-100 text-orange-700' :
              healthStatus === 'critical' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {healthStatus?.replace('-', ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Contacts */}
      <ContactsSidebar orgId={orgId} onAddContact={onAddContact} />

      {/* Deal Info */}
      <DealSummaryCard orgId={orgId} onEditDeal={onEditDeal} />

      {/* Upcoming Tasks */}
      <UpcomingTasksCard orgId={orgId} onAddTask={onAddTask} />

      {/* Quick Actions */}
      <QuickActionsBar
        onLogCall={onLogCall}
        onSendEmail={onSendEmail}
        onScheduleMeeting={onScheduleMeeting}
        onAddNote={onAddNote}
        onLogActivity={onLogActivity}
        onAIAssist={onAIAssist}
      />
    </div>
  );
}
