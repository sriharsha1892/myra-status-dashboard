/**
 * ActionChips - Clickable action starters for the Command Center
 *
 * Provides visible, intuitive action buttons that pre-fill the input
 * with templates. Eliminates the need to learn slash commands.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Activity,
  DollarSign,
  FileText,
  Building2,
  UserPlus,
  ArrowUpRight,
  Trash2
} from 'lucide-react';

export interface ActionChipConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  template: string;
  description: string;
  category: 'activity' | 'deal' | 'org' | 'user';
}

const DEFAULT_CHIPS: ActionChipConfig[] = [
  {
    id: 'log_activity',
    label: 'Log Activity',
    icon: <Activity className="w-3.5 h-3.5" />,
    template: ' at  ran ',
    description: 'Record user activity for an organization',
    category: 'activity',
  },
  {
    id: 'update_deal',
    label: 'Update Deal',
    icon: <DollarSign className="w-3.5 h-3.5" />,
    template: 'Update  deal to $',
    description: 'Update deal value or stage',
    category: 'deal',
  },
  {
    id: 'add_note',
    label: 'Add Note',
    icon: <FileText className="w-3.5 h-3.5" />,
    template: 'Note for : ',
    description: 'Add a note to an organization',
    category: 'org',
  },
  {
    id: 'update_stage',
    label: 'Update Stage',
    icon: <ArrowUpRight className="w-3.5 h-3.5" />,
    template: 'Move  to ',
    description: 'Update organization stage',
    category: 'org',
  },
  {
    id: 'create_org',
    label: 'Create Org',
    icon: <Building2 className="w-3.5 h-3.5" />,
    template: 'Create org , domain , website ',
    description: 'Create a new organization',
    category: 'org',
  },
  {
    id: 'add_user',
    label: 'Add User',
    icon: <UserPlus className="w-3.5 h-3.5" />,
    template: 'Add user  at  as ',
    description: 'Add a user to an organization',
    category: 'user',
  },
];

interface ActionChipsProps {
  onSelect: (template: string) => void;
  focusedOrgName?: string | null;
  className?: string;
  compact?: boolean;
}

export function ActionChips({
  onSelect,
  focusedOrgName,
  className,
  compact = false
}: ActionChipsProps) {
  // Customize templates if an org is focused
  const getCustomizedTemplate = (chip: ActionChipConfig): string => {
    if (!focusedOrgName) return chip.template;

    // Replace first org placeholder with focused org name
    switch (chip.id) {
      case 'log_activity':
        return ` at ${focusedOrgName} ran `;
      case 'update_deal':
        return `Update ${focusedOrgName} deal to $`;
      case 'add_note':
        return `Note for ${focusedOrgName}: `;
      case 'update_stage':
        return `Move ${focusedOrgName} to `;
      case 'add_user':
        return `Add user  at ${focusedOrgName} as `;
      default:
        return chip.template;
    }
  };

  const handleChipClick = (chip: ActionChipConfig) => {
    const template = getCustomizedTemplate(chip);
    onSelect(template);
  };

  if (compact) {
    return (
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        {DEFAULT_CHIPS.slice(0, 4).map((chip) => (
          <button
            key={chip.id}
            onClick={() => handleChipClick(chip)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs",
              "bg-white hover:bg-gray-50 border border-gray-200",
              "text-gray-700 hover:text-gray-900 transition-colors",
              "focus:outline-none focus:ring-1 focus:ring-accent-500/50"
            )}
            title={chip.description}
          >
            {chip.icon}
            <span>{chip.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">
        Quick Actions
      </div>
      <div className="flex flex-wrap gap-2">
        {DEFAULT_CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => handleChipClick(chip)}
            className={cn(
              "group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
              "bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300",
              "text-gray-700 hover:text-gray-900 transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-accent-500/50",
              // Category-specific hover colors
              chip.category === 'activity' && "hover:border-blue-300 hover:bg-blue-50",
              chip.category === 'deal' && "hover:border-green-300 hover:bg-green-50",
              chip.category === 'org' && "hover:border-purple-300 hover:bg-purple-50",
              chip.category === 'user' && "hover:border-orange-300 hover:bg-orange-50",
            )}
            title={chip.description}
          >
            <span className={cn(
              "transition-colors",
              chip.category === 'activity' && "text-blue-600 group-hover:text-blue-700",
              chip.category === 'deal' && "text-green-600 group-hover:text-green-700",
              chip.category === 'org' && "text-purple-600 group-hover:text-purple-700",
              chip.category === 'user' && "text-orange-600 group-hover:text-orange-700",
            )}>
              {chip.icon}
            </span>
            <span>{chip.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ActionChips;
