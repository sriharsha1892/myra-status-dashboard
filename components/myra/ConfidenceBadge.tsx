// Confidence Badge - Visual indicator of mapping confidence
'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

interface ConfidenceBadgeProps {
  score: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function ConfidenceBadge({ score, size = 'md', showIcon = true }: ConfidenceBadgeProps) {
  const confidence = score ?? 0;

  // Determine variant based on confidence
  const getVariant = () => {
    if (confidence >= 90) return 'success';
    if (confidence >= 70) return 'warning';
    return 'destructive';
  };

  const getIcon = () => {
    if (confidence >= 90) return <CheckCircle2 className="w-3 h-3" />;
    if (confidence >= 70) return <AlertCircle className="w-3 h-3" />;
    return <HelpCircle className="w-3 h-3" />;
  };

  const getLabel = () => {
    if (confidence >= 90) return `High: ${confidence}%`;
    if (confidence >= 70) return `Medium: ${confidence}%`;
    if (confidence > 0) return `Low: ${confidence}%`;
    return 'No match';
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge
      variant={getVariant()}
      className={`font-medium ${sizeClasses[size]} flex items-center gap-1`}
    >
      {showIcon && getIcon()}
      {getLabel()}
    </Badge>
  );
}

export function ConfidenceIndicator({ score }: { score: number | null | undefined }) {
  const confidence = score ?? 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            confidence >= 90
              ? 'bg-green-500'
              : confidence >= 70
              ? 'bg-yellow-500'
              : 'bg-red-500'
          }`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 min-w-[3ch]">{Math.round(confidence)}%</span>
    </div>
  );
}
