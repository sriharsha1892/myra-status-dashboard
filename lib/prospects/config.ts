/**
 * Prospect Pipeline Configuration
 * Single source of truth for all prospect-related constants
 * Pipedrive-inspired visual styling
 */

import type { LucideIcon } from 'lucide-react';
import {
  Snowflake,
  Send,
  MessageCircle,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Mail,
  Inbox,
  Users,
  CalendarDays,
  Linkedin,
  Pin,
} from 'lucide-react';

// ============ PROSPECT STAGES ============
export const PROSPECT_STAGES = [
  {
    value: 'cold_lead',
    label: 'Cold Lead',
    shortLabel: 'Cold',
    icon: Snowflake,
    emoji: '🧊',
    // Pipedrive-inspired bold colors
    columnColor: '#64748b', // slate-500
    accentColor: 'slate',
    // Badge styling
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-300',
    // Column header
    headerBg: 'bg-gradient-to-r from-slate-100 to-slate-50',
    headerBorder: 'border-slate-300',
    // Card left border
    cardBorder: 'border-l-slate-400',
    order: 0,
  },
  {
    value: 'contacted',
    label: 'Contacted',
    shortLabel: 'Contacted',
    icon: Send,
    emoji: '📧',
    columnColor: '#3b82f6', // blue-500
    accentColor: 'blue',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-300',
    headerBg: 'bg-gradient-to-r from-blue-100 to-blue-50',
    headerBorder: 'border-blue-300',
    cardBorder: 'border-l-blue-500',
    order: 1,
  },
  {
    value: 'responded',
    label: 'Responded',
    shortLabel: 'Responded',
    icon: MessageCircle,
    emoji: '💬',
    columnColor: '#06b6d4', // cyan-500
    accentColor: 'cyan',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-700',
    badgeBorder: 'border-cyan-300',
    headerBg: 'bg-gradient-to-r from-cyan-100 to-cyan-50',
    headerBorder: 'border-cyan-300',
    cardBorder: 'border-l-cyan-500',
    order: 2,
  },
  {
    value: 'screening',
    label: 'Screening',
    shortLabel: 'Screening',
    icon: Search,
    emoji: '🔍',
    columnColor: '#f59e0b', // amber-500
    accentColor: 'amber',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-300',
    headerBg: 'bg-gradient-to-r from-amber-100 to-amber-50',
    headerBorder: 'border-amber-300',
    cardBorder: 'border-l-amber-500',
    order: 3,
  },
  {
    value: 'demo_scheduled',
    label: 'Demo Scheduled',
    shortLabel: 'Demo',
    icon: Calendar,
    emoji: '📅',
    columnColor: '#8b5cf6', // violet-500
    accentColor: 'violet',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-700',
    badgeBorder: 'border-violet-300',
    headerBg: 'bg-gradient-to-r from-violet-100 to-violet-50',
    headerBorder: 'border-violet-300',
    cardBorder: 'border-l-violet-500',
    order: 4,
  },
  {
    value: 'demo_done',
    label: 'Demo Done',
    shortLabel: 'Done',
    icon: CheckCircle,
    emoji: '✅',
    columnColor: '#22c55e', // green-500
    accentColor: 'green',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    badgeBorder: 'border-green-300',
    headerBg: 'bg-gradient-to-r from-green-100 to-green-50',
    headerBorder: 'border-green-300',
    cardBorder: 'border-l-green-500',
    order: 5,
  },
  {
    value: 'disqualified',
    label: 'Disqualified',
    shortLabel: 'DQ',
    icon: XCircle,
    emoji: '❌',
    columnColor: '#ef4444', // red-500
    accentColor: 'red',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    badgeBorder: 'border-red-300',
    headerBg: 'bg-gradient-to-r from-red-100 to-red-50',
    headerBorder: 'border-red-300',
    cardBorder: 'border-l-red-500',
    order: 6,
    isTerminal: true,
  },
] as const;

export type ProspectStageValue = typeof PROSPECT_STAGES[number]['value'];
export type ProspectStageConfig = typeof PROSPECT_STAGES[number];

// ============ PROSPECT SOURCES ============
export const PROSPECT_SOURCES = [
  {
    value: 'cold_outreach',
    label: 'Cold Outreach',
    shortLabel: 'Cold',
    icon: Mail,
    emoji: '📧',
    color: 'blue',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-600',
  },
  {
    value: 'inbound',
    label: 'Inbound',
    shortLabel: 'Inbound',
    icon: Inbox,
    emoji: '📥',
    color: 'green',
    badgeBg: 'bg-green-50',
    badgeText: 'text-green-600',
  },
  {
    value: 'referral',
    label: 'Referral',
    shortLabel: 'Referral',
    icon: Users,
    emoji: '🤝',
    color: 'purple',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-600',
  },
  {
    value: 'event',
    label: 'Event',
    shortLabel: 'Event',
    icon: CalendarDays,
    emoji: '🎪',
    color: 'amber',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-600',
  },
  {
    value: 'linkedin',
    label: 'LinkedIn',
    shortLabel: 'LinkedIn',
    icon: Linkedin,
    emoji: '💼',
    color: 'sky',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-600',
  },
  {
    value: 'other',
    label: 'Other',
    shortLabel: 'Other',
    icon: Pin,
    emoji: '📌',
    color: 'gray',
    badgeBg: 'bg-gray-50',
    badgeText: 'text-gray-600',
  },
] as const;

export type ProspectSourceValue = typeof PROSPECT_SOURCES[number]['value'];
export type ProspectSourceConfig = typeof PROSPECT_SOURCES[number];

// ============ ICP SCORE TIERS ============
// Pipedrive-inspired: visual indicators for deal potential
export const ICP_SCORE_TIERS = [
  {
    min: 80,
    max: 100,
    label: 'Excellent Fit',
    shortLabel: 'Excellent',
    color: 'emerald',
    // Card left border color
    borderClass: 'border-l-emerald-500',
    // Badge styling
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    // Ring/gauge color
    ringClass: 'text-emerald-500',
    fillClass: 'fill-emerald-500',
    // Gradient for gauge
    gradient: 'from-emerald-400 to-emerald-600',
  },
  {
    min: 60,
    max: 79,
    label: 'Good Fit',
    shortLabel: 'Good',
    color: 'blue',
    borderClass: 'border-l-blue-500',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    ringClass: 'text-blue-500',
    fillClass: 'fill-blue-500',
    gradient: 'from-blue-400 to-blue-600',
  },
  {
    min: 40,
    max: 59,
    label: 'Moderate Fit',
    shortLabel: 'Moderate',
    color: 'amber',
    borderClass: 'border-l-amber-500',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    ringClass: 'text-amber-500',
    fillClass: 'fill-amber-500',
    gradient: 'from-amber-400 to-amber-600',
  },
  {
    min: 0,
    max: 39,
    label: 'Poor Fit',
    shortLabel: 'Poor',
    color: 'red',
    borderClass: 'border-l-red-400',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    ringClass: 'text-red-500',
    fillClass: 'fill-red-500',
    gradient: 'from-red-400 to-red-600',
  },
] as const;

export type ICPScoreTier = typeof ICP_SCORE_TIERS[number];

// ============ ENGAGEMENT/HEAT LEVELS ============
export const ENGAGEMENT_LEVELS = [
  { min: 70, label: 'Hot', emoji: '🔥', color: 'red', badgeBg: 'bg-red-100', badgeText: 'text-red-700' },
  { min: 40, label: 'Warm', emoji: '☀️', color: 'amber', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700' },
  { min: 0, label: 'Cold', emoji: '❄️', color: 'blue', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700' },
] as const;

// ============ HELPER FUNCTIONS ============

/**
 * Get stage configuration by value
 */
export function getStageConfig(stage: string | undefined | null): ProspectStageConfig {
  return PROSPECT_STAGES.find(s => s.value === stage) || PROSPECT_STAGES[0];
}

/**
 * Get source configuration by value
 */
export function getSourceConfig(source: string | undefined | null): ProspectSourceConfig {
  return PROSPECT_SOURCES.find(s => s.value === source) || PROSPECT_SOURCES[5]; // default to 'other'
}

/**
 * Get ICP score tier based on score value
 */
export function getICPTier(score: number | undefined | null): ICPScoreTier | null {
  if (score === undefined || score === null) return null;
  return ICP_SCORE_TIERS.find(t => score >= t.min && score <= t.max) || ICP_SCORE_TIERS[3];
}

/**
 * Get engagement level based on score
 */
export function getEngagementLevel(score: number | undefined | null) {
  if (score === undefined || score === null) return ENGAGEMENT_LEVELS[2]; // default cold
  return ENGAGEMENT_LEVELS.find(l => score >= l.min) || ENGAGEMENT_LEVELS[2];
}

/**
 * Get active (non-terminal) stages for pipeline views
 */
export function getActiveStages() {
  return PROSPECT_STAGES.filter(s => !('isTerminal' in s && s.isTerminal));
}

/**
 * Get stage index (for progress calculations)
 */
export function getStageIndex(stage: string | undefined | null): number {
  const config = getStageConfig(stage);
  return config.order;
}

/**
 * Calculate pipeline progress percentage
 */
export function getPipelineProgress(stage: string | undefined | null): number {
  const activeStages = getActiveStages();
  const index = getStageIndex(stage);
  // Clamp to active stages
  const clampedIndex = Math.min(index, activeStages.length - 1);
  return Math.round((clampedIndex / (activeStages.length - 1)) * 100);
}

/**
 * Format deal value for display
 */
export function formatDealValue(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

/**
 * Get days in current stage
 */
export function getDaysInStage(stageChangedAt: string | undefined | null): number {
  if (!stageChangedAt) return 0;
  const changed = new Date(stageChangedAt);
  const now = new Date();
  const diffMs = now.getTime() - changed.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ============ ZOD SCHEMA HELPERS ============
// Simple value arrays for use in Zod enum validation

/**
 * Array of prospect stage values for Zod validation
 * Usage: z.enum(PROSPECT_STAGE_VALUES)
 */
export const PROSPECT_STAGE_VALUES = PROSPECT_STAGES.map(s => s.value) as unknown as readonly [
  'cold_lead',
  'contacted',
  'responded',
  'screening',
  'demo_scheduled',
  'demo_done',
  'disqualified',
];

/**
 * Array of prospect source values for Zod validation
 * Usage: z.enum(PROSPECT_SOURCE_VALUES)
 */
export const PROSPECT_SOURCE_VALUES = PROSPECT_SOURCES.map(s => s.value) as unknown as readonly [
  'cold_outreach',
  'inbound',
  'referral',
  'event',
  'linkedin',
  'other',
];
