'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';

interface RelativeTimeProps {
  date: string | Date;
  className?: string;
  includeSeconds?: boolean;
  addSuffix?: boolean;
}

/**
 * Displays relative time with smart formatting and absolute time on hover
 *
 * Examples:
 * - < 1 hour: "23 minutes ago"
 * - < 24 hours: "5 hours ago"
 * - Today: "Today at 3:45 PM"
 * - Yesterday: "Yesterday at 2:30 PM"
 * - < 7 days: "3 days ago"
 * - < 30 days: "Last week (Jan 8)"
 * - > 30 days: "Jan 15, 2025"
 *
 * Hover shows: "January 15, 2025 at 3:45 PM"
 */
export default function RelativeTime({
  date,
  className = '',
  includeSeconds = false,
  addSuffix = true
}: RelativeTimeProps) {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!date || !mounted) {
    return <span className={className}>-</span>;
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return <span className={className}>Invalid date</span>;
  }

  const now = new Date();
  const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);

  let displayText: string;

  if (diffInHours < 1) {
    // Less than 1 hour: "23 minutes ago"
    displayText = formatDistanceToNow(dateObj, { addSuffix, includeSeconds });
  } else if (diffInHours < 24) {
    // Less than 24 hours: "5 hours ago"
    displayText = formatDistanceToNow(dateObj, { addSuffix });
  } else if (isToday(dateObj)) {
    // Today: "Today at 3:45 PM"
    displayText = `Today at ${format(dateObj, 'h:mm a')}`;
  } else if (isYesterday(dateObj)) {
    // Yesterday: "Yesterday at 2:30 PM"
    displayText = `Yesterday at ${format(dateObj, 'h:mm a')}`;
  } else if (isThisWeek(dateObj)) {
    // This week: "3 days ago"
    displayText = formatDistanceToNow(dateObj, { addSuffix });
  } else if (diffInHours < 720) {
    // Less than 30 days: "Last week (Jan 8)" or "2 weeks ago"
    const relativeTime = formatDistanceToNow(dateObj, { addSuffix });
    const shortDate = format(dateObj, 'MMM d');
    displayText = `${relativeTime} (${shortDate})`;
  } else if (isThisYear(dateObj)) {
    // This year: "Jan 15"
    displayText = format(dateObj, 'MMM d');
  } else {
    // Older: "Jan 15, 2025"
    displayText = format(dateObj, 'MMM d, yyyy');
  }

  // Absolute time for tooltip
  const absoluteTime = format(dateObj, 'MMMM d, yyyy \'at\' h:mm a');

  return (
    <time
      dateTime={dateObj.toISOString()}
      title={absoluteTime}
      className={`cursor-help ${className}`}
    >
      {displayText}
    </time>
  );
}
