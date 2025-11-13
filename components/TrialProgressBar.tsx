import { TrendingUp, Zap, AlertCircle } from 'lucide-react';

interface TrialProgressBarProps {
  trialStartDate: string | null;
  trialEndDate: string | null;
  engagementScore: number;
  lastActivityDate: string | null;
  className?: string;
}

export function TrialProgressBar({
  trialStartDate,
  trialEndDate,
  engagementScore,
  lastActivityDate,
  className = '',
}: TrialProgressBarProps) {
  if (!trialStartDate || !trialEndDate) {
    return null;
  }

  const start = new Date(trialStartDate);
  const end = new Date(trialEndDate);
  const now = new Date();

  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const remainingDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const percentComplete = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  // Determine velocity based on engagement score and activity recency
  const getVelocity = () => {
    const daysSinceActivity = lastActivityDate
      ? Math.ceil((now.getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (engagementScore >= 70 && daysSinceActivity <= 3) {
      return { icon: TrendingUp, label: 'Momentum building', color: 'text-green-600', gradient: 'from-green-400 to-green-600' };
    } else if (engagementScore >= 40 || daysSinceActivity <= 7) {
      return { icon: Zap, label: 'On track', color: 'text-blue-600', gradient: 'from-blue-400 to-blue-600' };
    } else {
      return { icon: AlertCircle, label: 'Needs attention', color: 'text-amber-600', gradient: 'from-amber-400 to-amber-600' };
    }
  };

  const velocity = getVelocity();
  const VelocityIcon = velocity.icon;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Progress info */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <VelocityIcon className={`w-3.5 h-3.5 ${velocity.color}`} />
          <span className={`font-medium ${velocity.color}`}>{velocity.label}</span>
        </div>
        <div className="text-gray-600 font-medium">
          Day {Math.min(elapsedDays, totalDays)} of {totalDays}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${velocity.gradient} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${percentComplete}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
        </div>
      </div>

      {/* Status text */}
      {remainingDays > 0 && (
        <div className="text-xs text-gray-500 text-right">
          <span>{remainingDays} day{remainingDays !== 1 ? 's' : ''} remaining</span>
        </div>
      )}
    </div>
  );
}
