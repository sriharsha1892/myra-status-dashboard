'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Approach } from './ApproachSelector';
import { WorkflowStageCard } from './shared/GlowingCard';
import { AnimatedArrow, FloatingElementsContainer, PulsingGlow } from './shared/FloatingElements';
import AnimatedCounter from './shared/AnimatedCounter';
import { cn } from '@/lib/utils';

interface WorkflowVisualizationProps {
  companyName: string;
  selectedApproaches: Approach[];
  onContinue: () => void;
  onSkipToDemo: () => void;
  onBack: () => void;
}

// Workflow stages with pain metrics
const WORKFLOW_STAGES = [
  {
    id: 'request',
    name: 'Request',
    icon: '📝',
    time: '1-2 days',
    timeValue: 1.5,
    description: 'Defining requirements',
    painLevel: 'low',
  },
  {
    id: 'scope',
    name: 'Scoping',
    icon: '🎯',
    time: '3-5 days',
    timeValue: 4,
    description: 'Back-and-forth alignment',
    painLevel: 'medium',
  },
  {
    id: 'research',
    name: 'Research',
    icon: '🔍',
    time: '2-4 weeks',
    timeValue: 21,
    description: 'Data gathering & analysis',
    painLevel: 'high',
  },
  {
    id: 'validate',
    name: 'Validation',
    icon: '✓',
    time: '1-2 weeks',
    timeValue: 10.5,
    description: 'Verification & QA',
    painLevel: 'high',
  },
];

// Pain summaries based on selected approaches
const PAIN_SUMMARIES: Record<Approach, { time: string; cost: string; confidence: string }> = {
  internal: {
    time: '4-8 weeks',
    cost: '$50K-200K',
    confidence: 'Variable',
  },
  'ai-tools': {
    time: '1-3 days',
    cost: 'Low',
    confidence: 'Unreliable',
  },
  consultants: {
    time: '6-12 weeks',
    cost: '$100K-500K',
    confidence: 'High but opaque',
  },
};

export default function WorkflowVisualization({
  companyName,
  selectedApproaches,
  onContinue,
  onSkipToDemo,
  onBack,
}: WorkflowVisualizationProps) {
  const [animationPhase, setAnimationPhase] = useState(0);
  const [showPainEffects, setShowPainEffects] = useState(false);

  // Calculate aggregate pain metrics
  const getAggregateMetrics = () => {
    // If they use consultants or internal team, time is longer
    const hasConsultants = selectedApproaches.includes('consultants');
    const hasInternal = selectedApproaches.includes('internal');
    const hasAI = selectedApproaches.includes('ai-tools');

    let time = '4-8 weeks';
    let cost = '$50K-200K';
    let confidence = 'Variable quality';

    if (hasConsultants) {
      time = '6-12 weeks';
      cost = '$100K-500K+';
      confidence = 'High but black-box';
    } else if (hasInternal && hasAI) {
      time = '3-6 weeks';
      cost = '$30K-100K';
      confidence = 'Mixed reliability';
    } else if (hasAI && !hasInternal) {
      time = '1-3 days';
      cost = 'Low';
      confidence = 'Unreliable - no citations';
    }

    return { time, cost, confidence };
  };

  const metrics = getAggregateMetrics();

  // Trigger animation phases
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Phase 1: Show stages (immediate)
    timers.push(setTimeout(() => setAnimationPhase(1), 100));

    // Phase 2: Show time labels
    timers.push(setTimeout(() => setAnimationPhase(2), 800));

    // Phase 3: Pain effects
    timers.push(setTimeout(() => {
      setAnimationPhase(3);
      setShowPainEffects(true);
    }, 1500));

    // Phase 4: Summary
    timers.push(setTimeout(() => setAnimationPhase(4), 2500));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 overflow-auto">
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
          Your Current Research Workflow
        </h1>
        <p className="text-lg text-white/60">
          Here&apos;s what {companyName}&apos;s typical research process looks like
        </p>
      </motion.div>

      {/* Workflow Diagram */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-5xl">
          {/* Stages Row */}
          <div className="flex items-center justify-center gap-2 md:gap-4 mb-8 flex-wrap md:flex-nowrap">
            {WORKFLOW_STAGES.map((stage, index) => {
              const isBottleneck = stage.painLevel === 'high';
              const shouldShow = animationPhase >= 1;

              return (
                <div key={stage.id} className="flex items-center">
                  {/* Stage Card */}
                  <AnimatePresence>
                    {shouldShow && (
                      <motion.div
                        className="relative"
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.15 }}
                      >
                        <WorkflowStageCard
                          status={showPainEffects && isBottleneck ? 'pain' : 'neutral'}
                          delay={index * 0.15}
                          className="w-32 md:w-40"
                        >
                          {/* Pain glow effect */}
                          {showPainEffects && isBottleneck && (
                            <PulsingGlow color="red" intensity="medium" />
                          )}

                          <div className="relative z-10 text-center">
                            <div className="text-3xl mb-2">{stage.icon}</div>
                            <h4 className="text-sm font-semibold text-white mb-1">
                              {stage.name}
                            </h4>
                            <p className="text-[10px] text-white/50">
                              {stage.description}
                            </p>
                          </div>
                        </WorkflowStageCard>

                        {/* Time badge */}
                        <AnimatePresence>
                          {animationPhase >= 2 && (
                            <motion.div
                              className={cn(
                                'absolute -bottom-8 left-1/2 -translate-x-1/2',
                                'px-3 py-1 rounded-full text-xs font-semibold',
                                'whitespace-nowrap',
                                isBottleneck
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-white/10 text-white/70 border border-white/20'
                              )}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                              {stage.time}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Floating pain elements */}
                        {showPainEffects && isBottleneck && (
                          <div className="absolute top-0 left-1/2 -translate-x-1/2">
                            <FloatingElementsContainer
                              type={index === 2 ? 'dollar' : 'clock'}
                              count={3}
                              duration={3}
                              staggerDelay={0.5}
                            />
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Arrow between stages */}
                  {index < WORKFLOW_STAGES.length - 1 && (
                    <motion.div
                      className="mx-1 md:mx-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: animationPhase >= 1 ? 1 : 0 }}
                      transition={{ duration: 0.3, delay: 0.5 + index * 0.15 }}
                    >
                      <AnimatedArrow
                        direction="right"
                        color={showPainEffects ? 'red' : 'gray'}
                        animated={showPainEffects}
                      />
                    </motion.div>
                  )}
                </div>
              );
            })}

            {/* Output */}
            <motion.div
              className="flex items-center ml-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: animationPhase >= 1 ? 1 : 0 }}
              transition={{ duration: 0.3, delay: 0.8 }}
            >
              <span className="text-2xl">📤</span>
              <span className="ml-2 text-sm text-white/50">Output</span>
            </motion.div>
          </div>

          {/* Summary Stats */}
          <AnimatePresence>
            {animationPhase >= 4 && (
              <motion.div
                className="mt-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                  <div className="text-center mb-4">
                    <span className="text-sm font-semibold text-red-400 uppercase tracking-wider">
                      The Reality
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {/* Time */}
                    <div className="text-center">
                      <div className="text-3xl mb-2">⏱️</div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {metrics.time}
                      </div>
                      <div className="text-sm text-white/50">Average timeline</div>
                    </div>

                    {/* Cost */}
                    <div className="text-center">
                      <div className="text-3xl mb-2">💰</div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {metrics.cost}
                      </div>
                      <div className="text-sm text-white/50">Typical cost</div>
                    </div>

                    {/* Confidence */}
                    <div className="text-center">
                      <div className="text-3xl mb-2">❓</div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {metrics.confidence}
                      </div>
                      <div className="text-sm text-white/50">Confidence level</div>
                    </div>
                  </div>
                </div>

                {/* Continue Button */}
                <div className="mt-8 text-center">
                  <motion.button
                    onClick={onContinue}
                    className={cn(
                      'px-10 py-4 rounded-xl font-semibold text-white text-lg',
                      'bg-gradient-to-r from-violet-600 to-purple-600',
                      'hover:from-violet-500 hover:to-purple-500',
                      'shadow-xl shadow-violet-500/25',
                      'transition-all duration-300'
                    )}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    See how myRA changes this →
                  </motion.button>
                </div>
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
