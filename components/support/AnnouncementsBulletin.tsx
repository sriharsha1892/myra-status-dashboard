'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Megaphone, Sparkles, AlertTriangle, Info, ChevronRight, X } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: 'feature' | 'update' | 'maintenance' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'critical';
  posted_by: string;
  created_at: string;
}

interface AnnouncementsBulletinProps {
  role?: string;
}

export default function AnnouncementsBulletin({ role }: AnnouncementsBulletinProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchAnnouncements();

    // Load dismissed announcements from localStorage
    const dismissedIds = localStorage.getItem('dismissedAnnouncements');
    if (dismissedIds) {
      setDismissed(new Set(JSON.parse(dismissedIds)));
    }
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('status', 'active')
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAnnouncement = (id: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(id);
    setDismissed(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(Array.from(newDismissed)));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'feature':
        return <Sparkles className="w-4 h-4" strokeWidth={1.5} />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />;
      case 'maintenance':
        return <Info className="w-4 h-4" strokeWidth={1.5} />;
      default:
        return <Megaphone className="w-4 h-4" strokeWidth={1.5} />;
    }
  };

  const getTypeColor = (type: string, priority: string) => {
    if (priority === 'critical') {
      return {
        bg: 'from-red-50 via-white to-pink-50',
        border: 'border-red-200',
        iconBg: 'bg-red-100',
        iconText: 'text-red-600',
        badge: 'bg-red-100 text-red-700 border-red-200'
      };
    }
    if (priority === 'high') {
      return {
        bg: 'from-amber-50 via-white to-orange-50',
        border: 'border-amber-200',
        iconBg: 'bg-amber-100',
        iconText: 'text-amber-600',
        badge: 'bg-amber-100 text-amber-700 border-amber-200'
      };
    }

    switch (type) {
      case 'feature':
        return {
          bg: 'from-blue-50 via-white to-indigo-50',
          border: 'border-blue-200',
          iconBg: 'bg-blue-100',
          iconText: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      case 'alert':
        return {
          bg: 'from-amber-50 via-white to-orange-50',
          border: 'border-amber-200',
          iconBg: 'bg-amber-100',
          iconText: 'text-amber-600',
          badge: 'bg-amber-100 text-amber-700 border-amber-200'
        };
      case 'maintenance':
        return {
          bg: 'from-slate-50 via-white to-gray-50',
          border: 'border-slate-200',
          iconBg: 'bg-slate-100',
          iconText: 'text-slate-600',
          badge: 'bg-slate-100 text-slate-700 border-slate-200'
        };
      default:
        return {
          bg: 'from-purple-50 via-white to-pink-50',
          border: 'border-purple-200',
          iconBg: 'bg-purple-100',
          iconText: 'text-purple-600',
          badge: 'bg-purple-100 text-purple-700 border-purple-200'
        };
    }
  };

  const visibleAnnouncements = announcements.filter(a => !dismissed.has(a.id));

  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <Megaphone className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
          </div>
          <h2 className="text-xs font-semibold text-slate-900">What's New</h2>
        </div>
        {role === 'admin' && (
          <button
            onClick={() => router.push('/support/admin/announcements')}
            className="flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Manage
            <ChevronRight className="w-3 h-3" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Announcements */}
      <div className="space-y-2">
        {visibleAnnouncements.map((announcement) => {
          const colors = getTypeColor(announcement.announcement_type, announcement.priority);

          return (
            <div
              key={announcement.id}
              className={`relative bg-gradient-to-br ${colors.bg} rounded-lg border ${colors.border} p-3 transition-all duration-200 hover:shadow-md group`}
            >
              {/* Dismiss button */}
              <button
                onClick={() => dismissAnnouncement(announcement.id)}
                className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-white/50 rounded transition-all"
              >
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" strokeWidth={2} />
              </button>

              <div className="flex items-start gap-2">
                {/* Icon */}
                <div className={`${colors.iconBg} rounded-lg p-1.5 flex items-center justify-center flex-shrink-0`}>
                  <div className={colors.iconText}>
                    {getIcon(announcement.announcement_type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                      {announcement.title}
                    </h3>
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide border rounded ${colors.badge}`}>
                      {announcement.announcement_type}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed mb-1.5">
                    {announcement.content}
                  </p>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}</span>
                    {announcement.priority !== 'normal' && (
                      <>
                        <span>•</span>
                        <span className="font-medium capitalize">{announcement.priority} Priority</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
