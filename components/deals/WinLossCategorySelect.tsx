'use client';

import { memo, useMemo } from 'react';
import {
  Trophy,
  Users,
  TrendingUp,
  Mail,
  Phone,
  Handshake,
  Building2,
  UserMinus,
  Wallet,
  Clock,
  HelpCircle,
  Puzzle,
  AlertTriangle,
  DollarSign,
  Swords,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectItem } from '@/components/ui/select';
import { LOSS_CATEGORIES, WIN_CATEGORIES } from '@/lib/validation/schemas/trialOrganization';

type LossCategory = (typeof LOSS_CATEGORIES)[number];
type WinCategory = (typeof WIN_CATEGORIES)[number];

interface CategoryConfig {
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
}

const lossCategoryConfig: Record<LossCategory, CategoryConfig> = {
  competitor_won: {
    icon: Swords,
    label: 'Lost to Competitor',
    description: 'Prospect chose a competing solution',
    color: 'text-red-600',
  },
  budget_constraints: {
    icon: Wallet,
    label: 'Budget Constraints',
    description: 'Insufficient budget or spending freeze',
    color: 'text-amber-600',
  },
  no_decision: {
    icon: HelpCircle,
    label: 'No Decision',
    description: 'Prospect went dark or delayed indefinitely',
    color: 'text-gray-500',
  },
  timing_not_right: {
    icon: Clock,
    label: 'Timing Not Right',
    description: 'Not the right time, may revisit later',
    color: 'text-blue-500',
  },
  product_fit: {
    icon: Puzzle,
    label: 'Product Fit',
    description: 'Missing features or capability gaps',
    color: 'text-orange-500',
  },
  champion_left: {
    icon: UserMinus,
    label: 'Champion Left',
    description: 'Key contact/advocate departed',
    color: 'text-purple-500',
  },
  internal_politics: {
    icon: Building2,
    label: 'Internal Politics',
    description: 'Organizational dynamics blocked deal',
    color: 'text-slate-600',
  },
  pricing_objection: {
    icon: DollarSign,
    label: 'Pricing Objection',
    description: 'Perceived as too expensive',
    color: 'text-yellow-600',
  },
  other: {
    icon: AlertTriangle,
    label: 'Other',
    description: 'Other reason (specify in notes)',
    color: 'text-gray-400',
  },
};

const winCategoryConfig: Record<WinCategory, CategoryConfig> = {
  champion_driven: {
    icon: Users,
    label: 'Champion Driven',
    description: 'Strong internal advocate pushed deal',
    color: 'text-green-600',
  },
  competitive_win: {
    icon: Trophy,
    label: 'Competitive Win',
    description: 'Won against competitor',
    color: 'text-emerald-600',
  },
  expansion: {
    icon: TrendingUp,
    label: 'Expansion',
    description: 'Existing customer relationship',
    color: 'text-blue-600',
  },
  inbound_lead: {
    icon: Mail,
    label: 'Inbound Lead',
    description: 'Marketing sourced opportunity',
    color: 'text-cyan-600',
  },
  outbound_sales: {
    icon: Phone,
    label: 'Outbound Sales',
    description: 'Sales prospecting success',
    color: 'text-indigo-600',
  },
  referral: {
    icon: Handshake,
    label: 'Referral',
    description: 'Customer or partner referral',
    color: 'text-teal-600',
  },
  partnership: {
    icon: Building2,
    label: 'Partnership',
    description: 'Partner-sourced deal',
    color: 'text-violet-600',
  },
};

interface WinLossCategorySelectProps {
  type: 'win' | 'loss';
  value: string;
  onChange: (value: string) => void;
  competitorName?: string;
  onCompetitorNameChange?: (value: string) => void;
  revisitDate?: string;
  onRevisitDateChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export const WinLossCategorySelect = memo(function WinLossCategorySelect({
  type,
  value,
  onChange,
  competitorName,
  onCompetitorNameChange,
  revisitDate,
  onRevisitDateChange,
  disabled = false,
  className,
  error,
}: WinLossCategorySelectProps) {
  const config = type === 'win' ? winCategoryConfig : lossCategoryConfig;
  const categories = type === 'win' ? WIN_CATEGORIES : LOSS_CATEGORIES;

  const selectedConfig = value ? config[value as keyof typeof config] : null;
  const showCompetitorField = type === 'loss' && value === 'competitor_won';
  const showRevisitField = type === 'loss' && value === 'timing_not_right';

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {type === 'win' ? 'Win Category' : 'Loss Category'}
        </label>
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'w-full',
            error && 'border-red-500 focus:ring-red-500'
          )}
        >
          <option value="">Select a category...</option>
          {categories.map((category) => {
            const cfg = config[category as keyof typeof config];
            return (
              <option key={category} value={category}>
                {cfg.label}
              </option>
            );
          })}
        </Select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>

      {selectedConfig && (
        <div
          className={cn(
            'flex items-start gap-2 p-3 rounded-lg bg-gray-50 border',
            type === 'win' ? 'border-green-200' : 'border-red-200'
          )}
        >
          <selectedConfig.icon
            className={cn('w-5 h-5 mt-0.5 flex-shrink-0', selectedConfig.color)}
          />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {selectedConfig.label}
            </p>
            <p className="text-xs text-gray-500">{selectedConfig.description}</p>
          </div>
        </div>
      )}

      {showCompetitorField && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Competitor Name
          </label>
          <input
            type="text"
            value={competitorName || ''}
            onChange={(e) => onCompetitorNameChange?.(e.target.value)}
            placeholder="Which competitor won the deal?"
            disabled={disabled}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
        </div>
      )}

      {showRevisitField && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Revisit Date
          </label>
          <input
            type="date"
            value={revisitDate || ''}
            onChange={(e) => onRevisitDateChange?.(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            When should we follow up with this prospect?
          </p>
        </div>
      )}
    </div>
  );
});

// Compact badge version for displaying category in tables/lists
interface CategoryBadgeProps {
  type: 'win' | 'loss';
  category: string | null;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export const CategoryBadge = memo(function CategoryBadge({
  type,
  category,
  size = 'md',
  showLabel = true,
  className,
}: CategoryBadgeProps) {
  const config = type === 'win' ? winCategoryConfig : lossCategoryConfig;
  const categoryConfig = category
    ? config[category as keyof typeof config]
    : null;

  if (!categoryConfig) {
    return (
      <span className={cn('text-gray-400 text-sm', className)}>
        Not specified
      </span>
    );
  }

  const Icon = categoryConfig.icon;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        type === 'win'
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800',
        sizeClasses,
        className
      )}
      title={categoryConfig.description}
    >
      <Icon className={cn(iconSize, categoryConfig.color)} />
      {showLabel && <span>{categoryConfig.label}</span>}
    </span>
  );
});

// Summary component for analytics
interface WinLossSummaryProps {
  wins: { category: WinCategory; count: number }[];
  losses: { category: LossCategory; count: number }[];
  className?: string;
}

export const WinLossSummary = memo(function WinLossSummary({
  wins,
  losses,
  className,
}: WinLossSummaryProps) {
  const totalWins = wins.reduce((sum, w) => sum + w.count, 0);
  const totalLosses = losses.reduce((sum, l) => sum + l.count, 0);
  const winRate =
    totalWins + totalLosses > 0
      ? Math.round((totalWins / (totalWins + totalLosses)) * 100)
      : 0;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Win/Loss Analysis</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Win Rate: <span className="font-bold text-green-600">{winRate}%</span>
          </span>
          <span className="text-sm text-gray-500">
            Total: {totalWins + totalLosses} deals
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
            <Trophy className="w-4 h-4" />
            Wins ({totalWins})
          </h4>
          <div className="space-y-2">
            {wins.length > 0 ? (
              wins
                .sort((a, b) => b.count - a.count)
                .map(({ category, count }) => {
                  const cfg = winCategoryConfig[category];
                  const Icon = cfg.icon;
                  const percentage = Math.round((count / totalWins) * 100);
                  return (
                    <div key={category} className="flex items-center gap-2">
                      <Icon className={cn('w-4 h-4', cfg.color)} />
                      <span className="text-sm text-gray-700 flex-1">
                        {cfg.label}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {count}
                      </span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-sm text-gray-400">No wins recorded</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Losses ({totalLosses})
          </h4>
          <div className="space-y-2">
            {losses.length > 0 ? (
              losses
                .sort((a, b) => b.count - a.count)
                .map(({ category, count }) => {
                  const cfg = lossCategoryConfig[category];
                  const Icon = cfg.icon;
                  const percentage = Math.round((count / totalLosses) * 100);
                  return (
                    <div key={category} className="flex items-center gap-2">
                      <Icon className={cn('w-4 h-4', cfg.color)} />
                      <span className="text-sm text-gray-700 flex-1">
                        {cfg.label}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {count}
                      </span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-sm text-gray-400">No losses recorded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
