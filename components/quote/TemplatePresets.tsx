'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import type { QuoteRow } from '@/lib/quote/types';
import { TEMPLATE_PRESETS } from '@/lib/quote/constants';

interface TemplatePresetsProps {
  onApplyPreset: (rows: QuoteRow[]) => void;
}

export function TemplatePresets({ onApplyPreset }: TemplatePresetsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <Zap className="w-4 h-4 text-violet-500" />
        <span className="font-medium">Quick Templates</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {TEMPLATE_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => onApplyPreset(preset.rows)}
            className="group relative px-3 py-1.5 text-sm bg-violet-50 text-violet-700 rounded-lg border border-violet-200 hover:bg-violet-100 hover:border-violet-300 transition-colors"
          >
            <span className="font-medium">{preset.name}</span>
            {/* Tooltip on hover */}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-neutral-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {preset.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
