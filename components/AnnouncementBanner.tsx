'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  type: 'feature' | 'update' | 'maintenance' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: string;
  title: string;
  message: string;
  created_at: string;
  updated_at: string;
}

interface AnnouncementBannerProps {
  announcements: Announcement[];
}

// Type-based styling configuration
const TYPE_CONFIG = {
  feature: {
    bgClass: 'bg-purple-500/15',
    borderClass: 'border-purple-500/40',
    badgeClass: 'bg-purple-500',
    icon: '✨',
    label: 'New Feature',
  },
  update: {
    bgClass: 'bg-blue-500/15',
    borderClass: 'border-blue-500/40',
    badgeClass: 'bg-blue-500',
    icon: '📦',
    label: 'Update',
  },
  maintenance: {
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/40',
    badgeClass: 'bg-amber-500',
    icon: '🔧',
    label: 'Maintenance',
  },
  alert: {
    bgClass: 'bg-red-500/15',
    borderClass: 'border-red-500/40',
    badgeClass: 'bg-red-500',
    icon: '⚠️',
    label: 'Alert',
  },
} as const;

// Priority-based accent styling
const PRIORITY_STYLES = {
  critical: 'ring-2 ring-red-500/50',
  high: 'ring-1 ring-orange-500/40',
  normal: '',
  low: 'opacity-90',
} as const;

// Single announcement card
function AnnouncementCard({
  announcement,
  onDismiss,
}: {
  announcement: Announcement;
  onDismiss: () => void;
}) {
  const config = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.update;
  const priorityStyle = PRIORITY_STYLES[announcement.priority] || '';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'GMT',
    }) + ' GMT';
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 backdrop-blur-xl p-4 sm:p-5',
        'transition-all duration-300 animate-fade-in',
        config.bgClass,
        config.borderClass,
        priorityStyle
      )}
    >
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className={cn(
          'absolute top-3 right-3 w-6 h-6 rounded-full',
          'flex items-center justify-center',
          'text-white/40 hover:text-white/80',
          'bg-white/5 hover:bg-white/15',
          'transition-all duration-200'
        )}
        aria-label="Dismiss announcement"
      >
        ×
      </button>

      <div className="flex items-start gap-3 pr-6">
        {/* Icon */}
        <span className="text-xl flex-shrink-0">{config.icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="text-sm font-bold text-white">{announcement.title}</h3>
            <span
              className={cn(
                'text-[9px] font-extrabold px-2 py-0.5 rounded text-white uppercase tracking-wider',
                config.badgeClass
              )}
            >
              {config.label}
            </span>
            {announcement.priority === 'critical' && (
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-red-600 text-white uppercase tracking-wider animate-pulse">
                Critical
              </span>
            )}
            {announcement.priority === 'high' && (
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-orange-500 text-white uppercase tracking-wider">
                High Priority
              </span>
            )}
          </div>

          {/* Message */}
          <p className="text-[13px] text-white/85 leading-relaxed mb-2">
            {announcement.message}
          </p>

          {/* Timestamp */}
          <div className="text-[11px] text-white/50">
            Posted: {formatDate(announcement.created_at)}
            {announcement.updated_at !== announcement.created_at && (
              <span> • Updated: {formatDate(announcement.updated_at)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementBanner({ announcements }: AnnouncementBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Load dismissed announcements from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dismissedAnnouncements');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Only keep dismissals that are less than 24 hours old
          const now = Date.now();
          const validDismissals = Object.entries(parsed)
            .filter(([_, timestamp]) => now - (timestamp as number) < 24 * 60 * 60 * 1000)
            .map(([id]) => id);
          setDismissedIds(new Set(validDismissals));
        } catch (e) {
          // Invalid stored data, reset
          localStorage.removeItem('dismissedAnnouncements');
        }
      }
    }
  }, []);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);

      // Save to localStorage with timestamp
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('dismissedAnnouncements');
        const parsed = stored ? JSON.parse(stored) : {};
        parsed[id] = Date.now();
        localStorage.setItem('dismissedAnnouncements', JSON.stringify(parsed));
      }

      return newSet;
    });
  };

  // Filter out dismissed announcements
  const visibleAnnouncements = announcements.filter((a) => !dismissedIds.has(a.id));

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {visibleAnnouncements.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          onDismiss={() => handleDismiss(announcement.id)}
        />
      ))}
    </div>
  );
}
