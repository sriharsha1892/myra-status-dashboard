'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Plus,
  Loader2,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  MatchResult,
  MatchGroup,
  SyncCategory,
  SYNC_CATEGORIES,
  CATEGORY_DB_MAPPING,
} from '@/lib/sync/types';

interface MatchResultsPanelProps {
  matchGroups: MatchGroup;
  selectedCategory: SyncCategory;
  onApply: (
    updates: Array<{ org_id: string; category: SyncCategory }>,
    creates: Array<{ name: string; category: SyncCategory }>
  ) => Promise<void>;
  onEditOrg?: (orgId: string) => void;
  onCreateOrg?: (name: string) => void;
}

// Helper to format status for display
function formatStatus(status: string | null | undefined): string {
  if (!status) return 'Not set';
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

// Get what the category will set
function getCategoryTarget(category: SyncCategory): { field: string; value: string } {
  const mapping = CATEGORY_DB_MAPPING[category];
  const field = Object.keys(mapping)[0];
  const value = mapping[field] || 'Not set';
  return { field, value };
}

// Confirmation modal component
function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  updateCount,
  createCount,
  categoryLabel,
  isApplying,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  updateCount: number;
  createCount: number;
  categoryLabel: string;
  isApplying: boolean;
}) {
  if (!isOpen) return null;

  const totalCount = updateCount + createCount;
  const skippedCount = 0; // Can be calculated if we track unselected items

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          Confirm Changes
        </h3>

        <div className="space-y-3 mb-6">
          <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
            <div className="text-sm font-medium text-neutral-700 mb-2">
              Summary
            </div>
            {updateCount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>
                  <span className="font-medium">{updateCount}</span> organization{updateCount !== 1 ? 's' : ''} will be updated to{' '}
                  <span className="font-medium text-violet-600">{categoryLabel}</span>
                </span>
              </div>
            )}
            {createCount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>
                  <span className="font-medium">{createCount}</span> new organization{createCount !== 1 ? 's' : ''} will be created
                </span>
              </div>
            )}
            {totalCount === 0 && (
              <div className="text-sm text-neutral-500">
                No changes selected
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="px-4 py-2 text-neutral-700 hover:text-neutral-900 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={totalCount === 0 || isApplying}
            className="bg-violet-600 hover:bg-violet-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirm & Apply
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MatchResultsPanel({
  matchGroups,
  selectedCategory,
  onApply,
  onEditOrg,
  onCreateOrg,
}: MatchResultsPanelProps) {
  const [selectedExact, setSelectedExact] = useState<Set<string>>(
    new Set(matchGroups.exact.map((m) => m.input))
  );
  const [selectedFuzzy, setSelectedFuzzy] = useState<Set<string>>(new Set());
  const [selectedCreate, setSelectedCreate] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    exact: true,
    fuzzy: true,
    noMatch: true,
  });

  const categoryData = SYNC_CATEGORIES.find((c) => c.value === selectedCategory);
  const categoryLabel = categoryData?.label || selectedCategory;
  const categoryTarget = getCategoryTarget(selectedCategory);

  // Calculate fuzzy matches with high confidence (>= 80%)
  const highConfidenceFuzzy = useMemo(
    () => matchGroups.fuzzy.filter((m) => m.confidence >= 80),
    [matchGroups.fuzzy]
  );

  const toggleSection = (section: 'exact' | 'fuzzy' | 'noMatch') => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleExact = (input: string) => {
    setSelectedExact((prev) => {
      const next = new Set(prev);
      if (next.has(input)) {
        next.delete(input);
      } else {
        next.add(input);
      }
      return next;
    });
  };

  const toggleFuzzy = (input: string) => {
    setSelectedFuzzy((prev) => {
      const next = new Set(prev);
      if (next.has(input)) {
        next.delete(input);
      } else {
        next.add(input);
      }
      return next;
    });
  };

  const toggleCreate = (input: string) => {
    setSelectedCreate((prev) => {
      const next = new Set(prev);
      if (next.has(input)) {
        next.delete(input);
      } else {
        next.add(input);
      }
      return next;
    });
  };

  const selectAllExact = () => {
    setSelectedExact(new Set(matchGroups.exact.map((m) => m.input)));
  };

  const selectNoneExact = () => {
    setSelectedExact(new Set());
  };

  const selectAllHighConfidenceFuzzy = () => {
    setSelectedFuzzy((prev) => {
      const next = new Set(prev);
      highConfidenceFuzzy.forEach((m) => next.add(m.input));
      return next;
    });
  };

  const selectAllFuzzy = () => {
    setSelectedFuzzy(new Set(matchGroups.fuzzy.map((m) => m.input)));
  };

  const selectNoneFuzzy = () => {
    setSelectedFuzzy(new Set());
  };

  const selectAllCreate = () => {
    setSelectedCreate(new Set(matchGroups.noMatch.map((m) => m.input)));
  };

  const selectNoneCreate = () => {
    setSelectedCreate(new Set());
  };

  const handleApplyClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirm = useCallback(async () => {
    setIsApplying(true);
    try {
      // Build updates from exact + fuzzy selections
      const updates: Array<{ org_id: string; category: SyncCategory }> = [];
      const creates: Array<{ name: string; category: SyncCategory }> = [];

      for (const match of matchGroups.exact) {
        if (selectedExact.has(match.input) && match.matched_id) {
          updates.push({ org_id: match.matched_id, category: selectedCategory });
        }
      }

      for (const match of matchGroups.fuzzy) {
        if (selectedFuzzy.has(match.input) && match.matched_id) {
          updates.push({ org_id: match.matched_id, category: selectedCategory });
        }
      }

      for (const match of matchGroups.noMatch) {
        if (selectedCreate.has(match.input)) {
          creates.push({ name: match.input, category: selectedCategory });
        }
      }

      await onApply(updates, creates);
      setShowConfirmation(false);
    } finally {
      setIsApplying(false);
    }
  }, [
    matchGroups,
    selectedExact,
    selectedFuzzy,
    selectedCreate,
    selectedCategory,
    onApply,
  ]);

  const totalSelected =
    selectedExact.size + selectedFuzzy.size + selectedCreate.size;
  const totalUpdates = selectedExact.size + selectedFuzzy.size;
  const totalCreates = selectedCreate.size;

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 flex items-center justify-between">
        <div className="text-sm text-violet-700">
          <span className="font-medium">{totalSelected}</span> items selected
          {totalUpdates > 0 && (
            <span className="ml-2">
              ({totalUpdates} update{totalUpdates !== 1 ? 's' : ''})
            </span>
          )}
          {totalCreates > 0 && (
            <span className="ml-2">
              ({totalCreates} new)
            </span>
          )}
          <span className="ml-2 text-violet-500">
            → Set as <span className="font-medium">{categoryLabel}</span>
          </span>
        </div>
        <button
          onClick={handleApplyClick}
          disabled={totalSelected === 0 || isApplying}
          className="bg-violet-600 hover:bg-violet-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          {isApplying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Apply Selected Changes
            </>
          )}
        </button>
      </div>

      {/* Exact Matches */}
      {matchGroups.exact.length > 0 && (
        <div className="border border-green-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('exact')}
            className="w-full bg-green-50 px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">
                Exact Matches ({matchGroups.exact.length})
              </span>
              <span className="text-sm text-green-600">
                — {selectedExact.size} selected
              </span>
            </div>
            {expandedSections.exact ? (
              <ChevronUp className="w-5 h-5 text-green-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-green-600" />
            )}
          </button>
          {expandedSections.exact && (
            <div className="bg-white">
              <div className="px-4 py-2 border-b border-green-100 flex items-center gap-4">
                <button
                  onClick={selectAllExact}
                  className="text-xs text-green-600 hover:text-green-800"
                >
                  Select All
                </button>
                <button
                  onClick={selectNoneExact}
                  className="text-xs text-green-600 hover:text-green-800"
                >
                  Select None
                </button>
              </div>
              <div className="divide-y divide-green-100">
                {matchGroups.exact.map((match) => (
                  <MatchRow
                    key={match.input}
                    match={match}
                    isSelected={selectedExact.has(match.input)}
                    onToggle={() => toggleExact(match.input)}
                    onEdit={onEditOrg}
                    variant="exact"
                    categoryTarget={categoryTarget}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fuzzy Matches */}
      {matchGroups.fuzzy.length > 0 && (
        <div className="border border-amber-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('fuzzy')}
            className="w-full bg-amber-50 px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="font-medium text-amber-800">
                Fuzzy Matches ({matchGroups.fuzzy.length})
              </span>
              <span className="text-sm text-amber-600">
                — Review required, {selectedFuzzy.size} selected
              </span>
            </div>
            {expandedSections.fuzzy ? (
              <ChevronUp className="w-5 h-5 text-amber-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-amber-600" />
            )}
          </button>
          {expandedSections.fuzzy && (
            <div className="bg-white">
              <div className="px-4 py-2 border-b border-amber-100 flex items-center gap-4 flex-wrap">
                <button
                  onClick={selectAllFuzzy}
                  className="text-xs text-amber-600 hover:text-amber-800"
                >
                  Select All
                </button>
                {highConfidenceFuzzy.length > 0 && (
                  <button
                    onClick={selectAllHighConfidenceFuzzy}
                    className="text-xs text-amber-700 hover:text-amber-900 font-medium bg-amber-100 px-2 py-0.5 rounded"
                  >
                    Select All &gt;80% ({highConfidenceFuzzy.length})
                  </button>
                )}
                <button
                  onClick={selectNoneFuzzy}
                  className="text-xs text-amber-600 hover:text-amber-800"
                >
                  Select None
                </button>
                <div className="flex items-center gap-1 text-xs text-amber-500 ml-auto">
                  <HelpCircle className="w-3 h-3" />
                  <span>Fuzzy matches need manual review</span>
                </div>
              </div>
              <div className="divide-y divide-amber-100">
                {matchGroups.fuzzy.map((match) => (
                  <MatchRow
                    key={match.input}
                    match={match}
                    isSelected={selectedFuzzy.has(match.input)}
                    onToggle={() => toggleFuzzy(match.input)}
                    onEdit={onEditOrg}
                    variant="fuzzy"
                    categoryTarget={categoryTarget}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Matches */}
      {matchGroups.noMatch.length > 0 && (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('noMatch')}
            className="w-full bg-red-50 px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">
                No Matches ({matchGroups.noMatch.length})
              </span>
              <span className="text-sm text-red-600">
                — {selectedCreate.size} marked to create
              </span>
            </div>
            {expandedSections.noMatch ? (
              <ChevronUp className="w-5 h-5 text-red-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-red-600" />
            )}
          </button>
          {expandedSections.noMatch && (
            <div className="bg-white">
              <div className="px-4 py-2 border-b border-red-100 flex items-center gap-4">
                <button
                  onClick={selectAllCreate}
                  className="text-xs text-red-600 hover:text-red-800 font-medium bg-red-100 px-2 py-0.5 rounded"
                >
                  Create All ({matchGroups.noMatch.length})
                </button>
                <button
                  onClick={selectNoneCreate}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Select None
                </button>
                <div className="flex items-center gap-1 text-xs text-red-500 ml-auto">
                  <HelpCircle className="w-3 h-3" />
                  <span>These will be created as new organizations</span>
                </div>
              </div>
              <div className="divide-y divide-red-100">
                {matchGroups.noMatch.map((match) => (
                  <NoMatchRow
                    key={match.input}
                    match={match}
                    isSelectedForCreate={selectedCreate.has(match.input)}
                    onToggleCreate={() => toggleCreate(match.input)}
                    onCreate={onCreateOrg}
                    categoryTarget={categoryTarget}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirm}
        updateCount={totalUpdates}
        createCount={totalCreates}
        categoryLabel={categoryLabel}
        isApplying={isApplying}
      />
    </div>
  );
}

interface MatchRowProps {
  match: MatchResult;
  isSelected: boolean;
  onToggle: () => void;
  onEdit?: (orgId: string) => void;
  variant: 'exact' | 'fuzzy';
  categoryTarget: { field: string; value: string };
}

function MatchRow({ match, isSelected, onToggle, onEdit, variant, categoryTarget }: MatchRowProps) {
  const bgHover = variant === 'exact' ? 'hover:bg-green-50' : 'hover:bg-amber-50';

  // Determine current status based on category target field
  const currentValue =
    categoryTarget.field === 'trial_status'
      ? match.current_trial_status
      : match.current_status;

  const willChange = currentValue !== categoryTarget.value;

  return (
    <div className={`px-4 py-3 ${bgHover}`}>
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="w-4 h-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-900 truncate">
              {match.input}
            </span>
            <span className="text-neutral-400">→</span>
            <span className="text-neutral-700 truncate">{match.matched_name}</span>
          </div>
          {/* Status change indicator */}
          <div className="mt-1 text-xs flex items-center gap-2">
            <span className="text-neutral-400">{categoryTarget.field}:</span>
            <span className={`px-1.5 py-0.5 rounded ${
              currentValue ? 'bg-neutral-100 text-neutral-600' : 'bg-neutral-50 text-neutral-400'
            }`}>
              {formatStatus(currentValue)}
            </span>
            {willChange && (
              <>
                <ArrowRight className="w-3 h-3 text-violet-500" />
                <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">
                  {formatStatus(categoryTarget.value)}
                </span>
              </>
            )}
            {!willChange && currentValue && (
              <span className="text-neutral-400 italic">(no change)</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-medium px-2 py-0.5 rounded ${
              match.confidence >= 95
                ? 'bg-green-100 text-green-700'
                : match.confidence >= 70
                ? 'bg-amber-100 text-amber-700'
                : 'bg-orange-100 text-orange-700'
            }`}
          >
            {match.confidence}%
          </span>
          {onEdit && match.matched_id && (
            <button
              onClick={() => onEdit(match.matched_id!)}
              className="p-1.5 text-neutral-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
              title="Edit organization"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface NoMatchRowProps {
  match: MatchResult;
  isSelectedForCreate: boolean;
  onToggleCreate: () => void;
  onCreate?: (name: string) => void;
  categoryTarget: { field: string; value: string };
}

function NoMatchRow({
  match,
  isSelectedForCreate,
  onToggleCreate,
  onCreate,
  categoryTarget,
}: NoMatchRowProps) {
  return (
    <div className="px-4 py-3 hover:bg-red-50">
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={isSelectedForCreate}
          onChange={onToggleCreate}
          className="w-4 h-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
          title="Select to create new organization"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-900">{match.input}</span>
            <span className="text-sm text-red-600">No match found</span>
          </div>
          {/* Will be created with status */}
          {isSelectedForCreate && (
            <div className="mt-1 text-xs flex items-center gap-2">
              <span className="text-neutral-400">Will create with {categoryTarget.field}:</span>
              <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">
                {formatStatus(categoryTarget.value)}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSelectedForCreate && (
            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded">
              Will create
            </span>
          )}
          {onCreate && (
            <button
              onClick={() => onCreate(match.input)}
              className="p-1.5 text-neutral-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors flex items-center gap-1"
              title="Create organization with details"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
