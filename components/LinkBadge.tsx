'use client';

/**
 * LinkBadge component displays detailed information about a specific link relationship
 * Shows the link type with color coding and can be clicked to view/edit details
 */

interface LinkBadgeProps {
  linkType: 'implements' | 'addresses' | 'related_to' | 'blocks' | 'blocked_by';
  count?: number;
  onClick?: () => void;
  compact?: boolean;
  showLabel?: boolean;
}

const LINK_TYPE_CONFIG = {
  implements: {
    icon: '✓',
    label: 'Implements',
    bg: 'bg-green-100',
    text: 'text-green-800',
    hover: 'hover:bg-green-200',
    description: 'Implements this item',
  },
  addresses: {
    icon: '→',
    label: 'Addresses',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    hover: 'hover:bg-blue-200',
    description: 'Addresses this item',
  },
  related_to: {
    icon: '~',
    label: 'Related',
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    hover: 'hover:bg-yellow-200',
    description: 'Related to this item',
  },
  blocks: {
    icon: '⊢',
    label: 'Blocks',
    bg: 'bg-red-100',
    text: 'text-red-800',
    hover: 'hover:bg-red-200',
    description: 'Blocks this item',
  },
  blocked_by: {
    icon: '⊣',
    label: 'Blocked By',
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    hover: 'hover:bg-orange-200',
    description: 'Blocked by this item',
  },
};

export default function LinkBadge({
  linkType,
  count = 1,
  onClick,
  compact = false,
  showLabel = true,
}: LinkBadgeProps) {
  const config = LINK_TYPE_CONFIG[linkType];

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`
          inline-flex items-center justify-center w-6 h-6 rounded-full
          font-bold text-xs transition-colors
          ${config.bg} ${config.text} ${onClick ? config.hover : ''}
          ${onClick ? 'cursor-pointer' : 'cursor-default'}
        `}
        title={config.description}
      >
        {config.icon}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full
        font-medium text-sm transition-colors
        ${config.bg} ${config.text} ${onClick ? config.hover : ''}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
      title={config.description}
    >
      <span className="font-bold text-base">{config.icon}</span>
      {showLabel && (
        <>
          <span>{config.label}</span>
          {count > 1 && <span className="text-xs opacity-75">({count})</span>}
        </>
      )}
    </button>
  );
}
