/**
 * CommandInput - Smart input with rotating placeholder examples
 * Designed for natural language first, slash commands as power-user option
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// Example prompts that rotate
const EXAMPLE_PROMPTS = [
  "John at ABB ran 5 queries today",
  "Update Almarai deal to $50k",
  "Move BASF to trial_active",
  "Add note for ABB: Great demo today",
  "Create org TechCorp, TMT domain",
  "Sarah at ABB logged in 3 times",
  "Update ABB stage to customer",
  "Log demo activity for BASF",
];

// Slash commands still available for power users
const SLASH_COMMANDS = [
  { command: '/log', description: 'Log activity', example: '/log query at Acme' },
  { command: '/note', description: 'Add note', example: '/note Acme: Great demo today' },
  { command: '/stage', description: 'Update stage', example: '/stage Acme customer' },
  { command: '/org', description: 'Create organization', example: '/org "New Company" tech' },
  { command: '/ticket', description: 'Create ticket', example: '/ticket "Bug report" high' },
  { command: '/su', description: 'Quick status update', example: '/su Acme positive Great call' },
];

interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isProcessing: boolean;
  placeholder?: string;
}

export function CommandInput({
  value,
  onChange,
  onSubmit,
  isProcessing,
  placeholder,
}: CommandInputProps) {
  const [showSlashHints, setShowSlashHints] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState(SLASH_COMMANDS);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentExample, setCurrentExample] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rotate placeholder examples
  useEffect(() => {
    if (value) return; // Don't rotate when user is typing

    const interval = setInterval(() => {
      setCurrentExample((prev) => (prev + 1) % EXAMPLE_PROMPTS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [value]);

  // Generate dynamic placeholder
  const dynamicPlaceholder = placeholder || `Try: "${EXAMPLE_PROMPTS[currentExample]}"`;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  // Handle slash command filtering
  useEffect(() => {
    if (value.startsWith('/')) {
      const search = value.toLowerCase();
      const filtered = SLASH_COMMANDS.filter(
        (cmd) =>
          cmd.command.toLowerCase().startsWith(search) ||
          cmd.description.toLowerCase().includes(search.slice(1))
      );
      setFilteredCommands(filtered);
      setShowSlashHints(filtered.length > 0 && value.length < 20);
      setSelectedIndex(0);
    } else {
      setShowSlashHints(false);
    }
  }, [value]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Cmd/Ctrl + Enter
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (value.trim() && !isProcessing) {
          onSubmit();
        }
        return;
      }

      // Submit on Enter (no modifier) for single-line input
      if (e.key === 'Enter' && !e.shiftKey && !showSlashHints) {
        // Allow multi-line with Shift+Enter
        e.preventDefault();
        if (value.trim() && !isProcessing) {
          onSubmit();
        }
        return;
      }

      // Navigate slash command hints
      if (showSlashHints) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          return;
        }
        if (e.key === 'Tab' || e.key === 'Enter') {
          e.preventDefault();
          const selected = filteredCommands[selectedIndex];
          if (selected) {
            onChange(selected.command + ' ');
            setShowSlashHints(false);
          }
          return;
        }
        if (e.key === 'Escape') {
          setShowSlashHints(false);
          return;
        }
      }
    },
    [showSlashHints, filteredCommands, selectedIndex, value, isProcessing, onSubmit, onChange]
  );

  // Insert slash command
  const insertCommand = (command: string) => {
    onChange(command + ' ');
    setShowSlashHints(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Slash command hints dropdown */}
      <AnimatePresence>
        {showSlashHints && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-full left-0 right-0 mb-3 bg-white backdrop-blur-sm
              rounded-2xl shadow-lg border border-gray-200 overflow-hidden z-10"
          >
            {filteredCommands.map((cmd, index) => (
              <button
                key={cmd.command}
                onClick={() => insertCommand(cmd.command)}
                className={`w-full px-5 py-3 text-left flex items-center gap-4 transition-all duration-150 ${
                  index === selectedIndex
                    ? 'bg-accent-50 border-l-2 border-l-accent-500'
                    : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                }`}
              >
                <span className="text-accent-600 font-mono text-sm font-semibold">
                  {cmd.command}
                </span>
                <span className="text-gray-700 text-sm">{cmd.description}</span>
                <span className="text-gray-500 text-xs ml-auto truncate max-w-[200px] font-mono">
                  {cmd.example}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="relative bg-white rounded-2xl border-2 border-gray-200
        focus-within:border-accent-500 focus-within:ring-4 focus-within:ring-accent-500/15
        shadow-sm focus-within:shadow-md
        transition-all duration-300">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={dynamicPlaceholder}
          disabled={isProcessing}
          rows={1}
          className="w-full px-5 py-4 text-base text-gray-900 placeholder-gray-400
            bg-transparent resize-none focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: '56px', maxHeight: '200px' }}
        />

        {/* Processing indicator */}
        {isProcessing && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-accent-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Keyboard hints */}
      <div className="flex items-center justify-between mt-3 px-2">
        <p className="text-xs text-gray-500">
          Type naturally or{' '}
          <button
            onClick={() => {
              onChange('/');
              textareaRef.current?.focus();
            }}
            className="text-accent-600 hover:text-accent-500 font-medium transition-colors"
          >
            /
          </button>
          {' '}for shortcuts
        </p>
        <p className="text-xs text-gray-500 hidden sm:flex items-center gap-1.5">
          <kbd className="px-2 py-1 bg-gray-100 rounded-md text-gray-600 font-mono text-[11px]
            border border-gray-200 shadow-sm">Enter</kbd>
          <span>send</span>
          <kbd className="px-2 py-1 bg-gray-100 rounded-md text-gray-600 font-mono text-[11px]
            border border-gray-200 shadow-sm ml-1">Shift+Enter</kbd>
          <span>new line</span>
        </p>
      </div>
    </div>
  );
}

export default CommandInput;
