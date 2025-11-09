'use client';

import { useState } from 'react';
import { Search, Filter, X, Calendar, AlertCircle, Tag, Flag, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  // Get active filter names for pills
  const getActiveFilterNames = () => {
    const names: { type: string; value: string; onRemove: () => void }[] = [];

    selectedStatuses.forEach(status => {
      const statusOption = STATUS_OPTIONS.find(s => s.value === status);
      if (statusOption) {
        names.push({
          type: 'status',
          value: statusOption.label,
          onRemove: () => toggleStatus(status),
        });
      }
    });

    selectedPriorities.forEach(priority => {
      const priorityOption = PRIORITY_OPTIONS.find(p => p.value === priority);
      if (priorityOption) {
        names.push({
          type: 'priority',
          value: priorityOption.label,
          onRemove: () => togglePriority(priority),
        });
      }
    });

    selectedLabelIds.forEach(labelId => {
      const label = labels.find(l => l.id === labelId);
      if (label) {
        names.push({
          type: 'label',
          value: label.name,
          onRemove: () => toggleLabel(labelId),
        });
      }
    });

    selectedMilestoneIds.forEach(milestoneId => {
      const milestone = milestones.find(m => m.id === milestoneId);
      if (milestone) {
        names.push({
          type: 'milestone',
          value: milestone.name,
          onRemove: () => toggleMilestone(milestoneId),
        });
      }
    });

    if (showBlockedOnly) {
      names.push({
        type: 'blocked',
        value: 'Blocked only',
        onRemove: () => onShowBlockedOnlyChange(false),
      });
    }

    return names;
  };

  const activeFilterPills = getActiveFilterNames();

  return (
    <div className="space-y-3" data-roadmap-filters>
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
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2.5 rounded-lg border flex items-center gap-2 transition-all text-sm font-medium ${
            showFilters
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : hasActiveFilters
              ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && !showFilters && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
              {activeFilterPills.length}
            </span>
          )}
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2 text-sm font-medium"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        )}
      </div>

      {/* Active Filter Pills */}
      {activeFilterPills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilterPills.map((filter, index) => (
            <button
              key={`${filter.type}-${filter.value}-${index}`}
              onClick={filter.onRemove}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-200"
            >
              <span>{filter.value}</span>
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-5 space-y-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Quick Filters Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Quick Filters</h4>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => toggleStatus(status.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedStatuses.includes(status.value)
                        ? 'bg-blue-600 text-white shadow-md scale-105'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
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
              <label className="block text-xs font-medium text-gray-600 mb-2">Priority</label>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((priority) => (
                  <button
                    key={priority.value}
                    onClick={() => togglePriority(priority.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedPriorities.includes(priority.value)
                        ? 'ring-2 ring-blue-600 ring-offset-2 shadow-md'
                        : 'border border-gray-200 hover:border-gray-300'
                    } ${priority.color}`}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Blocked Only */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showBlockedOnly}
                    onChange={(e) => onShowBlockedOnlyChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1 text-red-600" />
                  Show blocked items only
                </span>
              </label>
            </div>
          </div>

          {/* Advanced Filters Section */}
          {(labels.length > 0 || milestones.length > 0) && (
            <div className="border-t border-gray-200 pt-5 space-y-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-left group"
              >
                <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Advanced Filters
                </h4>
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                )}
              </button>

              {showAdvanced && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Labels Filter */}
                  {labels.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        <Tag className="w-3.5 h-3.5 inline mr-1" />
                        Labels
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {labels.map((label) => (
                          <button
                            key={label.id}
                            onClick={() => toggleLabel(label.id)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                              selectedLabelIds.includes(label.id)
                                ? 'text-white ring-2 ring-offset-1 shadow-sm'
                                : 'border border-gray-300 hover:border-gray-400'
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
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        <Flag className="w-3.5 h-3.5 inline mr-1" />
                        Milestones
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {milestones.map((milestone) => (
                          <button
                            key={milestone.id}
                            onClick={() => toggleMilestone(milestone.id)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                              selectedMilestoneIds.includes(milestone.id)
                                ? 'text-white ring-2 ring-offset-1 shadow-sm'
                                : 'border border-gray-300 hover:border-gray-400'
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
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      <Calendar className="w-3.5 h-3.5 inline mr-1" />
                      Target Date Range
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wide">From</label>
                        <input
                          type="date"
                          value={dateRange.start || ''}
                          onChange={(e) =>
                            onDateRangeChange({ ...dateRange, start: e.target.value || null })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wide">To</label>
                        <input
                          type="date"
                          value={dateRange.end || ''}
                          onChange={(e) =>
                            onDateRangeChange({ ...dateRange, end: e.target.value || null })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
