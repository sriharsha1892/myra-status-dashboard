/**
 * Roadmap Design System Constants
 * Centralized colors, spacing, and configuration for roadmap components
 */

// Status Configuration - 2029 Professional Palette with Uniform Contextual Borders
export const STATUS_CONFIG = {
  planned: {
    label: 'Planned',
    color: {
      bg: 'bg-blue-50/50',
      border: 'border-2 border-blue-400/40',
      text: 'text-blue-700',
      dot: 'bg-blue-600',
      hover: 'hover:bg-blue-100/50 hover:border-blue-500/60',
      glow: 'shadow-[inset_0_0_20px_rgba(37,99,235,0.12),0_0_24px_rgba(37,99,235,0.08)]', // Uniform inner + outer glow
      hex: '#2563eb', // For JS-based effects
    },
    icon: '📋',
  },
  in_progress: {
    label: 'In Progress',
    color: {
      bg: 'bg-orange-50/50',
      border: 'border-2 border-orange-400/40',
      text: 'text-orange-700',
      dot: 'bg-orange-500',
      hover: 'hover:bg-orange-100/50 hover:border-orange-500/60',
      glow: 'shadow-[inset_0_0_20px_rgba(249,115,22,0.12),0_0_24px_rgba(249,115,22,0.08)]',
      hex: '#f97316',
    },
    icon: '🚀',
  },
  completed: {
    label: 'Completed',
    color: {
      bg: 'bg-emerald-50/50',
      border: 'border-2 border-emerald-400/40',
      text: 'text-emerald-700',
      dot: 'bg-emerald-600',
      hover: 'hover:bg-emerald-100/50 hover:border-emerald-500/60',
      glow: 'shadow-[inset_0_0_24px_rgba(5,150,105,0.15),0_0_28px_rgba(5,150,105,0.12)]', // Stronger uniform glow for celebration
      hex: '#059669',
    },
    icon: '✅',
  },
  cancelled: {
    label: 'Cancelled',
    color: {
      bg: 'bg-slate-50/50',
      border: 'border-2 border-slate-300/40',
      text: 'text-slate-600',
      dot: 'bg-slate-500',
      hover: 'hover:bg-slate-100/50 hover:border-slate-400/60',
      glow: 'shadow-[inset_0_0_16px_rgba(100,116,139,0.08),0_0_20px_rgba(100,116,139,0.06)]',
      hex: '#64748b',
    },
    icon: '⛔',
  },
} as const;

// Priority Configuration
export const PRIORITY_CONFIG = {
  critical: {
    label: 'Critical',
    color: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-500',
    },
    icon: '🚨',
  },
  high: {
    label: 'High',
    color: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      dot: 'bg-orange-500',
    },
    icon: '🔴',
  },
  medium: {
    label: 'Medium',
    color: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      dot: 'bg-yellow-500',
    },
    icon: '🟡',
  },
  low: {
    label: 'Low',
    color: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
      dot: 'bg-gray-400',
    },
    icon: '🟢',
  },
} as const;

// Animation Constants
export const ANIMATIONS = {
  card: {
    hover: 'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01]',
    active: 'active:scale-[0.98]',
  },
  panel: {
    slideIn: 'transition-transform duration-300 ease-out',
    backdrop: 'transition-opacity duration-200',
  },
  skeleton: {
    shimmer: 'animate-pulse',
  },
} as const;

// Spacing Constants
export const SPACING = {
  card: {
    padding: 'p-4',
    gap: 'gap-3',
    rounded: 'rounded-lg',
  },
  container: {
    padding: 'p-6',
    gap: 'gap-6',
  },
} as const;

// Typography Constants
export const TYPOGRAPHY = {
  card: {
    title: 'text-base font-semibold text-gray-900',
    description: 'text-sm text-gray-600 line-clamp-2',
    metadata: 'text-xs text-gray-500',
  },
  header: {
    title: 'text-2xl font-bold text-gray-900',
    subtitle: 'text-sm text-gray-600',
  },
} as const;

// Quick Date Presets
export const DATE_PRESETS = [
  { label: 'Today', getValue: () => new Date() },
  { label: 'Tomorrow', getValue: () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  }},
  { label: 'Next week', getValue: () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }},
  { label: 'End of month', getValue: () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }},
  { label: 'End of quarter', getValue: () => {
    const date = new Date();
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), (quarter + 1) * 3, 0);
  }},
] as const;

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  search: '/',
  newItem: 'n',
  toggleFilters: 'f',
  selectAll: 'a',
  escape: 'Escape',
  navigateUp: ['ArrowUp', 'k'],
  navigateDown: ['ArrowDown', 'j'],
  openItem: 'Enter',
  help: '?',
} as const;
