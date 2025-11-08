'use client';

import { useState } from 'react';
import { ExternalLink, MessageCircle, Trash2, Edit, Link as LinkIcon } from 'lucide-react';
import RelativeTime from '@/components/ui/RelativeTime';

interface ResourceCardProps {
  id: string;
  title: string;
  description?: string;
  linkUrl: string;
  linkType: 'onedrive' | 'google_drive' | 'external';
  categoryName?: string;
  categoryColor?: string;
  tags?: string[];
  createdAt: string;
  createdByName?: string;
  isOrgSpecific: boolean;
  onAddNote?: (resourceId: string) => void;
  onEdit?: (resourceId: string) => void;
  onDelete?: (resourceId: string) => void;
}

const LINK_TYPE_CONFIG = {
  onedrive: { label: 'OneDrive', color: 'bg-blue-500/20 text-blue-600' },
  google_drive: { label: 'Google Drive', color: 'bg-green-500/20 text-green-600' },
  external: { label: 'External Link', color: 'bg-purple-500/20 text-purple-600' },
};

// Category color mappings (Tailwind JIT-safe)
const CATEGORY_COLORS: Record<string, {
  hoverGradient: string;
  overlayGradient: string;
  badge: string;
  text: string;
  border: string;
}> = {
  blue: {
    hoverGradient: 'from-blue-400/40 via-purple-400/40 to-pink-400/40',
    overlayGradient: 'from-blue-500/5',
    badge: 'bg-blue-500/20',
    text: 'text-blue-700',
    border: 'border-blue-500/30'
  },
  purple: {
    hoverGradient: 'from-purple-400/40 via-blue-400/40 to-pink-400/40',
    overlayGradient: 'from-purple-500/5',
    badge: 'bg-purple-500/20',
    text: 'text-purple-700',
    border: 'border-purple-500/30'
  },
  green: {
    hoverGradient: 'from-green-400/40 via-emerald-400/40 to-teal-400/40',
    overlayGradient: 'from-green-500/5',
    badge: 'bg-green-500/20',
    text: 'text-green-700',
    border: 'border-green-500/30'
  },
  yellow: {
    hoverGradient: 'from-yellow-400/40 via-orange-400/40 to-amber-400/40',
    overlayGradient: 'from-yellow-500/5',
    badge: 'bg-yellow-500/20',
    text: 'text-yellow-700',
    border: 'border-yellow-500/30'
  },
  red: {
    hoverGradient: 'from-red-400/40 via-rose-400/40 to-pink-400/40',
    overlayGradient: 'from-red-500/5',
    badge: 'bg-red-500/20',
    text: 'text-red-700',
    border: 'border-red-500/30'
  },
  indigo: {
    hoverGradient: 'from-indigo-400/40 via-purple-400/40 to-blue-400/40',
    overlayGradient: 'from-indigo-500/5',
    badge: 'bg-indigo-500/20',
    text: 'text-indigo-700',
    border: 'border-indigo-500/30'
  },
  slate: {
    hoverGradient: 'from-slate-400/40 via-gray-400/40 to-zinc-400/40',
    overlayGradient: 'from-slate-500/5',
    badge: 'bg-slate-500/20',
    text: 'text-slate-700',
    border: 'border-slate-500/30'
  },
  emerald: {
    hoverGradient: 'from-emerald-400/40 via-green-400/40 to-teal-400/40',
    overlayGradient: 'from-emerald-500/5',
    badge: 'bg-emerald-500/20',
    text: 'text-emerald-700',
    border: 'border-emerald-500/30'
  }
};

export default function ResourceCard({
  id,
  title,
  description,
  linkUrl,
  linkType,
  categoryName,
  categoryColor = 'blue',
  tags = [],
  createdAt,
  createdByName,
  isOrgSpecific,
  onAddNote,
  onEdit,
  onDelete,
}: ResourceCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const linkConfig = LINK_TYPE_CONFIG[linkType];
  const colors = CATEGORY_COLORS[categoryColor] || CATEGORY_COLORS['blue'];

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glassmorphism Card Container with Gradient Border */}
      <div className="relative overflow-hidden rounded-2xl">
        {/* Animated gradient border */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colors.hoverGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm`}
          style={{
            transform: isHovered ? 'scale(1.02)' : 'scale(1)',
            transition: 'transform 0.5s ease-out',
          }}
        />

        {/* Main glass card */}
        <div className="relative backdrop-blur-xl bg-white/80 dark:bg-slate-900/60 border border-white/20 rounded-2xl p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1">
          {/* Gradient overlay on hover */}
          <div
            className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colors.overlayGradient} via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
          />

          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                  {title}
                </h3>
                {categoryName && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm ${colors.badge} ${colors.text} border ${colors.border}`}
                    >
                      {categoryName}
                    </span>
                    {isOrgSpecific && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm bg-orange-500/20 text-orange-700 border border-orange-500/30">
                        Org-Specific
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Link type badge */}
              <div
                className={`flex-shrink-0 ml-3 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm ${linkConfig.color} border border-current/20`}
              >
                {linkConfig.label}
              </div>
            </div>

            {/* Description */}
            {description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
                {description}
              </p>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium backdrop-blur-sm bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 hover:bg-slate-500/20 transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
              <div className="flex flex-col gap-0.5">
                {createdByName && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Added by {createdByName}
                  </p>
                )}
                <RelativeTime
                  date={createdAt}
                  className="text-xs text-slate-400 dark:text-slate-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {/* Open link */}
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg backdrop-blur-sm bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 transition-all hover:scale-110"
                  title="Open resource"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                {/* Add note */}
                {onAddNote && (
                  <button
                    onClick={() => onAddNote(id)}
                    className="p-2 rounded-lg backdrop-blur-sm bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 transition-all hover:scale-110"
                    title="Add note"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}

                {/* Edit */}
                {onEdit && (
                  <button
                    onClick={() => onEdit(id)}
                    className="p-2 rounded-lg backdrop-blur-sm bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 border border-slate-500/20 hover:border-slate-500/40 transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                    title="Edit resource"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}

                {/* Delete */}
                {onDelete && (
                  <button
                    onClick={() => onDelete(id)}
                    className="p-2 rounded-lg backdrop-blur-sm bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                    title="Delete resource"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Floating particles effect on hover */}
          {isHovered && (
            <>
              <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 animate-ping opacity-75" />
              <div className="absolute bottom-8 left-8 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse opacity-50" />
              <div className="absolute top-1/2 right-8 w-1 h-1 rounded-full bg-gradient-to-r from-pink-400 to-blue-400 animate-bounce opacity-60" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
