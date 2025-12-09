'use client';

import { useState, memo } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Command,
  Slash,
  MessageSquare,
  Keyboard,
  Lightbulb,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Slash command reference data
const SLASH_COMMANDS = [
  {
    command: '/log',
    aliases: ['/activity', '/a'],
    description: 'Log user activity',
    usage: '/log [activity] [user] at [org]',
    examples: ['/log query John at Acme', '/log demo Sarah at TechCo'],
  },
  {
    command: '/org',
    aliases: ['/neworg', '/trial'],
    description: 'Create organization',
    usage: '/org [name] [website] [domain]',
    examples: ['/org "Acme Corp" acme.com tech', '/org BigCompany'],
  },
  {
    command: '/user',
    aliases: ['/contact', '/newuser'],
    description: 'Create user/contact',
    usage: '/user [email] [name] at [org]',
    examples: ['/user john@acme.com "John Doe" at Acme'],
  },
  {
    command: '/ticket',
    aliases: ['/bug', '/issue'],
    description: 'Create support ticket',
    usage: '/ticket [title] [priority] [category]',
    examples: ['/ticket "Login broken" high bug @Acme'],
  },
  {
    command: '/feature',
    aliases: ['/request', '/fr'],
    description: 'Create feature request',
    usage: '/feature [title] [priority] @[org]',
    examples: ['/feature "Dark mode" high @Acme'],
  },
  {
    command: '/note',
    aliases: ['/n'],
    description: 'Add note to org',
    usage: '/note [text] @[org]',
    examples: ['/note "Great progress on POC" @Acme'],
  },
  {
    command: '/stage',
    aliases: ['/status', '/s'],
    description: 'Update lifecycle stage',
    usage: '/stage [org] [stage]',
    examples: ['/stage Acme customer', '/stage TechCo active'],
  },
  {
    command: '/deal',
    aliases: ['/d'],
    description: 'Update deal info',
    usage: '/deal [org] $[value] [status]',
    examples: ['/deal Acme $50k won', '/deal BigCo $100k negotiating'],
  },
  {
    command: '/am',
    aliases: ['/assign'],
    description: 'Assign account manager',
    usage: '/am [org] [am_name]',
    examples: ['/am Acme "Sarah Smith"'],
  },
  {
    command: '/event',
    aliases: ['/timeline', '/e'],
    description: 'Create timeline event',
    usage: '/event [type] [title] @[org]',
    examples: ['/event demo "Quarterly Review" @Acme'],
  },
  {
    command: '/roadmap',
    aliases: ['/task', '/milestone', '/rm'],
    description: 'Create roadmap item',
    usage: '/roadmap [title] [status] [priority] @[org]',
    examples: ['/roadmap "Q1 Feature" planned high @Acme', '/roadmap "API v2" progress'],
  },
];

// Natural language examples
const NL_EXAMPLES = [
  {
    category: 'Activities',
    examples: [
      'John at Acme ran a query yesterday',
      'Sarah at TechCo logged in 3 times this week',
      'Demo with BigCo team went well',
      'Call with prospects from DataFirm',
    ],
  },
  {
    category: 'Stage Changes',
    examples: [
      'Acme converted to customer',
      'TechCo churned, not renewing',
      'BigCo starting trial next week',
      'DataFirm trial extended 2 weeks',
    ],
  },
  {
    category: 'Deals',
    examples: [
      'Sent pricing to Acme - $50K deal',
      'BigCo signed $100K annual contract',
      'TechCo deal value increased to $75K',
      'Lost DataFirm deal to competitor',
    ],
  },
  {
    category: 'Notes & Tickets',
    examples: [
      'Note: Acme loves the new dashboard',
      'Bug report from TechCo - export failing',
      'Feature request: BigCo wants dark mode',
      'Feedback from DataFirm very positive',
    ],
  },
];

// Keyboard shortcuts
const KEYBOARD_SHORTCUTS = [
  { keys: ['⌘', '↵'], description: 'Process all commands' },
  { keys: ['⌘', 'A'], description: 'Confirm all pending' },
  { keys: ['⌘', 'Z'], description: 'Undo most recent' },
  { keys: ['Esc'], description: 'Clear all' },
  { keys: ['/'], description: 'Start slash command' },
];

interface HelpPanelProps {
  defaultExpanded?: boolean;
  compact?: boolean;
}

export const HelpPanel = memo(function HelpPanel({
  defaultExpanded = false,
  compact = false,
}: HelpPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<'natural' | 'slash' | 'shortcuts'>('natural');

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
           onClick={() => setIsExpanded(!isExpanded)}>
        <HelpCircle className="w-4 h-4" />
        <span>Help</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-violet-500" />
          <span className="font-medium text-gray-900">Command Help</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Tabs */}
            <div className="flex border-t border-b border-gray-200 bg-gray-50">
              <TabButton
                active={activeTab === 'natural'}
                onClick={() => setActiveTab('natural')}
                icon={MessageSquare}
                label="Natural Language"
              />
              <TabButton
                active={activeTab === 'slash'}
                onClick={() => setActiveTab('slash')}
                icon={Slash}
                label="Slash Commands"
              />
              <TabButton
                active={activeTab === 'shortcuts'}
                onClick={() => setActiveTab('shortcuts')}
                icon={Keyboard}
                label="Shortcuts"
              />
            </div>

            {/* Content */}
            <div className="p-4 max-h-80 overflow-y-auto">
              {activeTab === 'natural' && <NaturalLanguageTab />}
              {activeTab === 'slash' && <SlashCommandsTab />}
              {activeTab === 'shortcuts' && <ShortcutsTab />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Tab button component
function TabButton({
  active,
  onClick,
  icon: Icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-colors ${
        active
          ? 'text-violet-600 border-b-2 border-violet-600 bg-white'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// Natural language examples tab
function NaturalLanguageTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-violet-50 rounded-lg">
        <Lightbulb className="w-4 h-4 text-violet-600 mt-0.5" />
        <p className="text-sm text-violet-700">
          Just type what happened naturally. The AI will extract entities, actions, and details automatically.
        </p>
      </div>

      {NL_EXAMPLES.map((category) => (
        <div key={category.category}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {category.category}
          </h4>
          <div className="space-y-1.5">
            {category.examples.map((example, i) => (
              <div
                key={i}
                className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 font-mono"
              >
                {example}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Slash commands tab
function SlashCommandsTab() {
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg mb-4">
        <Command className="w-4 h-4 text-blue-600 mt-0.5" />
        <p className="text-sm text-blue-700">
          Start with <code className="px-1 py-0.5 bg-blue-100 rounded">/</code> for quick structured commands.
        </p>
      </div>

      {SLASH_COMMANDS.map((cmd) => (
        <div
          key={cmd.command}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setExpandedCommand(expandedCommand === cmd.command ? null : cmd.command)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <code className="px-2 py-1 bg-violet-100 text-violet-700 rounded font-semibold text-sm">
                {cmd.command}
              </code>
              <span className="text-sm text-gray-600">{cmd.description}</span>
            </div>
            {expandedCommand === cmd.command ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          <AnimatePresence>
            {expandedCommand === cmd.command && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-200 bg-gray-50 p-3"
              >
                {cmd.aliases.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-gray-500">Aliases: </span>
                    {cmd.aliases.map((alias) => (
                      <code key={alias} className="mx-1 px-1.5 py-0.5 bg-gray-200 rounded text-xs">
                        {alias}
                      </code>
                    ))}
                  </div>
                )}
                <div className="mb-2">
                  <span className="text-xs text-gray-500">Usage: </span>
                  <code className="text-sm text-gray-700">{cmd.usage}</code>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Examples:</span>
                  {cmd.examples.map((ex, i) => (
                    <div key={i} className="mt-1 px-2 py-1 bg-white rounded text-sm font-mono text-gray-600">
                      {ex}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// Keyboard shortcuts tab
function ShortcutsTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg mb-4">
        <Keyboard className="w-4 h-4 text-amber-600 mt-0.5" />
        <p className="text-sm text-amber-700">
          Use keyboard shortcuts to work faster. Undo is available for 5 seconds after execution.
        </p>
      </div>

      <div className="grid gap-2">
        {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <span className="text-sm text-gray-700">{shortcut.description}</span>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, j) => (
                <kbd
                  key={j}
                  className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 shadow-sm"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Pro Tips
        </h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-violet-500">•</span>
            <span>Paste multiple commands at once, one per line</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-500">•</span>
            <span>High confidence commands (90%+) execute automatically</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-500">•</span>
            <span>Use quotes around names with spaces: "John Doe"</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-500">•</span>
            <span>Use @ to reference orgs: @Acme or @TechCo</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// Quick help tooltip for inline use
export const QuickHelpTooltip = memo(function QuickHelpTooltip() {
  return (
    <div className="absolute z-50 w-72 p-3 bg-gray-900 text-white rounded-lg shadow-xl text-sm">
      <div className="font-medium mb-2">Quick Reference</div>
      <div className="space-y-1.5 text-gray-300">
        <div><code className="text-violet-400">/log</code> - Log activity</div>
        <div><code className="text-violet-400">/org</code> - Create org</div>
        <div><code className="text-violet-400">/stage</code> - Update stage</div>
        <div><code className="text-violet-400">/deal</code> - Update deal</div>
        <div><code className="text-violet-400">/roadmap</code> - Add roadmap item</div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-700 text-gray-400 text-xs">
        Or just type naturally!
      </div>
    </div>
  );
});
