'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  List,
  LayoutGrid,
  Network,
  Filter,
  Search,
  Upload,
  X,
  ChevronDown,
  SlidersHorizontal,
  Plus,
  Sparkles,
  Info,
} from 'lucide-react';
import BulkImportModal from './BulkImportModal';
import QuickEntryForm from './QuickEntryForm';
import ListView from './ListView';
import GroupedView from './GroupedView';
import CalendarView from './CalendarView';
import BoardView from './BoardView';

type ViewMode = 'list' | 'grouped' | 'calendar' | 'board';

interface TimelineViewProps {
  orgId: string;
  orgName: string;
}

interface FilterState {
  event_types: string[];
  event_categories: string[];
  sentiment: string[];
  severity: string[];
  tags: string[];
  mentioned_people: string[];
  logged_by: string[];
  follow_up_only: boolean;
  date_from?: string;
  date_to?: string;
  search: string;
}

const VIEW_OPTIONS = [
  { id: 'list', label: 'List', icon: List },
  { id: 'grouped', label: 'Grouped', icon: LayoutGrid },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'board', label: 'Board', icon: Network },
];

const EVENT_CATEGORIES = [
  { id: 'onboarding', label: 'Onboarding', color: 'bg-gray-100 text-gray-700' },
  { id: 'engagement', label: 'Engagement', color: 'bg-blue-100 text-blue-700' },
  { id: 'communication', label: 'Communication', color: 'bg-accent-100 text-accent-700' },
  { id: 'feedback', label: 'Feedback', color: 'bg-amber-100 text-amber-700' },
  { id: 'support', label: 'Support', color: 'bg-red-100 text-red-700' },
  { id: 'milestone', label: 'Milestone', color: 'bg-green-100 text-green-700' },
  { id: 'sales', label: 'Sales', color: 'bg-cyan-100 text-cyan-700' },
];

const SENTIMENT_OPTIONS = [
  { id: 'positive', label: 'Positive', color: 'bg-green-100 text-green-700' },
  { id: 'neutral', label: 'Neutral', color: 'bg-gray-100 text-gray-700' },
  { id: 'negative', label: 'Negative', color: 'bg-red-100 text-red-700' },
];

const SEVERITY_OPTIONS = [
  { id: 'low', label: 'Low', color: 'bg-blue-100 text-blue-700' },
  { id: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  { id: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { id: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

export default function TimelineView({ orgId, orgName }: TimelineViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAiBanner, setShowAiBanner] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    event_types: [],
    event_categories: [],
    sentiment: [],
    severity: [],
    tags: [],
    mentioned_people: [],
    logged_by: [],
    follow_up_only: false,
    search: '',
  });
  const [accountManagers, setAccountManagers] = useState<Array<{id: string; name: string}>>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleImported = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Fetch account managers for filter
  useEffect(() => {
    const fetchAccountManagers = async () => {
      try {
        const response = await fetch('/api/account-managers');
        if (!response.ok) return;
        const data = await response.json();
        setAccountManagers(data.map((am: any) => ({ id: am.id, name: am.full_name || am.email })));
      } catch (error) {
        console.error('Error fetching account managers:', error);
      }
    };
    fetchAccountManagers();
  }, []);

  const toggleFilter = (key: keyof FilterState, value: string) => {
    if (Array.isArray(filters[key])) {
      const current = filters[key] as string[];
      setFilters({
        ...filters,
        [key]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value],
      });
    }
  };

  const clearFilters = () => {
    setFilters({
      event_types: [],
      event_categories: [],
      sentiment: [],
      severity: [],
      tags: [],
      mentioned_people: [],
      logged_by: [],
      follow_up_only: false,
      search: '',
    });
  };

  const hasActiveFilters =
    filters.event_categories.length > 0 ||
    filters.sentiment.length > 0 ||
    filters.severity.length > 0 ||
    filters.logged_by.length > 0 ||
    filters.search.length > 0 ||
    filters.follow_up_only;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* AI-Powered Import Banner */}
      {showAiBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-gradient-to-r from-blue-600 to-slate-600 text-white px-6 py-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  AI-Powered Timeline Import Now Available
                </h3>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Import your email threads, Teams messages, CRM notes, and meeting summaries in seconds.
                  Our AI extracts all events automatically with intelligent parsing and duplicate detection.
                </p>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => setShowBulkImport(true)}
                    className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    Try Bulk Import
                  </button>
                  <button
                    onClick={() => setShowQuickEntry(true)}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2 text-sm font-medium backdrop-blur-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Quick Entry
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAiBanner(false)}
              className="text-white/80 hover:text-white transition-colors p-1"
              aria-label="Dismiss banner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{orgName} Timeline</h2>
            <p className="text-sm text-gray-500 mt-1">
              Track all events, interactions, and milestones
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {filters.event_categories.length + filters.sentiment.length + filters.severity.length + filters.logged_by.length + (filters.follow_up_only ? 1 : 0)}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowQuickEntry(true)}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>

            <button
              onClick={() => setShowBulkImport(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-slate-600 text-white rounded-lg hover:from-blue-700 hover:to-slate-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold text-sm"
            >
              <Sparkles className="w-4 h-4" />
              AI Bulk Import
            </button>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2">
          {VIEW_OPTIONS.map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setViewMode(view.id as ViewMode)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  viewMode === view.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {view.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-white border-b border-gray-200 px-6 py-4 overflow-hidden"
        >
          <div className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Events
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search titles, descriptions, people..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {EVENT_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => toggleFilter('event_categories', category.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filters.event_categories.includes(category.id)
                        ? category.color + ' ring-2 ring-offset-1 ring-gray-400'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sentiment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sentiment
              </label>
              <div className="flex gap-2">
                {SENTIMENT_OPTIONS.map((sentiment) => (
                  <button
                    key={sentiment.id}
                    onClick={() => toggleFilter('sentiment', sentiment.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filters.sentiment.includes(sentiment.id)
                        ? sentiment.color + ' ring-2 ring-offset-1 ring-gray-400'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {sentiment.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity
              </label>
              <div className="flex gap-2">
                {SEVERITY_OPTIONS.map((severity) => (
                  <button
                    key={severity.id}
                    onClick={() => toggleFilter('severity', severity.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filters.severity.includes(severity.id)
                        ? severity.color + ' ring-2 ring-offset-1 ring-gray-400'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {severity.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Manager Filter */}
            {accountManagers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Manager
                </label>
                <div className="flex flex-wrap gap-2">
                  {accountManagers.map((am) => (
                    <button
                      key={am.id}
                      onClick={() => toggleFilter('logged_by', am.id)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        filters.logged_by.includes(am.id)
                          ? 'bg-purple-100 text-purple-700 ring-2 ring-offset-1 ring-purple-400'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {am.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Toggle */}
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.follow_up_only}
                  onChange={(e) => setFilters({ ...filters, follow_up_only: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm font-medium text-gray-700">
                Show only events requiring follow-up
              </span>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'list' && (
          <ListView
            orgId={orgId}
            filters={filters}
            refreshTrigger={refreshTrigger}
          />
        )}
        {viewMode === 'grouped' && (
          <GroupedView
            orgId={orgId}
            filters={filters}
            refreshTrigger={refreshTrigger}
          />
        )}
        {viewMode === 'calendar' && (
          <CalendarView
            orgId={orgId}
            filters={filters}
            refreshTrigger={refreshTrigger}
          />
        )}
        {viewMode === 'board' && (
          <BoardView
            orgId={orgId}
            filters={filters}
            refreshTrigger={refreshTrigger}
          />
        )}
      </div>

      {/* Quick Entry Form */}
      {showQuickEntry && (
        <QuickEntryForm
          orgId={orgId}
          orgName={orgName}
          onClose={() => setShowQuickEntry(false)}
          onSuccess={handleImported}
        />
      )}

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        orgId={orgId}
        orgName={orgName}
        onImported={handleImported}
      />
    </div>
  );
}
