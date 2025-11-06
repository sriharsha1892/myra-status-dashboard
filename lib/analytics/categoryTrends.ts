/**
 * Category Trends Analytics
 * Provides functions to analyze and track support ticket trends by category
 */

import { Database } from '@/lib/supabase/types';

type Ticket = Database['public']['Tables']['tickets']['Row'];

export type Period = '7d' | '30d' | '90d' | 'all';

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface TrendInsight {
  type: 'warning' | 'info' | 'success';
  category: string;
  message: string;
  changePercent: number;
}

interface TrendData {
  date: string;
  [key: string]: number | string;
}

const CATEGORIES = [
  'General Inquiry',
  'Technical Issue',
  'Billing',
  'Feature Request',
  'Account',
  'Other'
];

const CATEGORY_COLORS: Record<string, string> = {
  'General Inquiry': '#3b82f6',
  'Technical Issue': '#ef4444',
  'Billing': '#10b981',
  'Feature Request': '#8b5cf6',
  'Account': '#f59e0b',
  'Other': '#6b7280'
};

export function getCategories(): string[] {
  return CATEGORIES;
}

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#6b7280';
}

/**
 * Calculate weekly statistics for tickets by category
 */
export function calculateWeeklyStats(
  tickets: Ticket[],
  period: Period = '30d'
): CategoryStats[] {
  const now = new Date();
  const periodDays = getPeriodDays(period);
  const cutoffDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const halfwayDate = new Date(now.getTime() - (periodDays / 2) * 24 * 60 * 60 * 1000);

  // Filter tickets for the period
  const periodTickets = tickets.filter(t => new Date(t.created_at) >= cutoffDate);
  const recentTickets = periodTickets.filter(t => new Date(t.created_at) >= halfwayDate);
  const olderTickets = periodTickets.filter(t => new Date(t.created_at) < halfwayDate);

  // Count by category
  const categoryCounts: Record<string, number> = {};
  const recentCounts: Record<string, number> = {};
  const olderCounts: Record<string, number> = {};

  CATEGORIES.forEach(cat => {
    categoryCounts[cat] = 0;
    recentCounts[cat] = 0;
    olderCounts[cat] = 0;
  });

  periodTickets.forEach(ticket => {
    const cat = ticket.category || 'Other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  recentTickets.forEach(ticket => {
    const cat = ticket.category || 'Other';
    recentCounts[cat] = (recentCounts[cat] || 0) + 1;
  });

  olderTickets.forEach(ticket => {
    const cat = ticket.category || 'Other';
    olderCounts[cat] = (olderCounts[cat] || 0) + 1;
  });

  const total = periodTickets.length;

  return CATEGORIES.map(category => {
    const count = categoryCounts[category] || 0;
    const recent = recentCounts[category] || 0;
    const older = olderCounts[category] || 0;

    const changePercent = older > 0 ? ((recent - older) / older) * 100 : 0;
    const trend = changePercent > 10 ? 'up' : changePercent < -10 ? 'down' : 'stable';

    return {
      category,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      trend,
      changePercent
    };
  });
}

/**
 * Generate insights from category trends
 */
export function generateInsights(stats: CategoryStats[]): TrendInsight[] {
  const insights: TrendInsight[] = [];

  stats.forEach(stat => {
    if (stat.trend === 'up' && stat.changePercent > 30) {
      insights.push({
        type: 'warning',
        category: stat.category,
        message: `${stat.category} tickets increased by ${stat.changePercent.toFixed(1)}%`,
        changePercent: stat.changePercent
      });
    } else if (stat.trend === 'down' && stat.changePercent < -30) {
      insights.push({
        type: 'success',
        category: stat.category,
        message: `${stat.category} tickets decreased by ${Math.abs(stat.changePercent).toFixed(1)}%`,
        changePercent: stat.changePercent
      });
    } else if (stat.percentage > 40) {
      insights.push({
        type: 'info',
        category: stat.category,
        message: `${stat.category} represents ${stat.percentage.toFixed(1)}% of all tickets`,
        changePercent: stat.changePercent
      });
    }
  });

  return insights.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

/**
 * Calculate trend data over time for charts
 */
export function calculateTrends(
  tickets: Ticket[],
  period: Period = '30d'
): TrendData[] {
  const periodDays = getPeriodDays(period);
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const periodTickets = tickets.filter(t => new Date(t.created_at) >= cutoffDate);

  // Group tickets by date and category
  const dataByDate: Record<string, Record<string, number>> = {};

  // Initialize all dates
  for (let i = 0; i < periodDays; i++) {
    const date = new Date(cutoffDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().split('T')[0];
    dataByDate[dateKey] = {};
    CATEGORIES.forEach(cat => {
      dataByDate[dateKey][cat] = 0;
    });
  }

  // Count tickets
  periodTickets.forEach(ticket => {
    const dateKey = new Date(ticket.created_at).toISOString().split('T')[0];
    const category = ticket.category || 'Other';
    if (dataByDate[dateKey]) {
      dataByDate[dateKey][category] = (dataByDate[dateKey][category] || 0) + 1;
    }
  });

  // Convert to array format
  return Object.entries(dataByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, categories]) => ({
      date,
      ...categories
    }));
}

/**
 * Export trends data to CSV format
 */
export function exportTrendsCSV(stats: CategoryStats[]): string {
  const headers = ['Category', 'Count', 'Percentage', 'Trend', 'Change (%)'];
  const rows = stats.map(stat => [
    stat.category,
    stat.count.toString(),
    stat.percentage.toFixed(2),
    stat.trend,
    stat.changePercent.toFixed(2)
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

/**
 * Trigger download of CSV file
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
}

/**
 * Helper to convert period to days
 */
function getPeriodDays(period: Period): number {
  switch (period) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case 'all':
      return 365 * 2; // 2 years for 'all'
    default:
      return 30;
  }
}
