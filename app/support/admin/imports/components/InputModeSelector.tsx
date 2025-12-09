'use client';

/**
 * InputModeSelector Component - Glassmorphism Edition
 *
 * A floating toggle switch with glass styling and smooth animations.
 */

import React from 'react';
import { cn } from '@/lib/utils';

export type InputMode = 'csv' | 'ai';

interface InputModeSelectorProps {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
}

export function InputModeSelector({ mode, onChange }: InputModeSelectorProps) {
  return (
    <div className="relative flex gap-1 p-1.5 bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] rounded-2xl">
      {/* Animated background pill */}
      <div
        className={cn(
          'absolute top-1.5 h-[calc(100%-12px)] w-[calc(50%-6px)] rounded-xl transition-all duration-300 ease-out',
          'bg-gradient-to-r from-purple-600 to-blue-600',
          'shadow-[0_0_20px_rgba(139,92,246,0.4)]',
          mode === 'csv' ? 'left-1.5' : 'left-[calc(50%+1.5px)]'
        )}
      />

      <button
        onClick={() => onChange('csv')}
        className={cn(
          'relative z-10 px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-300',
          'flex items-center gap-2',
          mode === 'csv'
            ? 'text-white'
            : 'text-white/50 hover:text-white/80'
        )}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        CSV
      </button>

      <button
        onClick={() => onChange('ai')}
        className={cn(
          'relative z-10 px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-300',
          'flex items-center gap-2',
          mode === 'ai'
            ? 'text-white'
            : 'text-white/50 hover:text-white/80'
        )}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        AI Parse
      </button>
    </div>
  );
}
