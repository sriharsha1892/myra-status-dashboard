/**
 * QuickStats Component
 * Displays summary statistics for roadmap items
 */

import { useMemo } from 'react';

interface RoadmapItem {
  id: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  blocked_by_ids: string[] | null;
}

interface QuickStatsProps {
  items: RoadmapItem[];
  allItems: RoadmapItem[]; // For calculating blocked count
}

export default function QuickStats({ items, allItems }: QuickStatsProps) {
  const stats = useMemo(() => {
    const total = items.length;
    const planned = items.filter(item => item.status === 'planned').length;
    const inProgress = items.filter(item => item.status === 'in_progress').length;
    const completed = items.filter(item => item.status === 'completed').length;

    // Calculate blocked items (items with active blockers)
    const blocked = items.filter(item => {
      if (!item.blocked_by_ids || item.blocked_by_ids.length === 0) return false;
      const blockers = allItems.filter(i => item.blocked_by_ids?.includes(i.id));
      return blockers.some(blocker => blocker.status !== 'completed');
    }).length;

    return { total, planned, inProgress, completed, blocked };
  }, [items, allItems]);

  const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className={`flex flex-col items-center justify-center px-4 py-3 rounded-lg border ${color} transition-all duration-200 hover:shadow-md`}>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs font-medium text-gray-600 mt-0.5">{label}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      <StatCard
        label="Total"
        value={stats.total}
        color="bg-gray-50 border-gray-200 hover:bg-gray-100"
      />
      <StatCard
        label="Planned"
        value={stats.planned}
        color="bg-blue-50 border-blue-200 hover:bg-blue-100"
      />
      <StatCard
        label="In Progress"
        value={stats.inProgress}
        color="bg-amber-50 border-amber-200 hover:bg-amber-100"
      />
      <StatCard
        label="Completed"
        value={stats.completed}
        color="bg-green-50 border-green-200 hover:bg-green-100"
      />
      <StatCard
        label="Blocked"
        value={stats.blocked}
        color="bg-red-50 border-red-200 hover:bg-red-100"
      />
    </div>
  );
}
