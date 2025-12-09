/**
 * ReasoningPanel - Shows AI's understanding of the input
 *
 * Displays:
 * - Highlighted extraction spans from original text
 * - Confidence breakdown (parse, org, user weights)
 * - AI's reasoning explanation
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Brain, Sparkles } from 'lucide-react';
import type { ExtractionSpan, ConfidenceBreakdown } from '@/lib/command/types';

// Span type colors - light theme
const spanColors: Record<string, { bg: string; text: string; border: string }> = {
  org: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  user: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  action: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  value: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  date: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  status: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  stage: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  note: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  priority: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

// Span type labels
const spanLabels: Record<string, string> = {
  org: 'Organization',
  user: 'Person',
  action: 'Activity',
  value: 'Amount',
  date: 'Date',
  status: 'Status',
  stage: 'Stage',
  note: 'Note',
  priority: 'Priority',
};

interface ReasoningPanelProps {
  reasoning?: string;
  extractedSpans?: ExtractionSpan[];
  confidenceBreakdown?: ConfidenceBreakdown;
  originalText?: string;
  defaultExpanded?: boolean;
}

export function ReasoningPanel({
  reasoning,
  extractedSpans,
  confidenceBreakdown,
  originalText,
  defaultExpanded = false,
}: ReasoningPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // If no data to show, return null
  if (!reasoning && !extractedSpans?.length && !confidenceBreakdown) {
    return null;
  }

  return (
    <div className="mt-2">
      {/* Toggle header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors group"
      >
        <Brain className="w-3.5 h-3.5" />
        <span className="font-medium">How I understood this</span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 opacity-50 group-hover:opacity-100" />
        ) : (
          <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              {/* Extracted spans visualization */}
              {extractedSpans && extractedSpans.length > 0 && originalText && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-600 mb-2">Extracted from your input:</div>
                  <HighlightedText text={originalText} spans={extractedSpans} />
                </div>
              )}

              {/* Extraction chips */}
              {extractedSpans && extractedSpans.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {extractedSpans.map((span, i) => {
                      const colors = spanColors[span.type] || spanColors.note;
                      const label = spanLabels[span.type] || span.type;
                      return (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
                        >
                          <span className="opacity-60">{label}:</span>
                          <span className="font-medium">{span.text}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Confidence breakdown */}
              {confidenceBreakdown && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-600 mb-2">Confidence breakdown:</div>
                  <ConfidenceBar breakdown={confidenceBreakdown} />
                </div>
              )}

              {/* AI reasoning */}
              {reasoning && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-accent-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600 leading-relaxed">{reasoning}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * HighlightedText - Renders text with extraction spans highlighted
 */
function HighlightedText({ text, spans }: { text: string; spans: ExtractionSpan[] }) {
  // Sort spans by start position
  const sortedSpans = [...spans]
    .filter(s => s.start !== undefined && s.end !== undefined)
    .sort((a, b) => (a.start || 0) - (b.start || 0));

  if (sortedSpans.length === 0) {
    // No position info, just show the text with quoted spans highlighted
    return (
      <div className="text-sm text-gray-800 bg-white border border-gray-200 rounded px-2 py-1.5 font-mono">
        {highlightByMatching(text, spans)}
      </div>
    );
  }

  // Build segments with highlights
  const segments: Array<{ text: string; type?: string }> = [];
  let lastEnd = 0;

  for (const span of sortedSpans) {
    const start = span.start || 0;
    const end = span.end || start;

    // Add text before this span
    if (start > lastEnd) {
      segments.push({ text: text.slice(lastEnd, start) });
    }

    // Add the span
    segments.push({ text: text.slice(start, end), type: span.type });
    lastEnd = end;
  }

  // Add remaining text
  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd) });
  }

  return (
    <div className="text-sm text-gray-800 bg-white border border-gray-200 rounded px-2 py-1.5 font-mono whitespace-pre-wrap">
      {segments.map((segment, i) => {
        if (!segment.type) {
          return <span key={i}>{segment.text}</span>;
        }
        const colors = spanColors[segment.type] || spanColors.note;
        return (
          <span
            key={i}
            className={`px-1 rounded ${colors.bg} ${colors.text} font-medium`}
          >
            {segment.text}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Fallback: highlight by matching span text in the input
 */
function highlightByMatching(text: string, spans: ExtractionSpan[]): React.ReactNode[] {
  let result: React.ReactNode[] = [text];

  for (const span of spans) {
    const newResult: React.ReactNode[] = [];
    for (const segment of result) {
      if (typeof segment !== 'string') {
        newResult.push(segment);
        continue;
      }

      const parts = segment.split(new RegExp(`(${escapeRegex(span.text)})`, 'gi'));
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].toLowerCase() === span.text.toLowerCase()) {
          const colors = spanColors[span.type] || spanColors.note;
          newResult.push(
            <span key={`${span.text}-${i}`} className={`px-1 rounded ${colors.bg} ${colors.text} font-medium`}>
              {parts[i]}
            </span>
          );
        } else if (parts[i]) {
          newResult.push(parts[i]);
        }
      }
    }
    result = newResult;
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * ConfidenceBar - Visual breakdown of confidence factors
 */
function ConfidenceBar({ breakdown }: { breakdown: ConfidenceBreakdown }) {
  const parsePercent = Math.round(breakdown.parse * 100);
  const orgPercent = Math.round(breakdown.org * 100);
  const userPercent = Math.round(breakdown.user * 100);
  const combinedPercent = Math.round(breakdown.combined * 100);

  // Calculate weighted contributions
  const parseWeight = breakdown.weights?.parse || 0.4;
  const orgWeight = breakdown.weights?.org || 0.4;
  const userWeight = breakdown.weights?.user || 0.2;

  return (
    <div className="space-y-2">
      {/* Combined confidence bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${combinedPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              combinedPercent >= 90
                ? 'bg-green-500'
                : combinedPercent >= 70
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
          />
        </div>
        <span className="text-xs font-medium text-gray-700 w-10 text-right">{combinedPercent}%</span>
      </div>

      {/* Breakdown pills */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-100 text-accent-700 rounded">
          <span className="opacity-60">Parse:</span>
          <span className="font-medium">{parsePercent}%</span>
          <span className="opacity-40">({Math.round(parseWeight * 100)}%)</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
          <span className="opacity-60">Org:</span>
          <span className="font-medium">{orgPercent}%</span>
          <span className="opacity-40">({Math.round(orgWeight * 100)}%)</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
          <span className="opacity-60">User:</span>
          <span className="font-medium">{userPercent}%</span>
          <span className="opacity-40">({Math.round(userWeight * 100)}%)</span>
        </span>
      </div>
    </div>
  );
}

export default ReasoningPanel;
