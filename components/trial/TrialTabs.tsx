'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Users, PlayCircle, GitBranch, Trophy } from 'lucide-react';

export type TrialTabType = 'prospects' | 'active_trials' | 'pipeline' | 'customers';

interface TabConfig {
  id: TrialTabType;
  label: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  count?: number;
}

interface TrialTabsProps {
  activeTab: TrialTabType;
  counts: {
    prospects: number;
    activeTrials: number;
    pipeline: number;
    customers: number;
  };
  onTabChange?: (tab: TrialTabType) => void;
}

export function TrialTabs({ activeTab, counts, onTabChange }: TrialTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabs: TabConfig[] = [
    {
      id: 'prospects',
      label: 'Prospects',
      description: 'Pre-trial outreach',
      icon: <Users className="w-4 h-4" />,
      gradient: 'from-amber-500 to-orange-600',
      count: counts.prospects,
    },
    {
      id: 'active_trials',
      label: 'Active Trials',
      description: 'In trial period',
      icon: <PlayCircle className="w-4 h-4" />,
      gradient: 'from-blue-500 to-indigo-600',
      count: counts.activeTrials,
    },
    {
      id: 'pipeline',
      label: 'Pipeline',
      description: 'Post-trial evaluation',
      icon: <GitBranch className="w-4 h-4" />,
      gradient: 'from-purple-500 to-pink-600',
      count: counts.pipeline,
    },
    {
      id: 'customers',
      label: 'Customers',
      description: 'Converted accounts',
      icon: <Trophy className="w-4 h-4" />,
      gradient: 'from-green-500 to-emerald-600',
      count: counts.customers,
    },
  ];

  const handleTabClick = useCallback((tabId: TrialTabType) => {
    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', tabId);
    // Reset page when switching tabs
    params.delete('page');
    router.push(`?${params.toString()}`, { scroll: false });

    onTabChange?.(tabId);
  }, [router, searchParams, onTabChange]);

  return (
    <div className="mb-6">
      <div className="flex bg-gradient-to-r from-gray-100 to-gray-50 backdrop-blur-sm rounded-2xl p-1.5 shadow-lg border border-gray-200 inline-flex">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 transform
                ${isActive
                  ? `bg-gradient-to-r ${tab.gradient} text-white shadow-xl scale-[1.02]`
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }
              `}
            >
              <span className={isActive ? 'text-white/90' : 'text-gray-400'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`
                    ml-1 px-2 py-0.5 rounded-full text-xs font-bold
                    ${isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Hook to get the current trial tab from URL params
 */
export function useTrialTab(): TrialTabType {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') as TrialTabType | null;

  // Validate the view param
  const validTabs: TrialTabType[] = ['prospects', 'active_trials', 'pipeline', 'customers'];
  if (view && validTabs.includes(view)) {
    return view;
  }

  // Default to active_trials (original behavior)
  return 'active_trials';
}

/**
 * Helper function to get filter criteria based on tab
 */
export function getTabFilterCriteria(tab: TrialTabType): {
  isProspect?: boolean;
  dealOutcome?: string | null;
  trialStatusIn?: string[];
  lifecycleStage?: string;
} {
  switch (tab) {
    case 'prospects':
      return { isProspect: true };
    case 'active_trials':
      return {
        isProspect: false,
        trialStatusIn: ['active', 'pending', 'paused'],
      };
    case 'pipeline':
      return {
        isProspect: false,
        dealOutcome: null, // No outcome yet
        trialStatusIn: ['ended', 'expired'],
      };
    case 'customers':
      return {
        isProspect: false,
        dealOutcome: 'won',
      };
    default:
      return {};
  }
}

export default TrialTabs;
