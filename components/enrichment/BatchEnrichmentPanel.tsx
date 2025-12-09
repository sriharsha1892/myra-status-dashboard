'use client';

/**
 * BatchEnrichmentPanel - Batch answer mode for enrichment questions
 * Allows answering the same question for multiple entities at once
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Square, CheckSquare, Sparkles, ChevronDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { QuestionWithContext, QuestionOption } from '@/lib/enrichment/types';

interface BatchEnrichmentPanelProps {
  question: QuestionWithContext;
  sessionId: string;
  onAnswer: (entityIds: string[], value: string) => Promise<void>;
  onSkip: (entityIds: string[]) => Promise<void>;
  onClose?: () => void;
}

interface EntitySelection {
  id: string;
  name: string;
  currentValue: unknown | null;
  selected: boolean;
  pendingValue: string | null;
}

export function BatchEnrichmentPanel({
  question,
  sessionId,
  onAnswer,
  onSkip,
  onClose,
}: BatchEnrichmentPanelProps) {
  // Initialize entity selections
  const [entities, setEntities] = useState<EntitySelection[]>(() =>
    question.entities.map((e) => ({
      ...e,
      selected: !e.currentValue, // Auto-select entities without values
      pendingValue: null,
    }))
  );

  const [bulkValue, setBulkValue] = useState<string | null>(
    question.aiSuggestion?.confidence && question.aiSuggestion.confidence >= 0.6
      ? question.aiSuggestion.value
      : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  // Computed values
  const selectedCount = useMemo(() => entities.filter((e) => e.selected).length, [entities]);
  const selectedEntities = useMemo(() => entities.filter((e) => e.selected), [entities]);
  const missingCount = useMemo(() => entities.filter((e) => !e.currentValue).length, [entities]);

  // Toggle entity selection
  const toggleEntity = useCallback((id: string) => {
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  }, []);

  // Select all/none
  const toggleAll = useCallback(() => {
    const allSelected = selectedCount === entities.length;
    setEntities((prev) => prev.map((e) => ({ ...e, selected: !allSelected })));
  }, [selectedCount, entities.length]);

  // Set individual entity value
  const setEntityValue = useCallback((id: string, value: string | null) => {
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, pendingValue: value } : e))
    );
    setShowDropdown(null);
  }, []);

  // Apply bulk value to all selected
  const applyBulkValue = useCallback(() => {
    if (!bulkValue) return;
    setEntities((prev) =>
      prev.map((e) => (e.selected ? { ...e, pendingValue: bulkValue } : e))
    );
  }, [bulkValue]);

  // Submit all answers
  const handleSubmit = useCallback(async () => {
    const toSubmit = entities.filter((e) => e.selected && e.pendingValue);
    if (toSubmit.length === 0) {
      toast.error('Select entities and set values to submit');
      return;
    }

    setIsSubmitting(true);
    try {
      // Group by value for efficient batch submission
      const valueGroups = toSubmit.reduce((acc, e) => {
        const val = e.pendingValue!;
        if (!acc[val]) acc[val] = [];
        acc[val].push(e.id);
        return acc;
      }, {} as Record<string, string[]>);

      // Submit each value group
      for (const [value, entityIds] of Object.entries(valueGroups)) {
        await onAnswer(entityIds, value);
      }

      toast.success(`Updated ${toSubmit.length} ${question.entityType === 'organization' ? 'orgs' : 'contacts'}`);

      // Mark submitted entities as no longer selected
      setEntities((prev) =>
        prev.map((e) =>
          toSubmit.find((s) => s.id === e.id)
            ? { ...e, selected: false, currentValue: e.pendingValue, pendingValue: null }
            : e
        )
      );
    } catch (error) {
      console.error('Batch submit error:', error);
      toast.error('Failed to submit answers');
    } finally {
      setIsSubmitting(false);
    }
  }, [entities, onAnswer, question.entityType]);

  // Skip selected
  const handleSkip = useCallback(async () => {
    if (selectedCount === 0) return;

    setIsSubmitting(true);
    try {
      await onSkip(selectedEntities.map((e) => e.id));
      toast.success(`Skipped ${selectedCount} entities`);
      setEntities((prev) => prev.map((e) => ({ ...e, selected: false })));
    } catch (error) {
      console.error('Skip error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCount, selectedEntities, onSkip]);

  const options = question.options || [];

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-neutral-900">{question.label}</h3>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
            {missingCount} missing
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* AI Suggestion Banner */}
      {question.aiSuggestion && question.aiSuggestion.confidence >= 0.6 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-violet-50 border-b border-violet-200">
          <Sparkles className="w-4 h-4 text-violet-600 flex-shrink-0" />
          <span className="text-xs text-violet-700">
            AI suggests: <strong>{options.find((o) => o.value === question.aiSuggestion?.value)?.label || question.aiSuggestion.value}</strong>
            <span className="text-violet-500 ml-1">
              ({Math.round(question.aiSuggestion.confidence * 100)}% confident)
            </span>
          </span>
        </div>
      )}

      {/* Bulk Actions Bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-neutral-50/50 border-b border-neutral-100">
        <button
          onClick={toggleAll}
          className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900"
        >
          {selectedCount === entities.length ? (
            <CheckSquare className="w-4 h-4 text-blue-600" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          {selectedCount === entities.length ? 'Deselect All' : 'Select All'}
        </button>

        <div className="h-4 w-px bg-neutral-200" />

        {/* Bulk Value Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Set all to:</span>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(showDropdown === 'bulk' ? null : 'bulk')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-neutral-200 rounded-md bg-white hover:bg-neutral-50"
            >
              {bulkValue ? options.find((o) => o.value === bulkValue)?.label : 'Select...'}
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>
            <AnimatePresence>
              {showDropdown === 'bulk' && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-10 top-full left-0 mt-1 w-40 bg-white border border-neutral-200 rounded-md shadow-lg"
                >
                  {options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setBulkValue(option.value);
                        setShowDropdown(null);
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-xs hover:bg-neutral-50',
                        bulkValue === option.value && 'bg-blue-50 text-blue-700'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={applyBulkValue}
            disabled={!bulkValue || selectedCount === 0}
            className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply to {selectedCount} selected
          </button>
        </div>
      </div>

      {/* Entity List */}
      <div className="max-h-[300px] overflow-y-auto divide-y divide-neutral-100">
        {entities.map((entity) => (
          <div
            key={entity.id}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 transition-colors',
              entity.selected ? 'bg-blue-50/30' : 'hover:bg-neutral-50'
            )}
          >
            {/* Checkbox */}
            <button
              onClick={() => toggleEntity(entity.id)}
              className="flex-shrink-0"
            >
              {entity.selected ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-neutral-300" />
              )}
            </button>

            {/* Entity Name */}
            <div className="flex-1 min-w-0">
              <span className="text-sm text-neutral-900 truncate">{entity.name}</span>
              {entity.currentValue && (
                <span className="ml-2 text-xs text-neutral-500">
                  (current: {String(entity.currentValue)})
                </span>
              )}
            </div>

            {/* Value Selector */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(showDropdown === entity.id ? null : entity.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-md min-w-[100px] justify-between',
                  entity.pendingValue
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                )}
              >
                {entity.pendingValue
                  ? options.find((o) => o.value === entity.pendingValue)?.label
                  : '—'}
                <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {showDropdown === entity.id && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute z-10 top-full right-0 mt-1 w-36 bg-white border border-neutral-200 rounded-md shadow-lg"
                  >
                    {options.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setEntityValue(entity.id, option.value)}
                        className={cn(
                          'w-full px-3 py-2 text-left text-xs hover:bg-neutral-50',
                          entity.pendingValue === option.value && 'bg-blue-50 text-blue-700'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                    {entity.pendingValue && (
                      <>
                        <div className="border-t border-neutral-100" />
                        <button
                          onClick={() => setEntityValue(entity.id, null)}
                          className="w-full px-3 py-2 text-left text-xs text-neutral-500 hover:bg-neutral-50"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-t border-neutral-200">
        <button
          onClick={handleSkip}
          disabled={selectedCount === 0 || isSubmitting}
          className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Skip {selectedCount > 0 && `(${selectedCount})`}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">
            {entities.filter((e) => e.selected && e.pendingValue).length} ready to submit
          </span>
          <button
            onClick={handleSubmit}
            disabled={entities.filter((e) => e.selected && e.pendingValue).length === 0 || isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Submit Answers
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BatchEnrichmentPanel;
