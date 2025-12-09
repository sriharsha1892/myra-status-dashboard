'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Clock, MessageSquare, User, ChevronDown } from 'lucide-react';

interface QuickActivityLogProps {
  orgId: string;
  orgName: string;
  onSuccess?: () => void;
}

type QuickActivityType = {
  label: string;
  activityType: string;
  description: string;
  icon: React.ReactNode;
  color: string;
};

const QUICK_ACTIVITIES: QuickActivityType[] = [
  {
    label: 'Log Check-in',
    activityType: 'usage_observed',
    description: 'Weekly check-in completed',
    icon: <Clock className="w-3.5 h-3.5" />,
    color: 'text-blue-600 hover:bg-blue-50',
  },
  {
    label: 'Log Follow-up',
    activityType: 'follow_up_note',
    description: 'Follow-up note added',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    color: 'text-green-600 hover:bg-green-50',
  },
  {
    label: 'Log Login',
    activityType: 'user_logged_in',
    description: 'User logged into platform',
    icon: <User className="w-3.5 h-3.5" />,
    color: 'text-purple-600 hover:bg-purple-50',
  },
];

export default function QuickActivityLog({ orgId, orgName, onSuccess }: QuickActivityLogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [logging, setLogging] = useState(false);
  const supabase = createClient();

  const handleQuickLog = async (activity: QuickActivityType) => {
    setLogging(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to log activity');
        return;
      }

      // Get user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const userRole = userData?.role || 'admin';

      // Insert activity log entry
      const { error } = await supabase
        .from('trial_engagement_log')
        .insert({
          org_id: orgId,
          activity_type: activity.activityType,
          description: activity.description,
          logged_by: user.id,
          logged_by_role: userRole,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success(`${activity.label} for ${orgName}`, {
        duration: 2000,
        icon: activity.icon,
      });

      setIsOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error logging activity:', error);
      toast.error('Failed to log activity');
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="relative">
      {/* Quick Log Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white/80 hover:bg-white border border-gray-200 rounded-lg transition-all hover:shadow-md"
        title="Quick log activity"
      >
        <Clock className="w-3.5 h-3.5" />
        <span>Quick Log</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10 opacity-0 animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[180px] animate-slide-down">
            {QUICK_ACTIVITIES.map((activity) => (
              <button
                key={activity.activityType}
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickLog(activity);
                }}
                disabled={logging}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors ${activity.color} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex-shrink-0">
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{activity.label}</div>
                  <div className="text-xs text-gray-500 truncate">{activity.description}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
