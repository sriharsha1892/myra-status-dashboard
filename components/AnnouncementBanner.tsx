'use client';

import React, { useEffect, useState } from 'react';
import { formatShortGMT } from '@/lib/time-utils';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'maintenance';
  active: boolean;
  createdAt: string;
  createdBy?: string;
  expiresAt?: string;
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load dismissed announcements from localStorage
    const dismissed = localStorage.getItem('dismissed_announcements');
    if (dismissed) {
      setDismissedIds(new Set(JSON.parse(dismissed)));
    }

    // Fetch active announcements
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements');
      const data = await response.json();
      if (data.success) {
        setAnnouncements(data.announcements);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (id: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissed_announcements', JSON.stringify(Array.from(newDismissed)));
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'info':
        return {
          bg: 'rgba(59, 130, 246, 0.15)',
          border: 'rgba(59, 130, 246, 0.4)',
          badge: '#3b82f6',
          icon: '9',
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.4)',
          badge: '#f59e0b',
          icon: ' ',
        };
      case 'success':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.4)',
          badge: '#10b981',
          icon: '',
        };
      case 'maintenance':
        return {
          bg: 'rgba(139, 92, 246, 0.15)',
          border: 'rgba(139, 92, 246, 0.4)',
          badge: '#8b5cf6',
          icon: '='',
        };
      default:
        return {
          bg: 'rgba(107, 114, 128, 0.15)',
          border: 'rgba(107, 114, 128, 0.4)',
          badge: '#6b7280',
          icon: '=â',
        };
    }
  };

  const visibleAnnouncements = announcements.filter((ann) => !dismissedIds.has(ann.id));

  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
      {visibleAnnouncements.map((announcement) => {
        const style = getTypeStyle(announcement.type);

        return (
          <div
            key={announcement.id}
            style={{
              background: style.bg,
              border: `1px solid ${style.border}`,
              borderRadius: '12px',
              padding: '16px 20px',
              position: 'relative',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              {/* Icon */}
              <div
                style={{
                  fontSize: '20px',
                  lineHeight: '1',
                  flexShrink: 0,
                }}
              >
                {style.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                {/* Title & Type Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    {announcement.title}
                  </h3>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '3px 6px',
                      borderRadius: '4px',
                      background: style.badge,
                      color: '#ffffff',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {announcement.type}
                  </span>
                </div>

                {/* Message */}
                <p
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.85)',
                    margin: '0 0 8px 0',
                    lineHeight: '1.5',
                  }}
                >
                  {announcement.message}
                </p>

                {/* Metadata */}
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>Posted: {formatShortGMT(announcement.createdAt)}</span>
                  {announcement.expiresAt && (
                    <>
                      <span>"</span>
                      <span>Expires: {formatShortGMT(announcement.expiresAt)}</span>
                    </>
                  )}
                  {announcement.createdBy && (
                    <>
                      <span>"</span>
                      <span>By: {announcement.createdBy}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={() => handleDismiss(announcement.id)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
