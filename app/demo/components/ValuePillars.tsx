'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// The 5 pillars from insights.ask-myra.ai
const PILLARS = [
  {
    id: 'scoping',
    title: 'Collaborative Scoping',
    headline: 'No guessing',
    description: 'AI-driven Assumption Ledger ensures full clarity upfront',
    icon: '🎯',
    color: 'from-violet-500 to-purple-500',
  },
  {
    id: 'research',
    title: 'Multi-Agent Research',
    headline: '30K+ sources',
    description: 'Purpose-built agents execute in parallel across vetted databases',
    icon: '🤖',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'validation',
    title: 'Validation',
    headline: 'Trust built-in',
    description: 'Confidence scores based on source quality. Every citation traceable.',
    icon: '✓',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'export',
    title: 'Export Ready',
    headline: 'Your format',
    description: 'PowerPoint, PDF, dashboards. Live sharing with your team.',
    icon: '📊',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'expert',
    title: 'Expert Loop',
    headline: 'Humans verify',
    description: 'AI accelerates, experts validate. Liability moves to us.',
    icon: '👥',
    color: 'from-pink-500 to-rose-500',
  },
];

interface ValuePillarsProps {
  className?: string;
}

export default function ValuePillars({ className }: ValuePillarsProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Section Header */}
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h3 className="text-lg font-semibold text-white/80">
          How myRA Works
        </h3>
      </motion.div>

      {/* Pillars Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {PILLARS.map((pillar, index) => (
          <motion.div
            key={pillar.id}
            className="relative"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.4,
              delay: index * 0.1,
              type: 'spring',
              stiffness: 200,
            }}
          >
            <div
              className={cn(
                'relative p-4 rounded-xl border backdrop-blur-sm',
                'bg-white/[0.03] border-white/10',
                'hover:border-white/20 hover:bg-white/[0.05]',
                'transition-all duration-300 h-full',
                'group'
              )}
            >
              {/* Gradient accent on hover */}
              <div
                className={cn(
                  'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20',
                  'transition-opacity duration-300',
                  `bg-gradient-to-br ${pillar.color}`
                )}
              />

              <div className="relative z-10">
                {/* Icon */}
                <div className="text-2xl mb-2">{pillar.icon}</div>

                {/* Title */}
                <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">
                  {pillar.title}
                </h4>

                {/* Headline */}
                <div className={cn(
                  'text-sm font-bold bg-gradient-to-r bg-clip-text text-transparent mb-2',
                  pillar.color
                )}>
                  {pillar.headline}
                </div>

                {/* Description */}
                <p className="text-[11px] text-white/50 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Key Stats Bar */}
      <motion.div
        className="mt-6 flex items-center justify-center gap-6 flex-wrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <StatBadge value="30,000+" label="vetted databases" />
        <StatBadge value="50M+" label="financial reports" />
        <StatBadge value="70M+" label="research papers" />
        <StatBadge value="4.8/5" label="customer rating" />
      </motion.div>

      {/* Security Badges */}
      <motion.div
        className="mt-4 flex items-center justify-center gap-3 flex-wrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        <SecurityBadge label="SOC2 Type 2" />
        <SecurityBadge label="GDPR Compliant" />
        <SecurityBadge label="Zero Data Retention" />
      </motion.div>
    </div>
  );
}

// Stat badge component
function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-bold text-white">{value}</span>
      <span className="text-white/40">{label}</span>
    </div>
  );
}

// Security badge component
function SecurityBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
      <svg
        className="w-3 h-3 text-emerald-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
      <span className="text-xs text-emerald-400 font-medium">{label}</span>
    </div>
  );
}
