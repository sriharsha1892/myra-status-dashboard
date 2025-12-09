'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Plus, Clock, Phone, Mail, Video, FileText, CheckCircle2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';

interface FollowUp {
  id: string;
  title: string;
  follow_up_type: string;
  due_date: string;
  due_time: string | null;
  priority: string;
  status: string;
  notes: string | null;
}

interface UpcomingTasksCardProps {
  orgId: string;
  onAddTask?: () => void;
  onCompleteTask?: (taskId: string) => void;
}

const TYPE_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Video,
  demo: Video,
  proposal: FileText,
  general: Calendar,
  check_in: Phone,
  task: CheckCircle2,
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-l-red-500 bg-red-50',
  high: 'border-l-orange-500 bg-orange-50',
  medium: 'border-l-blue-500 bg-blue-50',
  low: 'border-l-gray-400 bg-gray-50',
};

export default function UpcomingTasksCard({ orgId, onAddTask, onCompleteTask }: UpcomingTasksCardProps) {
  const [tasks, setTasks] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchTasks();
  }, [orgId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('org_id', orgId)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(5);

      if (error) {
        console.error('Error fetching tasks:', error);
      }
      setTasks(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('follow_ups')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      // Refresh list
      fetchTasks();
      onCompleteTask?.(taskId);
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) return { label: 'Overdue', color: 'text-red-600' };
    if (isToday(date)) return { label: 'Today', color: 'text-blue-600' };
    if (isTomorrow(date)) return { label: 'Tomorrow', color: 'text-green-600' };
    return { label: format(date, 'MMM dd'), color: 'text-gray-600' };
  };

  const overdueCount = tasks.filter(t => isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-gray-900">Upcoming</h3>
          {tasks.length > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              {tasks.length}
            </span>
          )}
          {overdueCount > 0 && (
            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {overdueCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onAddTask && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddTask();
              }}
              className="p-1 hover:bg-amber-100 rounded-lg transition-colors"
              title="Add task"
            >
              <Plus className="w-4 h-4 text-amber-600" />
            </button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-4">
              <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No upcoming tasks</p>
              {onAddTask && (
                <button
                  onClick={onAddTask}
                  className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  Add a task
                </button>
              )}
            </div>
          ) : (
            tasks.map((task) => {
              const Icon = TYPE_ICONS[task.follow_up_type] || Calendar;
              const dateInfo = getDateLabel(task.due_date);
              const priorityClass = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;

              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border-l-4 ${priorityClass} group`}
                >
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="mt-0.5 p-1 hover:bg-white rounded-full transition-colors"
                    title="Mark complete"
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-green-500 group-hover:bg-green-50 transition-colors" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {task.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className={`text-xs font-medium ${dateInfo.color}`}>
                        {dateInfo.label}
                      </span>
                      {task.due_time && (
                        <span className="text-xs text-gray-500">
                          at {task.due_time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
