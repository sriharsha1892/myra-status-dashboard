'use client';

import { memo } from 'react';
import { Flame, Sun, Snowflake, Moon, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type EngagementTier = 'hot' | 'warm' | 'cold' | 'dormant' | null;

interface EngagementTierBadgeProps {
  tier: EngagementTier;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const tierConfig = {
  hot: {
    icon: Flame,
    label: 'Hot',
    description: 'Active in last 3 days, 10+ queries',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
  },
  warm: {
    icon: Sun,
    label: 'Warm',
    description: 'Active in last 7 days, 3+ queries',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500',
  },
  cold: {
    icon: Snowflake,
    label: 'Cold',
    description: 'Active in last 14 days, limited queries',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
  },
  dormant: {
    icon: Moon,
    label: 'Dormant',
    description: 'No activity in 14+ days',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-400',
  },
};

const sizeConfig = {
  sm: {
    badge: 'px-1.5 py-0.5 text-xs gap-1',
    icon: 'w-3 h-3',
  },
  md: {
    badge: 'px-2 py-1 text-sm gap-1.5',
    icon: 'w-4 h-4',
  },
  lg: {
    badge: 'px-3 py-1.5 text-base gap-2',
    icon: 'w-5 h-5',
  },
};

export const EngagementTierBadge = memo(function EngagementTierBadge({
  tier,
  showLabel = true,
  size = 'md',
  className,
}: EngagementTierBadgeProps) {
  if (!tier) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border',
          'bg-gray-50 text-gray-400 border-gray-200',
          sizeConfig[size].badge,
          className
        )}
      >
        <TrendingUp className={cn(sizeConfig[size].icon, 'text-gray-300')} />
        {showLabel && <span>No data</span>}
      </span>
    );
  }

  const config = tierConfig[tier];
  const Icon = config.icon;
  const sizes = sizeConfig[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizes.badge,
        className
      )}
      title={config.description}
    >
      <Icon className={cn(sizes.icon, config.iconColor)} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
});

// Compact version for tables
export const EngagementTierIcon = memo(function EngagementTierIcon({
  tier,
  size = 'md',
  className,
}: Omit<EngagementTierBadgeProps, 'showLabel'>) {
  if (!tier) {
    return (
      <TrendingUp
        className={cn(sizeConfig[size].icon, 'text-gray-300', className)}
        title="No engagement data"
      />
    );
  }

  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <Icon
      className={cn(sizeConfig[size].icon, config.iconColor, className)}
      title={`${config.label}: ${config.description}`}
    />
  );
});

// Detailed card version for org detail pages
interface EngagementTierCardProps {
  tier: EngagementTier;
  totalQueries?: number;
  totalLogins?: number;
  lastActivityDate?: string | null;
  className?: string;
}

export const EngagementTierCard = memo(function EngagementTierCard({
  tier,
  totalQueries = 0,
  totalLogins = 0,
  lastActivityDate,
  className,
}: EngagementTierCardProps) {
  const config = tier ? tierConfig[tier] : null;
  const Icon = config?.icon || TrendingUp;

  const formatLastActivity = (date: string | null) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config ? config.bgColor : 'bg-gray-50',
        config ? config.borderColor : 'border-gray-200',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-5 h-5', config?.iconColor || 'text-gray-400')} />
          <span className={cn('font-semibold', config?.textColor || 'text-gray-600')}>
            {config?.label || 'No Data'}
          </span>
        </div>
        {tier && (
          <span className={cn('text-xs', config?.textColor || 'text-gray-500')}>
            {config?.description}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-gray-900">{totalQueries}</div>
          <div className="text-xs text-gray-500">Queries</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{totalLogins}</div>
          <div className="text-xs text-gray-500">Logins</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">
            {formatLastActivity(lastActivityDate ?? null)}
          </div>
          <div className="text-xs text-gray-500">Last Active</div>
        </div>
      </div>
    </div>
  );
});
