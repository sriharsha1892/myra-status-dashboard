'use client';

/**
 * LinkIndicator component displays a visual badge showing if an item has linked relationships
 * Used on Feature Request cards and Roadmap item cards to indicate cross-links
 */

interface LinkIndicatorProps {
  linkedCount: number;
  type: 'feature' | 'roadmap';
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const LINK_TYPE_COLORS = {
  feature: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    hover: 'hover:bg-indigo-200',
  },
  roadmap: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    hover: 'hover:bg-blue-200',
  },
};

const SIZE_CONFIG = {
  sm: {
    container: 'px-2 py-1',
    text: 'text-xs',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-3 py-1.5',
    text: 'text-sm',
    icon: 'w-4 h-4',
  },
  lg: {
    container: 'px-4 py-2',
    text: 'text-base',
    icon: 'w-5 h-5',
  },
};

export default function LinkIndicator({
  linkedCount,
  type,
  onClick,
  size = 'md',
}: LinkIndicatorProps) {
  const colors = LINK_TYPE_COLORS[type];
  const config = SIZE_CONFIG[size];

  if (linkedCount === 0) {
    return null;
  }

  const icon = type === 'feature' ? (
    // Roadmap icon for features
    <svg className={config.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ) : (
    // Feature icon for roadmap
    <svg className={config.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 rounded-full font-medium transition-colors
        ${config.container} ${config.text}
        ${colors.bg} ${colors.text} ${onClick ? colors.hover : ''}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
      title={`${linkedCount} linked ${type === 'feature' ? 'roadmap items' : 'features'}`}
    >
      {icon}
      <span>{linkedCount}</span>
    </button>
  );
}
