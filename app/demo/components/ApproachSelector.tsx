'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import GlowingCard from './shared/GlowingCard';
import { cn } from '@/lib/utils';

export type Approach = 'internal' | 'ai-tools' | 'consultants';

interface ApproachSelectorProps {
  companyName: string;
  onApproachesSelect: (approaches: Approach[]) => void;
  onSkipToDemo: () => void;
  onBack: () => void;
}

const APPROACHES: {
  id: Approach;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
}[] = [
  {
    id: 'internal',
    title: 'Internal Team',
    subtitle: 'In-house analysts & researchers',
    description: 'Your team handles research using internal resources, databases, and manual processes',
    icon: '👥',
  },
  {
    id: 'ai-tools',
    title: 'AI Tools',
    subtitle: 'Generic or custom-built AI',
    description: 'Using general AI assistants or internally-built AI solutions for research tasks',
    icon: '🤖',
  },
  {
    id: 'consultants',
    title: 'Consultants',
    subtitle: 'External research firms',
    description: 'Engaging McKinsey, BCG, specialized research firms, or freelance consultants',
    icon: '📊',
  },
];

export default function ApproachSelector({
  companyName,
  onApproachesSelect,
  onSkipToDemo,
  onBack,
}: ApproachSelectorProps) {
  const [selectedApproaches, setSelectedApproaches] = useState<Set<Approach>>(new Set());

  const toggleApproach = (approach: Approach) => {
    const newSet = new Set(selectedApproaches);
    if (newSet.has(approach)) {
      newSet.delete(approach);
    } else {
      newSet.add(approach);
    }
    setSelectedApproaches(newSet);
  };

  const handleContinue = () => {
    if (selectedApproaches.size > 0) {
      onApproachesSelect(Array.from(selectedApproaches));
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8">
      {/* Header */}
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
          How does <span className="text-violet-400">{companyName}</span> handle market research today?
        </h1>
        <p className="text-lg text-white/60">
          Select all that apply — most teams use a combination
        </p>
      </motion.div>

      {/* Approach Cards */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
          {APPROACHES.map((approach, index) => {
            const isSelected = selectedApproaches.has(approach.id);

            return (
              <motion.div
                key={approach.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <GlowingCard
                  selected={isSelected}
                  onClick={() => toggleApproach(approach.id)}
                  glowColor="violet"
                  className="h-full"
                >
                  <div className="p-6">
                    {/* Icon */}
                    <div className="text-5xl mb-4">{approach.icon}</div>

                    {/* Title */}
                    <h3 className="text-xl font-semibold text-white mb-1">
                      {approach.title}
                    </h3>
                    <p className="text-sm text-white/50 mb-4">
                      {approach.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-sm text-white/60 leading-relaxed">
                      {approach.description}
                    </p>

                    {/* Selection state */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className={cn(
                        'flex items-center gap-2 text-sm',
                        isSelected ? 'text-violet-400' : 'text-white/40'
                      )}>
                        <div className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                          isSelected
                            ? 'bg-violet-500 border-violet-500'
                            : 'border-white/30'
                        )}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span>{isSelected ? 'Selected' : 'Click to select'}</span>
                      </div>
                    </div>
                  </div>
                </GlowingCard>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <motion.div
        className="mt-8 flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={selectedApproaches.size === 0}
          className={cn(
            'px-10 py-4 rounded-xl font-semibold text-white text-lg',
            'transition-all duration-300',
            selectedApproaches.size > 0
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-xl shadow-violet-500/25 cursor-pointer'
              : 'bg-white/10 opacity-50 cursor-not-allowed'
          )}
        >
          {selectedApproaches.size === 0
            ? 'Select at least one approach'
            : selectedApproaches.size === 1
            ? 'Continue with 1 approach'
            : `Continue with ${selectedApproaches.size} approaches`}
        </button>

        {/* Navigation */}
        <div className="flex items-center gap-6 text-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/50 hover:text-white/70 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <span className="text-white/20">|</span>

          <button
            onClick={onSkipToDemo}
            className="text-white/40 hover:text-white/60 transition-colors"
          >
            Skip to Product Demo
          </button>
        </div>
      </motion.div>
    </div>
  );
}
