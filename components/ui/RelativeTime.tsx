'use client';

import { useEffect, useState } from 'react';

interface RelativeTimeProps {
  date: string | Date;
  className?: string;
}

export default function RelativeTime({ date, className = '' }: RelativeTimeProps) {
  const [relativeTime, setRelativeTime] = useState('');

  useEffect(() => {
    const updateRelativeTime = () => {
      const now = new Date();
      const then = new Date(date);
      const diffMs = now.getTime() - then.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      const diffWeek = Math.floor(diffDay / 7);
      const diffMonth = Math.floor(diffDay / 30);
      const diffYear = Math.floor(diffDay / 365);

      if (diffSec < 60) {
        setRelativeTime('just now');
      } else if (diffMin < 60) {
        setRelativeTime(`${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`);
      } else if (diffHour < 24) {
        setRelativeTime(`${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`);
      } else if (diffDay < 7) {
        setRelativeTime(`${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`);
      } else if (diffWeek < 4) {
        setRelativeTime(`${diffWeek} ${diffWeek === 1 ? 'week' : 'weeks'} ago`);
      } else if (diffMonth < 12) {
        setRelativeTime(`${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`);
      } else {
        setRelativeTime(`${diffYear} ${diffYear === 1 ? 'year' : 'years'} ago`);
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [date]);

  return <span className={className}>{relativeTime}</span>;
}
