'use client';

/**
 * EnrichmentChoiceChips - Horizontal chip selection
 * Linear-style compact chips with keyboard shortcuts and AI pre-selection
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { chipVariants } from './animations';
import type { QuestionOption, AISuggestion } from '@/lib/enrichment/types';

interface EnrichmentChoiceChipsProps {
  options: QuestionOption[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  aiSuggestion?: AISuggestion;
  disabled?: boolean;
}

export function EnrichmentChoiceChips({
  options,
  selectedIndex,
  onSelect,
  aiSuggestion,
  disabled = false,
}: EnrichmentChoiceChipsProps) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        const isAISuggested = aiSuggestion?.value === option.value && aiSuggestion.confidence >= 0.6;

        return (
          <motion.button
            key={option.value}
            variants={chipVariants}
            initial="initial"
            animate={isSelected ? 'selected' : 'initial'}
            whileHover={!disabled ? 'hover' : undefined}
            whileTap={!disabled ? 'tap' : undefined}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onSelect(index);
            }}
            disabled={disabled}
            className={cn(
              'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors',
              isSelected
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : isAISuggested
                  ? 'border-violet-300 bg-violet-50/50 text-neutral-700 ring-1 ring-violet-300 hover:bg-violet-50'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {/* Keyboard shortcut number */}
            <span
              className={cn(
                'text-[10px] font-mono tabular-nums',
                isSelected ? 'text-blue-400' : 'text-neutral-400'
              )}
            >
              {index + 1}
            </span>

            {/* Label */}
            <span className="whitespace-nowrap">{option.label}</span>

            {/* AI suggestion indicator (violet dot) */}
            {isAISuggested && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0"
                title={`AI suggests (${Math.round(aiSuggestion.confidence * 100)}% confident)`}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export default EnrichmentChoiceChips;
