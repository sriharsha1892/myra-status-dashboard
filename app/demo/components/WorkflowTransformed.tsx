'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkflowStageCard } from './shared/GlowingCard';
import { AnimatedArrow } from './shared/FloatingElements';
import ValuePillars from './ValuePillars';
import { cn } from '@/lib/utils';

interface WorkflowTransformedProps {
  companyName: string;
  onContinue: () => void;
  onSkipToDemo: () => void;
  onBack: () => void;
}

// myRA workflow stages - compressed and efficient
const MYRA_STAGES = [
  {
    id: 'scope',
    name: 'Collaborative Scoping',
    icon: '✨',
    time: 'Minutes',
    description: 'AI-driven clarity',
    highlight: 'No guessing',
  },
  {
    id: 'research',
    name: 'Multi-Agent Research',
    icon: '🤖',
    time: 'Hours',
    description: '30K+ databases',
    highlight: 'Parallel execution',
  },
  {
    id: 'validate',
    name: 'Validation',
    icon: '✓',
    time: 'Instant',
    description: 'Confidence scores',
    highlight: 'Every source cited',
  },
  {
    id: 'export',
    name: 'Export',
    icon: '📊',
    time: 'Ready',
    description: 'PPT, PDF, Dashboard',
    highlight: 'Decision-grade',
  },
];

export default function WorkflowTransformed({
  companyName,
  onContinue,
  onSkipToDemo,
  onBack,
}: WorkflowTransformedProps) {
  const [animationPhase, setAnimationPhase] = useState(0);
  const [showPillars, setShowPillars] = useState(false);

  // Trigger animation phases
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Phase 1: Show transformation header
    timers.push(setTimeout(() => setAnimationPhase(1), 100));

    // Phase 2: Show stages
    timers.push(setTimeout(() => setAnimationPhase(2), 500));

    // Phase 3: Show time badges
    timers.push(setTimeout(() => setAnimationPhase(3), 1200));

    // Phase 4: Show summary
    timers.push(setTimeout(() => setAnimationPhase(4), 1800));

    // Phase 5: Show pillars
    timers.push(setTimeout(() => {
      setAnimationPhase(5);
      setShowPillars(true);
    }, 2400));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 overflow-auto">
      {/* Header with transformation effect */}
      <AnimatePresence>
        {animationPhase >= 1 && (
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <motion.div
              className="inline-block mb-4"
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <span className="text-5xl">✨</span>
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
              With <span className="text-emerald-400">myRA</span>
            </h1>
            <p className="text-lg text-white/60">
              The same research. Dramatically faster. Infinitely more reliable.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transformed Workflow Diagram */}
      <div className="flex-1">
        <div className="w-full max-w-5xl mx-auto">
          {/* Stages Row */}
          <div className="flex items-center justify-center gap-2 md:gap-4 mb-8 flex-wrap md:flex-nowrap">
            {MYRA_STAGES.map((stage, index) => {
              const shouldShow = animationPhase >= 2;

              return (
                <div key={stage.id} className="flex items-center">
                  {/* Stage Card */}
                  <AnimatePresence>
                    {shouldShow && (
                      <motion.div
                        className="relative"
                        initial={{ opacity: 0, scale: 0.5, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{
                          duration: 0.5,
                          delay: index * 0.12,
                          type: 'spring',
                          stiffness: 200,
                        }}
                      >
                        <WorkflowStageCard
                          status="solution"
                          delay={index * 0.12}
                          className="w-32 md:w-40"
                        >
                          <div className="relative z-10 text-center">
                            <div className="text-3xl mb-2">{stage.icon}</div>
                            <h4 className="text-sm font-semibold text-white mb-1">
                              {stage.name}
                            </h4>
                            <p className="text-[10px] text-emerald-400 font-medium">
                              {stage.highlight}
                            </p>
                          </div>
                        </WorkflowStageCard>

                        {/* Time badge - now green and fast */}
                        <AnimatePresence>
                          {animationPhase >= 3 && (
                            <motion.div
                              className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              initial={{ opacity: 0, y: -10, scale: 0.8 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{
                                duration: 0.3,
                                delay: index * 0.1,
                                type: 'spring',
                              }}
                            >
                              {stage.time}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Arrow between stages */}
                  {index < MYRA_STAGES.length - 1 && (
                    <motion.div
                      className="mx-1 md:mx-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: animationPhase >= 2 ? 1 : 0 }}
                      transition={{ duration: 0.3, delay: 0.6 + index * 0.12 }}
                    >
                      <AnimatedArrow
                        direction="right"
                        color="green"
                        animated={true}
                      />
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary Stats - Green/Positive */}
          <AnimatePresence>
            {animationPhase >= 4 && (
              <motion.div
                className="mt-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
                  <div className="text-center mb-4">
                    <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
                      The myRA Difference
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {/* Time */}
                    <motion.div
                      className="text-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="text-3xl mb-2">⚡</div>
                      <div className="text-2xl font-bold text-white mb-1">
                        Hours, not weeks
                      </div>
                      <div className="text-sm text-white/50">Research velocity</div>
                    </motion.div>

                    {/* Trust */}
                    <motion.div
                      className="text-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="text-3xl mb-2">✓</div>
                      <div className="text-2xl font-bold text-white mb-1">
                        Decision-grade
                      </div>
                      <div className="text-sm text-white/50">Every source cited</div>
                    </motion.div>

                    {/* Cost */}
                    <motion.div
                      className="text-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="text-3xl mb-2">💎</div>
                      <div className="text-2xl font-bold text-white mb-1">
                        Predictable
                      </div>
                      <div className="text-sm text-white/50">Subscription pricing</div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Value Pillars */}
          <AnimatePresence>
            {showPillars && (
              <motion.div
                className="mt-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <ValuePillars />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Continue Button */}
          <AnimatePresence>
            {animationPhase >= 5 && (
              <motion.div
                className="mt-10 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <motion.button
                  onClick={onContinue}
                  className={cn(
                    'px-10 py-4 rounded-xl font-semibold text-white text-lg',
                    'bg-gradient-to-r from-emerald-600 to-teal-600',
                    'hover:from-emerald-500 hover:to-teal-500',
                    'shadow-xl shadow-emerald-500/25',
                    'transition-all duration-300'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Take me to myRA →
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Navigation */}
      <motion.div
        className="mt-8 flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/50 hover:text-white/70 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <button
          onClick={onSkipToDemo}
          className="text-sm text-white/40 hover:text-white/60 transition-colors"
        >
          Skip to Product Demo
        </button>
      </motion.div>
    </div>
  );
}
