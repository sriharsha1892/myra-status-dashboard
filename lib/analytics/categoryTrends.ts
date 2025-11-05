import { Database } from '@/lib/supabase/types';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, isWithinInterval } from 'date-fns';

type Ticket = Database['public']['Tables']['tickets']['Row'];

export interface TrendData {
  date: string; // "Jan 1" or "Week 1"
  [category: string]: number | string; // Category counts
}

export interface CategoryStats {
  category: string;
  thisWeek: number;
  lastWeek: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TrendInsight {
  type: 'growing' | 'active' | 'declining';
  message: string;
}

export type Period = '7d' | '30d' | '90d' | 'all';

/**
 * Get tickets within a specific time period
 */
function filterTicketsByPeriod(tickets: Ticket[], period: Period): Ticket[] {
  if (period === 'all') return tickets;

  const now = new Date();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const startDate = subDays(now, days);

  return tickets.filter((ticket) => {
    const ticketDate = new Date(ticket.created_at);
    return ticketDate >= startDate;
  });
}

/**
 * Calculate trends grouped by category and time period
 */
export function calculateTrends(tickets: Ticket[], period: Period): TrendData[] {
  const filteredTickets = filterTicketsByPeriod(tickets, period);

  // Use daily data for 7d, weekly for others
  if (period === '7d') {
    return getDailyData(filteredTickets);
  } else {
    return getWeeklyData(filteredTickets);
  }
}

/**
 * Group tickets by day and category
 */
export function getDailyData(tickets: Ticket[]): TrendData[] {
  if (tickets.length === 0) return [];

  const now = new Date();
  const startDate = subDays(now, 6); // Last 7 days

  // Create array of all days
  const days = eachDayOfInterval({ start: startDate, end: now });

  // Get all unique categories
  const categories = Array.from(new Set(tickets.map((t) => t.category)));

  // Initialize data structure
  const trendData: TrendData[] = days.map((day) => ({
    date: format(day, 'MMM dd'),
  }));

  // Count tickets per day per category
  tickets.forEach((ticket) => {
    const ticketDate = new Date(ticket.created_at);
    const dayIndex = days.findIndex(
      (day) => format(day, 'yyyy-MM-dd') === format(ticketDate, 'yyyy-MM-dd')
    );

    if (dayIndex >= 0) {
      const category = ticket.category;
      trendData[dayIndex][category] = ((trendData[dayIndex][category] as number) || 0) + 1;
    }
  });

  // Ensure all categories exist in all days (with 0 if no tickets)
  categories.forEach((category) => {
    trendData.forEach((day) => {
      if (!(category in day)) {
        day[category] = 0;
      }
    });
  });

  return trendData;
}

/**
 * Group tickets by week and category
 */
export function getWeeklyData(tickets: Ticket[]): TrendData[] {
  if (tickets.length === 0) return [];

  const now = new Date();
  const oldestTicket = tickets.reduce((oldest, ticket) => {
    const ticketDate = new Date(ticket.created_at);
    return ticketDate < oldest ? ticketDate : oldest;
  }, new Date());

  // Get all weeks in the period
  const weeks = eachWeekOfInterval(
    { start: oldestTicket, end: now },
    { weekStartsOn: 1 } // Monday
  );

  // Get all unique categories
  const categories = Array.from(new Set(tickets.map((t) => t.category)));

  // Initialize data structure
  const trendData: TrendData[] = weeks.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    return {
      date: `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd')}`,
    };
  });

  // Count tickets per week per category
  tickets.forEach((ticket) => {
    const ticketDate = new Date(ticket.created_at);

    weeks.forEach((weekStart, index) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      if (isWithinInterval(ticketDate, { start: weekStart, end: weekEnd })) {
        const category = ticket.category;
        trendData[index][category] = ((trendData[index][category] as number) || 0) + 1;
      }
    });
  });

  // Ensure all categories exist in all weeks (with 0 if no tickets)
  categories.forEach((category) => {
    trendData.forEach((week) => {
      if (!(category in week)) {
        week[category] = 0;
      }
    });
  });

  return trendData;
}

/**
 * Calculate weekly statistics for each category
 */
export function calculateWeeklyStats(tickets: Ticket[]): CategoryStats[] {
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subDays(thisWeekStart, 7), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subDays(thisWeekStart, 7), { weekStartsOn: 1 });

  // Get tickets for this week and last week
  const thisWeekTickets = tickets.filter((ticket) => {
    const ticketDate = new Date(ticket.created_at);
    return isWithinInterval(ticketDate, { start: thisWeekStart, end: thisWeekEnd });
  });

  const lastWeekTickets = tickets.filter((ticket) => {
    const ticketDate = new Date(ticket.created_at);
    return isWithinInterval(ticketDate, { start: lastWeekStart, end: lastWeekEnd });
  });

  // Get all unique categories
  const categories = Array.from(new Set([...tickets.map((t) => t.category)]));

  // Calculate stats for each category
  const stats: CategoryStats[] = categories.map((category) => {
    const thisWeek = thisWeekTickets.filter((t) => t.category === category).length;
    const lastWeek = lastWeekTickets.filter((t) => t.category === category).length;
    const change = calculateGrowth(thisWeek, lastWeek);

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(change) < 5) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    return {
      category,
      thisWeek,
      lastWeek,
      changePercent: change,
      trend,
    };
  });

  // Sort by this week count (descending)
  return stats.sort((a, b) => b.thisWeek - a.thisWeek);
}

/**
 * Calculate percentage change between current and previous values
 */
export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Generate insights from category statistics
 */
export function generateInsights(stats: CategoryStats[]): TrendInsight[] {
  const insights: TrendInsight[] = [];

  if (stats.length === 0) return insights;

  // Find top growing category (with at least 2 tickets this week)
  const growing = stats
    .filter((s) => s.thisWeek >= 2 && s.trend === 'up')
    .sort((a, b) => b.changePercent - a.changePercent);

  if (growing.length > 0) {
    const top = growing[0];
    insights.push({
      type: 'growing',
      message: `Top growing category: ${top.category} ${top.changePercent > 0 ? '+' : ''}${top.changePercent}%`,
    });
  }

  // Find most active category
  const mostActive = stats[0]; // Already sorted by thisWeek count
  if (mostActive && mostActive.thisWeek > 0) {
    insights.push({
      type: 'active',
      message: `Most active: ${mostActive.category} (${mostActive.thisWeek} tickets)`,
    });
  }

  // Find trending down category (with significant decrease)
  const declining = stats
    .filter((s) => s.trend === 'down' && s.lastWeek >= 2)
    .sort((a, b) => a.changePercent - b.changePercent);

  if (declining.length > 0) {
    const top = declining[0];
    insights.push({
      type: 'declining',
      message: `Trending down: ${top.category} ${top.changePercent}%`,
    });
  }

  return insights.slice(0, 3); // Max 3 insights
}

/**
 * Export trends data to CSV format
 */
export function exportTrendsCSV(stats: CategoryStats[]): string {
  // CSV header
  let csv = 'Category,This Week,Last Week,Change %,Trend\n';

  // Add data rows
  stats.forEach((stat) => {
    const arrow = stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '→';
    const changeStr = stat.changePercent > 0 ? `+${stat.changePercent}%` : `${stat.changePercent}%`;
    csv += `${stat.category},${stat.thisWeek},${stat.lastWeek},${changeStr},${arrow}\n`;
  });

  return csv;
}

/**
 * Trigger CSV download in browser
 */
export function downloadCSV(csv: string, filename: string = 'category-trends.csv'): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Get all unique categories from tickets
 */
export function getCategories(tickets: Ticket[]): string[] {
  return Array.from(new Set(tickets.map((t) => t.category))).sort();
}

/**
 * Get color for a specific category
 */
export function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    'Security': '#8B5CF6',
    'Tool Functioning': '#3B82F6',
    'Performance': '#EF4444',
    'Feature Request': '#10B981',
    'Data Quality': '#F97316',
    'Integration': '#06B6D4',
    'Authentication': '#EC4899',
    'Bug': '#F43F5E',
    'Documentation': '#14B8A6',
    'Other': '#6B7280',
  };

  return colorMap[category] || '#9CA3AF'; // Default gray
}
