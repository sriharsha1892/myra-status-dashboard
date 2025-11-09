/**
 * KeyboardShortcuts Component
 * Global keyboard shortcut handler and help panel
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '@/lib/roadmap/constants';

interface KeyboardShortcutsProps {
  onNewItem: () => void;
  onToggleFilters: () => void;
  onFocusSearch: () => void;
}

export default function KeyboardShortcuts({
  onNewItem,
  onToggleFilters,
  onFocusSearch,
}: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInputField = ['INPUT', 'TEXTAREA'].includes(target.tagName) ||
                          target.isContentEditable;

      // Help panel toggle (always works)
      if (e.key === KEYBOARD_SHORTCUTS.help) {
        e.preventDefault();
        setShowHelp(prev => !prev);
        return;
      }

      // Close help panel with Escape
      if (e.key === KEYBOARD_SHORTCUTS.escape && showHelp) {
        e.preventDefault();
        setShowHelp(false);
        return;
      }

      // Skip other shortcuts if in input field
      if (isInputField) return;

      // Search focus
      if (e.key === KEYBOARD_SHORTCUTS.search) {
        e.preventDefault();
        onFocusSearch();
      }

      // New item
      if (e.key === KEYBOARD_SHORTCUTS.newItem) {
        e.preventDefault();
        onNewItem();
      }

      // Toggle filters
      if (e.key === KEYBOARD_SHORTCUTS.toggleFilters) {
        e.preventDefault();
        onToggleFilters();
      }

      // Escape to unfocus/close
      if (e.key === KEYBOARD_SHORTCUTS.escape) {
        e.preventDefault();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelp, onNewItem, onToggleFilters, onFocusSearch]);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>
          <button
            onClick={() => setShowHelp(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-4 space-y-4">
          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Navigation</h4>
            <div className="space-y-2">
              <ShortcutRow keys={['/']} description="Focus search" />
              <ShortcutRow keys={['Esc']} description="Close panel / Clear selection" />
              <ShortcutRow keys={['?']} description="Toggle this help" />
            </div>
          </div>

          {/* Actions */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Actions</h4>
            <div className="space-y-2">
              <ShortcutRow keys={['n']} description="New roadmap item" />
              <ShortcutRow keys={['f']} description="Toggle filters" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-gray-600 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono">?</kbd> again to close
          </p>
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{description}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-700"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
