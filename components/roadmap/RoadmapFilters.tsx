'use client';

import { useState } from 'react';
import { Search, Filter, X, Calendar, AlertCircle, Tag, Flag } from 'lucide-react';

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Milestone {
  id: string;
  name: string;
  color: string;
}

interface RoadmapFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatuses: string[];
  onStatusChange: (statuses: string[]) => void;
  selectedPriorities: string[];
  onPriorityChange: (priorities: string[]) => void;
  selectedLabelIds: string[];
  onLabelIdsChange: (labelIds: string[]) => void;
  selectedMilestoneIds: string[];
  onMilestoneIdsChange: (milestoneIds: string[]) => void;
  dateRange: { start: string | null; end: string | null };
  onDateRangeChange: (range: { start: string | null; end: string | null }) => void;
  showBlockedOnly: boolean;
  onShowBlockedOnlyChange: (value: boolean) => void;
  onClearFilters: () => void;
  labels: Label[];
  milestones: Milestone[];
}

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned', emoji: '📋' },
  { value: 'in_progress', label: 'In Progress', emoji: '🚀' },
  { value: 'completed', label: 'Completed', emoji: '✅' },
  { value: 'cancelled', label: 'Cancelled', emoji: '❌' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
];

export default function RoadmapFilters({
  searchQuery,
  onSearchChange,
  selectedStatuses,
  onStatusChange,
  selectedPriorities,
  onPriorityChange,
  selectedLabelIds,
  onLabelIdsChange,
  selectedMilestoneIds,
  onMilestoneIdsChange,
  dateRange,
  onDateRangeChange,
  showBlockedOnly,
  onShowBlockedOnlyChange,
  onClearFilters,
  labels,
  milestones,
}: RoadmapFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    selectedStatuses.length > 0 ||
    selectedPriorities.length > 0 ||
    selectedLabelIds.length > 0 ||
    selectedMilestoneIds.length > 0 ||
    dateRange.start ||
    dateRange.end ||
    showBlockedOnly ||
    searchQuery.length > 0;

  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  };

  const togglePriority = (priority: string) => {
    if (selectedPriorities.includes(priority)) {
      onPriorityChange(selectedPriorities.filter((p) => p !== priority));
    } else {
      onPriorityChange([...selectedPriorities, priority]);
    }
  };

  const toggleLabel = (labelId: string) => {
    if (selectedLabelIds.includes(labelId)) {
      onLabelIdsChange(selectedLabelIds.filter((id) => id !== labelId));
    } else {
      onLabelIdsChange([...selectedLabelIds, labelId]);
    }
  };

  const toggleMilestone = (milestoneId: string) => {
    if (selectedMilestoneIds.includes(milestoneId)) {
      onMilestoneIdsChange(selectedMilestoneIds.filter((id) => id !== milestoneId));
    } else {
      onMilestoneIdsChange([...selectedMilestoneIds, milestoneId]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar and Filter Toggle */}
      <div className="flex gap-2">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search roadmap items..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-colors ${
            hasActiveFilters
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {[
                selectedStatuses.length,
                selectedPriorities.length,
                dateRange.start ? 1 : 0,
                dateRange.end ? 1 : 0,
                showBlockedOnly ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </button>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 shadow-sm">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  onClick={() => toggleStatus(status.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedStatuses.includes(status.value)
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-1">{status.emoji}</span>
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((priority) => (
                <button
                  key={priority.value}
                  onClick={() => togglePriority(priority.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedPriorities.includes(priority.value)
                      ? 'ring-2 ring-blue-600 ring-offset-1'
                      : ''
                  } ${priority.color}`}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>

          {/* Labels Filter */}
          {labels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Labels
              </label>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => toggleLabel(label.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedLabelIds.includes(label.id)
                        ? 'text-white ring-2 ring-offset-1'
                        : 'border border-gray-300'
                    }`}
                    style={{
                      backgroundColor: selectedLabelIds.includes(label.id) ? label.color : `${label.color}20`,
                      color: selectedLabelIds.includes(label.id) ? 'white' : undefined,
                      ringColor: selectedLabelIds.includes(label.id) ? label.color : undefined,
                    }}
                  >
                    {label.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Milestones Filter */}
          {milestones.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Flag className="w-4 h-4 inline mr-1" />
                Milestones
              </label>
              <div className="flex flex-wrap gap-2">
                {milestones.map((milestone) => (
                  <button
                    key={milestone.id}
                    onClick={() => toggleMilestone(milestone.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                      selectedMilestoneIds.includes(milestone.id)
                        ? 'text-white ring-2 ring-offset-1'
                        : 'border border-gray-300'
                    }`}
                    style={{
                      backgroundColor: selectedMilestoneIds.includes(milestone.id) ? milestone.color : `${milestone.color}20`,
                      color: selectedMilestoneIds.includes(milestone.id) ? 'white' : undefined,
                      ringColor: selectedMilestoneIds.includes(milestone.id) ? milestone.color : undefined,
                    }}
                  >
                    <Flag className="w-3 h-3" />
                    {milestone.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Target Date Range
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">From</label>
                <input
                  type="date"
                  value={dateRange.start || ''}
                  onChange={(e) =>
                    onDateRangeChange({ ...dateRange, start: e.target.value || null })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">To</label>
                <input
                  type="date"
                  value={dateRange.end || ''}
                  onChange={(e) =>
                    onDateRangeChange({ ...dateRange, end: e.target.value || null })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Blocked Only Filter */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showBlockedOnly}
                onChange={(e) => onShowBlockedOnlyChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                <AlertCircle className="w-4 h-4 inline mr-1 text-red-600" />
                Show blocked items only
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
