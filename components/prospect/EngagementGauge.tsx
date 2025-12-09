'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EngagementGaugeProps {
  score: number | null;
  trend?: 'up' | 'down' | 'stable';
  size?: 'sm' | 'md' | 'lg';
}

export default function EngagementGauge({ score, trend, size = 'md' }: EngagementGaugeProps) {
  const normalizedScore = score ?? 0;

  const getScoreColor = (s: number) => {
    if (s >= 80) return { ring: 'stroke-emerald-500', bg: 'bg-emerald-100', text: 'text-emerald-700' };
    if (s >= 60) return { ring: 'stroke-blue-500', bg: 'bg-blue-100', text: 'text-blue-700' };
    if (s >= 40) return { ring: 'stroke-amber-500', bg: 'bg-amber-100', text: 'text-amber-700' };
    return { ring: 'stroke-red-500', bg: 'bg-red-100', text: 'text-red-700' };
  };

  const colors = getScoreColor(normalizedScore);
  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  const sizeClasses = {
    sm: { wrapper: 'w-16 h-16', text: 'text-lg', label: 'text-[8px]' },
    md: { wrapper: 'w-24 h-24', text: 'text-2xl', label: 'text-[10px]' },
    lg: { wrapper: 'w-32 h-32', text: 'text-3xl', label: 'text-xs' },
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

  return (
    <div className={`relative ${sizeClasses[size].wrapper}`}>
      {/* Background Ring */}
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-200"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={colors.ring}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>

      {/* Score Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold ${sizeClasses[size].text} ${colors.text}`}>
          {score !== null ? normalizedScore : '--'}
        </span>
        <span className={`${sizeClasses[size].label} text-gray-500 font-medium`}>
          SCORE
        </span>
        {trend && (
          <TrendIcon className={`w-3 h-3 mt-0.5 ${trendColor}`} />
        )}
      </div>
    </div>
  );
}
