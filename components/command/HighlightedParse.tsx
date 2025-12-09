'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ExtractionSpan } from '@/lib/command/types';

interface HighlightedParseProps {
  originalText: string;
  spans: ExtractionSpan[];
  showLabels?: boolean;
}

const spanConfig: Record<ExtractionSpan['type'], { bg: string; text: string; label: string; border: string }> = {
  org: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    label: 'org',
    border: 'border-purple-300',
  },
  user: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    label: 'user',
    border: 'border-blue-300',
  },
  action: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    label: 'action',
    border: 'border-green-300',
  },
  value: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    label: 'value',
    border: 'border-amber-300',
  },
  date: {
    bg: 'bg-teal-100',
    text: 'text-teal-800',
    label: 'date',
    border: 'border-teal-300',
  },
  status: {
    bg: 'bg-rose-100',
    text: 'text-rose-800',
    label: 'status',
    border: 'border-rose-300',
  },
};

interface TextSegment {
  text: string;
  type: ExtractionSpan['type'] | 'plain';
  span?: ExtractionSpan;
}

export function HighlightedParse({ originalText, spans, showLabels = true }: HighlightedParseProps) {
  // Build segments by merging spans with original text
  const segments = useMemo(() => {
    if (!spans || spans.length === 0) {
      return [{ text: originalText, type: 'plain' as const }];
    }

    // Sort spans by start position
    const sortedSpans = [...spans].sort((a, b) => a.start - b.start);

    const result: TextSegment[] = [];
    let lastEnd = 0;

    for (const span of sortedSpans) {
      // Validate span indices
      if (span.start < 0 || span.end > originalText.length || span.start >= span.end) {
        continue;
      }

      // Add plain text before this span
      if (span.start > lastEnd) {
        result.push({
          text: originalText.substring(lastEnd, span.start),
          type: 'plain',
        });
      }

      // Add the highlighted span
      result.push({
        text: originalText.substring(span.start, span.end),
        type: span.type,
        span,
      });

      lastEnd = span.end;
    }

    // Add remaining plain text
    if (lastEnd < originalText.length) {
      result.push({
        text: originalText.substring(lastEnd),
        type: 'plain',
      });
    }

    return result;
  }, [originalText, spans]);

  if (!spans || spans.length === 0) {
    return (
      <div className="font-mono text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
        {originalText}
      </div>
    );
  }

  return (
    <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg">
      <div className="flex flex-wrap items-baseline gap-0.5">
        {segments.map((segment, index) => {
          if (segment.type === 'plain') {
            return (
              <span key={index} className="text-gray-600">
                {segment.text}
              </span>
            );
          }

          const config = spanConfig[segment.type];

          return (
            <motion.span
              key={index}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative inline-flex flex-col items-center"
            >
              <span
                className={`px-1.5 py-0.5 rounded ${config.bg} ${config.text} border ${config.border} font-medium`}
              >
                {segment.text}
              </span>
              {showLabels && (
                <motion.span
                  initial={{ y: -5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                  className={`text-[10px] ${config.text} mt-0.5 font-sans`}
                >
                  ^{config.label}
                </motion.span>
              )}
            </motion.span>
          );
        })}
      </div>

      {/* Legend */}
      {showLabels && (
        <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-gray-200">
          {Object.entries(spanConfig).map(([type, config]) => {
            const hasType = spans.some(s => s.type === type);
            if (!hasType) return null;

            return (
              <div key={type} className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded ${config.bg} border ${config.border}`} />
                <span className="text-xs text-gray-500">{config.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
