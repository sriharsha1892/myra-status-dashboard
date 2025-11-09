/**
 * Roadmap Design System Constants
 * Centralized colors, spacing, and configuration for roadmap components
 */

// Status Configuration
export const STATUS_CONFIG = {
  planned: {
    label: 'Planned',
    color: {
      bg: 'bg-blue-50/50',
      border: 'border-blue-200',
      borderLeft: 'border-l-4 border-l-blue-400',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
      hover: 'hover:bg-blue-100/50',
    },
    icon: '📋',
  },
  in_progress: {
    label: 'In Progress',
    color: {
      bg: 'bg-amber-50/50',
      border: 'border-amber-200',
      borderLeft: 'border-l-4 border-l-amber-500',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      hover: 'hover:bg-amber-100/50',
    },
    icon: '🚀',
  },
  completed: {
    label: 'Completed',
    color: {
      bg: 'bg-green-50/50',
      border: 'border-green-200',
      borderLeft: 'border-l-4 border-l-green-500',
      text: 'text-green-700',
      dot: 'bg-green-500',
      hover: 'hover:bg-green-100/50',
    },
    icon: '✅',
  },
  cancelled: {
    label: 'Cancelled',
    color: {
      bg: 'bg-gray-50/50',
      border: 'border-gray-200',
      borderLeft: 'border-l-4 border-l-gray-300',
      text: 'text-gray-600',
      dot: 'bg-gray-400',
      hover: 'hover:bg-gray-100/50',
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
