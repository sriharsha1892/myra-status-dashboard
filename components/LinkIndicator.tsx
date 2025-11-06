/**
 * LinkIndicator Component
 * Shows the number of linked items with an indicator icon
 */

'use client';

import { Link as LinkIcon } from 'lucide-react';

interface LinkIndicatorProps {
  linkedCount: number;
  type: 'feature' | 'roadmap';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export default function LinkIndicator({
  linkedCount,
  type,
  size = 'md',
  onClick
}: LinkIndicatorProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (linkedCount === 0) {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 ${sizeClasses[size]} rounded-md border-2 border-dashed border-slate-300 text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all`}
        title={`Link ${type === 'feature' ? 'to roadmap' : 'to features'}`}
      >
        <LinkIcon className={iconSizes[size]} />
        <span className="font-medium">Link</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 ${sizeClasses[size]} rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors`}
      title={`${linkedCount} linked ${type === 'feature' ? 'roadmap items' : 'features'}`}
    >
      <LinkIcon className={iconSizes[size]} />
      <span className="font-semibold">{linkedCount}</span>
      <span className="text-xs opacity-75">
        {linkedCount === 1 ? 'link' : 'links'}
      </span>
    </button>
  );
}
