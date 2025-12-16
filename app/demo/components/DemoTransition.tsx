'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { INDUSTRY_CONFIG, Industry } from '../data/companies';

interface DemoTransitionProps {
  companyName: string;
  industry: Industry | null;
  onStartOver: () => void;
}

export default function DemoTransition({
  companyName,
  industry,
  onStartOver,
}: DemoTransitionProps) {
  const industryConfig = industry ? INDUSTRY_CONFIG[industry] : null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8">
      <motion.div
        className="max-w-2xl w-full text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Celebration effect */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        >
          <div className="text-6xl mb-4">🚀</div>
        </motion.div>

        {/* Main Message */}
        <motion.h1
          className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Let&apos;s see it in action
        </motion.h1>

        {/* Personalized Context */}
        <motion.p
          className="text-xl text-white/70 mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {companyName ? (
            <>
              For <span className="text-violet-400 font-semibold">{companyName}</span>
              {industryConfig && (
                <>, we&apos;ll focus on {industryConfig.emphasis}</>
              )}
            </>
          ) : (
            <>Ready to see how myRA delivers decision-grade intelligence in hours, not weeks</>
          )}
        </motion.p>

        {/* Primary CTA */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <a
            href="https://ask-myra.ai"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-3 px-12 py-5 rounded-2xl',
              'font-bold text-white text-xl',
              'bg-gradient-to-r from-violet-600 to-purple-600',
              'hover:from-violet-500 hover:to-purple-500',
              'shadow-2xl shadow-violet-500/30',
              'transition-all duration-300 transform hover:scale-[1.02]'
            )}
          >
            Open myRA
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </motion.div>

        {/* Key Value Reminder */}
        <motion.div
          className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="text-center">
            <div className="text-2xl mb-1">⚡</div>
            <div className="text-sm text-white/60">Hours, not weeks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">✓</div>
            <div className="text-sm text-white/60">Every source cited</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">🔒</div>
            <div className="text-sm text-white/60">Enterprise secure</div>
          </div>
        </motion.div>

        {/* Start Over */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <button
            onClick={onStartOver}
            className="flex items-center gap-2 mx-auto text-white/40 hover:text-white/60 transition-colors"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Start Over with New Company
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
