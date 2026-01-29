'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { LayoutGrid, Upload } from 'lucide-react';

export type QuoteAdminTab = 'pipeline' | 'import';

interface TabConfig {
  id: QuoteAdminTab;
  label: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}

interface QuoteAdminTabsProps {
  activeTab: QuoteAdminTab;
  onTabChange?: (tab: QuoteAdminTab) => void;
}

export function QuoteAdminTabs({ activeTab, onTabChange }: QuoteAdminTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabs: TabConfig[] = [
    {
      id: 'pipeline',
      label: 'Pipeline',
      description: 'Organization board',
      icon: <LayoutGrid className="w-4 h-4" />,
      gradient: 'from-violet-500 to-purple-600',
    },
    {
      id: 'import',
      label: 'Import',
      description: 'Bulk data import',
      icon: <Upload className="w-4 h-4" />,
      gradient: 'from-blue-500 to-indigo-600',
    },
  ];

  const handleTabClick = useCallback((tabId: QuoteAdminTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`?${params.toString()}`, { scroll: false });
    onTabChange?.(tabId);
  }, [router, searchParams, onTabChange]);

  return (
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
          </button>
        );
      })}
    </div>
  );
}

/**
 * Hook to get the current quote admin tab from URL params
 */
export function useQuoteAdminTab(): QuoteAdminTab {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') as QuoteAdminTab | null;

  const validTabs: QuoteAdminTab[] = ['pipeline', 'import'];
  if (tab && validTabs.includes(tab)) {
    return tab;
  }

  return 'pipeline';
}

export default QuoteAdminTabs;
