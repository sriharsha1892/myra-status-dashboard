'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import AddRoadmapItemModal from '../AddRoadmapItemModal';

interface RoadmapItem {
  id: string;
  title: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_date: string | null;
  estimated_completion_date: string | null;
  label_ids: string[] | null;
  milestone_id: string | null;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Milestone {
  id: string;
  name: string;
  color: string;
}

interface CalendarViewProps {
  orgId: string;
  items: RoadmapItem[];
  labels: Label[];
  milestones: Milestone[];
  onItemClick: (itemId: string) => void;
  onUpdate: () => void;
}

const STATUS_COLORS = {
  planned: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-300',
};

const PRIORITY_DOTS = {
  low: '•',
  medium: '••',
  high: '•••',
  critical: '••••',
};

export default function CalendarView({
  orgId,
  items,
  labels,
  milestones,
  onItemClick,
  onUpdate,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [draggedItem, setDraggedItem] = useState<RoadmapItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const supabase = createClient();

  // Calculate calendar days
  const calendarDays = useMemo(() => {
    if (view === 'month') {
      const start = startOfWeek(startOfMonth(currentMonth));
      const end = endOfWeek(endOfMonth(currentMonth));
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(currentMonth);
      const end = endOfWeek(currentMonth);
      return eachDayOfInterval({ start, end });
    }
  }, [currentMonth, view]);

  // Group items by date
  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, RoadmapItem[]>();

    items.forEach(item => {
      if (!item.target_date) return;

      const dateKey = format(new Date(item.target_date), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(item);
    });

    return grouped;
  }, [items]);

  const handlePrevious = () => {
    if (view === 'month') {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else {
      setCurrentMonth(new Date(currentMonth.getTime() - 7 * 24 * 60 * 60 * 1000));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else {
      setCurrentMonth(new Date(currentMonth.getTime() + 7 * 24 * 60 * 60 * 1000));
    }
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const handleDragStart = (item: RoadmapItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (date: Date) => {
    if (!draggedItem) return;

    const newTargetDate = format(date, 'yyyy-MM-dd');

    try {
      const { error } = await supabase
        .from('org_product_roadmap')
        .update({
          target_date: newTargetDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draggedItem.id)
        .eq('org_id', orgId);

      if (error) throw error;

      toast.success('Date updated');
      onUpdate();
    } catch (error: any) {
      console.error('Error updating date:', error);
      toast.error('Failed to update date');
    } finally {
      setDraggedItem(null);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowAddModal(true);
  };

  const getItemsForDate = (date: Date): RoadmapItem[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return itemsByDate.get(dateKey) || [];
  };

  const getLabelColor = (labelIds: string[] | null): string | null => {
    if (!labelIds || labelIds.length === 0) return null;
    const label = labels.find(l => labelIds.includes(l.id));
    return label?.color || null;
  };

  const getMilestoneColor = (milestoneId: string | null): string | null => {
    if (!milestoneId) return null;
    const milestone = milestones.find(m => m.id === milestoneId);
    return milestone?.color || null;
  };

  const isToday = (date: Date) => isSameDay(date, new Date());
  const isCurrentMonth = (date: Date) => isSameMonth(date, currentMonth);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'week'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'month'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="px-2 py-3 text-center text-sm font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className={`grid grid-cols-7 ${view === 'month' ? 'auto-rows-fr' : ''}`}>
          {calendarDays.map((date, index) => {
            const dateItems = getItemsForDate(date);
            const isTodayDate = isToday(date);
            const isCurrentMonthDate = isCurrentMonth(date);

            return (
              <div
                key={index}
                className={`min-h-[100px] border-r border-b border-gray-200 p-2 transition-colors ${
                  !isCurrentMonthDate ? 'bg-gray-50' : 'bg-white hover:bg-blue-50'
                } ${isTodayDate ? 'bg-blue-50' : ''}`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(date)}
                onClick={() => dateItems.length === 0 && handleDateClick(date)}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium ${
                      isTodayDate
                        ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                        : isCurrentMonthDate
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    {format(date, 'd')}
                  </span>
                  {dateItems.length > 3 && (
                    <span className="text-xs text-gray-500 font-medium">
                      +{dateItems.length - 3}
                    </span>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-1">
                  {dateItems.slice(0, 3).map(item => {
                    const labelColor = getLabelColor(item.label_ids);
                    const milestoneColor = getMilestoneColor(item.milestone_id);
                    const accentColor = labelColor || milestoneColor;

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(item)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemClick(item.id);
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium border cursor-pointer hover:shadow-sm transition-all ${
                          STATUS_COLORS[item.status]
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] opacity-60">
                            {PRIORITY_DOTS[item.priority]}
                          </span>
                          <span className="truncate flex-1">{item.title}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <span>• Low</span>
          <span>•• Medium</span>
          <span>••• High</span>
          <span>•••• Critical</span>
        </div>
        <div className="text-gray-500 italic">Drag items to reschedule • Click empty date to create</div>
      </div>

      {/* Add Item Modal */}
      <AddRoadmapItemModal
        orgId={orgId}
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedDate(null);
        }}
        onSuccess={() => {
          onUpdate();
          setSelectedDate(null);
        }}
        initialDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
      />
    </div>
  );
}
