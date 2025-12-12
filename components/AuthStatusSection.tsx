'use client';

import { AuthProviderInfo } from '@/lib/research-status';
import { cn } from '@/lib/utils';

interface AuthStatusSectionProps {
  google: AuthProviderInfo;
  microsoft: AuthProviderInfo;
}

export default function AuthStatusSection({ google, microsoft }: AuthStatusSectionProps) {
  const providers = [google, microsoft];

  // Check if any auth provider has issues
  const hasIssues = providers.some(p => p.status === 'unavailable');

  return (
    <div
      className={cn(
        'rounded-xl border backdrop-blur-sm p-5',
        hasIssues
          ? 'bg-amber-500/5 border-amber-500/20'
          : 'bg-white/[0.02] border-white/10'
      )}
    >
      {/* Header */}
      <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wide">
        Sign-in Status
      </h3>

      {/* Provider List */}
      <div className="space-y-3">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
          >
            <span className="text-sm text-white/70">
              {provider.name} sign-in
            </span>
            <span
              className={cn(
                'text-sm font-medium',
                provider.status === 'available'
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              )}
            >
              {provider.status === 'available' ? 'Available' : 'Temporarily unavailable'}
            </span>
          </div>
        ))}
      </div>

      {/* Help text when there are issues */}
      {hasIssues && (
        <p className="mt-4 text-xs text-white/50 leading-relaxed">
          If you cannot sign in, please try the other sign-in method or wait a few minutes.
        </p>
      )}
    </div>
  );
}
