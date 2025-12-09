/**
 * TypingHints - Real-time contextual hints as user types
 *
 * Shows smart suggestions based on:
 * - What the user has typed so far
 * - Session context (focused org, recent orgs)
 * - Common patterns and templates
 */

'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TypingHintsProps {
  input: string;
  focusedOrgName: string | null;
  recentOrgs: string[];
  onComplete: (completion: string) => void;
  className?: string;
}

interface HintContext {
  focusedOrg?: string;
  recentOrgs: string[];
}

interface Hint {
  id: string;
  trigger: RegExp;
  completion: (match: RegExpMatchArray, ctx: HintContext) => string;
  label: string | ((ctx: HintContext) => string);
  priority: number;
}

// Hint rules - ordered by specificity
const HINTS: Hint[] = [
  // Activity logging patterns
  {
    id: 'log_at_org',
    trigger: /^(\w+)\s+at\s*$/i,
    completion: (match, ctx) => {
      const org = ctx.focusedOrg || ctx.recentOrgs[0] || 'OrgName';
      return `${match[1]} at ${org} `;
    },
    label: 'Complete with org name',
    priority: 10,
  },
  {
    id: 'ran_queries',
    trigger: /^(\w+)\s+(?:at\s+)?(\w+)\s+ran\s*$/i,
    completion: (match) => `${match[1]} at ${match[2]} ran  queries`,
    label: 'Add query count',
    priority: 9,
  },
  {
    id: 'logged_in',
    trigger: /^(\w+)\s+(?:at\s+)?(\w+)\s+logged\s*$/i,
    completion: (match) => `${match[1]} at ${match[2]} logged in`,
    label: 'Complete login activity',
    priority: 9,
  },

  // Deal updates
  {
    id: 'update_deal',
    trigger: /^update\s+(\w+)\s+deal\s*$/i,
    completion: (match) => `Update ${match[1]} deal to $`,
    label: 'Add deal value',
    priority: 10,
  },
  {
    id: 'deal_to',
    trigger: /^(\w+)\s+deal\s+to\s*$/i,
    completion: (match) => `${match[1]} deal to $`,
    label: 'Add amount',
    priority: 9,
  },

  // Stage updates
  {
    id: 'move_to',
    trigger: /^move\s+(\w+)\s+to\s*$/i,
    completion: (match) => `Move ${match[1]} to `,
    label: 'trial_active, customer, churned...',
    priority: 10,
  },
  {
    id: 'update_stage',
    trigger: /^(\w+)\s+(?:is\s+)?now\s*$/i,
    completion: (match) => `${match[1]} is now `,
    label: 'Add new stage',
    priority: 8,
  },

  // Notes
  {
    id: 'note_for',
    trigger: /^note\s+(?:for\s+)?(\w+):\s*$/i,
    completion: (match) => `Note for ${match[1]}: `,
    label: 'Add your note',
    priority: 10,
  },
  {
    id: 'add_note',
    trigger: /^add\s+note\s*$/i,
    completion: (_, ctx) => {
      const org = ctx.focusedOrg || ctx.recentOrgs[0] || 'OrgName';
      return `Add note for ${org}: `;
    },
    label: 'Complete with org',
    priority: 9,
  },

  // Creating entities
  {
    id: 'create_org',
    trigger: /^create\s+org\s+(\w+),?\s*$/i,
    completion: (match) => `Create org ${match[1]}, domain , website `,
    label: 'Add domain and website',
    priority: 10,
  },
  {
    id: 'add_user',
    trigger: /^add\s+user\s+(\w+)\s+at\s*$/i,
    completion: (match, ctx) => {
      const org = ctx.focusedOrg || ctx.recentOrgs[0] || 'OrgName';
      return `Add user ${match[1]} at ${org} as `;
    },
    label: 'Complete with org and role',
    priority: 10,
  },

  // Generic org completion
  {
    id: 'generic_at',
    trigger: /^(log|update|add|check|set)\s+(\w+)\s+at\s*$/i,
    completion: (match, ctx) => {
      const org = ctx.focusedOrg || ctx.recentOrgs[0] || '';
      return `${match[1]} ${match[2]} at ${org}`;
    },
    label: ctx => ctx.focusedOrg ? `Use ${ctx.focusedOrg}` : 'Add org name',
    priority: 7,
  },

  // Partial org name matching
  {
    id: 'partial_org',
    trigger: /^(\w{2,})\s*$/i,
    completion: (match, ctx) => {
      const typed = match[1].toLowerCase();
      const matchingOrg = ctx.recentOrgs.find(org =>
        org.toLowerCase().startsWith(typed)
      );
      return matchingOrg ? `${matchingOrg} ` : match[0];
    },
    label: 'Tab to complete org name',
    priority: 1,
  },
];

export function TypingHints({
  input,
  focusedOrgName,
  recentOrgs,
  onComplete,
  className,
}: TypingHintsProps) {
  const hint = useMemo(() => {
    if (!input || input.length < 2) return null;

    const ctx = {
      focusedOrg: focusedOrgName || undefined,
      recentOrgs,
    };

    // Find matching hints
    const matches = HINTS
      .map(hint => {
        const match = input.match(hint.trigger);
        if (!match) return null;
        const completion = hint.completion(match, ctx);
        // Only show if completion is different from input
        if (completion === input || completion.trim() === input.trim()) return null;
        return {
          ...hint,
          match,
          completion,
          displayLabel: typeof hint.label === 'function' ? hint.label(ctx) : hint.label,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.priority - a!.priority);

    return matches[0] || null;
  }, [input, focusedOrgName, recentOrgs]);

  // Check for org name autocomplete
  const orgAutocomplete = useMemo(() => {
    if (!input || input.length < 2) return null;

    // Check if last word might be an org name
    const words = input.split(/\s+/);
    const lastWord = words[words.length - 1]?.toLowerCase();

    if (!lastWord || lastWord.length < 2) return null;

    const matchingOrg = recentOrgs.find(org =>
      org.toLowerCase().startsWith(lastWord) && org.toLowerCase() !== lastWord
    );

    if (matchingOrg) {
      return {
        partial: lastWord,
        full: matchingOrg,
        completion: input.slice(0, input.lastIndexOf(lastWord)) + matchingOrg,
      };
    }

    return null;
  }, [input, recentOrgs]);

  if (!hint && !orgAutocomplete) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-xs",
          "bg-violet-50 border border-violet-100 rounded-lg",
          className
        )}
      >
        <Lightbulb className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />

        {hint && (
          <>
            <span className="text-violet-600">
              {hint.displayLabel}
            </span>
            <button
              onClick={() => onComplete(hint.completion)}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded transition-colors"
            >
              <span className="font-mono text-[11px] truncate max-w-[200px]">
                {hint.completion}
              </span>
              <kbd className="text-[10px] bg-violet-200 px-1 rounded">Tab</kbd>
            </button>
          </>
        )}

        {!hint && orgAutocomplete && (
          <>
            <span className="text-violet-600">
              Complete org name
            </span>
            <button
              onClick={() => onComplete(orgAutocomplete.completion)}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded transition-colors"
            >
              <span className="font-mono text-[11px]">
                <span className="opacity-50">{orgAutocomplete.partial}</span>
                <span className="font-semibold">
                  {orgAutocomplete.full.slice(orgAutocomplete.partial.length)}
                </span>
              </span>
              <kbd className="text-[10px] bg-violet-200 px-1 rounded">Tab</kbd>
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default TypingHints;
