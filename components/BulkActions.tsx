'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Trash2, Edit, Mail, Archive, Tag } from 'lucide-react';

interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedIds: Set<string>) => void | Promise<void>;
  variant?: 'default' | 'danger' | 'success';
  requiresConfirmation?: boolean;
}

interface BulkActionsProps {
  selectedIds: Set<string>;
  totalCount: number;
  actions: BulkAction[];
  onClearSelection: () => void;
  entityName?: string; // e.g., 'organizations', 'tickets'
}

/**
 * Bulk actions toolbar that appears when items are selected
 *
 * Usage:
 * const [selectedIds, setSelectedIds] = useState(new Set());
 *
 * <BulkActions
 *   selectedIds={selectedIds}
 *   totalCount={items.length}
 *   actions={[
 *     { label: 'Delete', icon: <Trash2 />, onClick: handleBulkDelete, variant: 'danger' },
 *     { label: 'Assign', icon: <Edit />, onClick: handleBulkAssign }
 *   ]}
 *   onClearSelection={() => setSelectedIds(new Set())}
 * />
 */
export default function BulkActions({
  selectedIds,
  totalCount,
  actions,
  onClearSelection,
  entityName = 'items',
}: BulkActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  const handleAction = async (action: BulkAction) => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      await action.onClick(selectedIds);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {hasSelection && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-accent-500 text-white rounded-lg shadow-2xl px-6 py-4 flex items-center space-x-6">
            {/* Selection count */}
            <div className="flex items-center space-x-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
              >
                <Check className="w-5 h-5" />
              </motion.div>
              <span className="font-semibold">
                {selectedCount} {entityName} selected
              </span>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-white/30" />

            {/* Actions */}
            <div className="flex items-center space-x-2">
              {actions.map((action, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleAction(action)}
                  disabled={isProcessing}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg font-medium
                    transition-all duration-200
                    ${action.variant === 'danger'
                      ? 'bg-red-500 hover:bg-red-600'
                      : action.variant === 'success'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-white/20 hover:bg-white/30'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {action.icon && <span className="w-4 h-4">{action.icon}</span>}
                  <span>{action.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Clear button */}
            <button
              onClick={onClearSelection}
              className="ml-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Clear selection"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Processing indicator */}
            {isProcessing && (
              <div className="ml-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Checkbox component for selecting items in bulk actions
 */
export function BulkCheckbox({
  id,
  selectedIds,
  onToggle,
  label,
}: {
  id: string;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  label?: string;
}) {
  const isSelected = selectedIds.has(id);

  return (
    <label className="flex items-center cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(id)}
          className="sr-only"
        />
        <motion.div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center
            transition-colors duration-200
            ${isSelected
              ? 'bg-blue-600 border-blue-600'
              : 'bg-white border-gray-300 group-hover:border-blue-400'
            }
          `}
          whileTap={{ scale: 0.9 }}
        >
          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      {label && (
        <span className="ml-2 text-sm text-gray-700">{label}</span>
      )}
    </label>
  );
}

/**
 * Select all checkbox for bulk operations
 */
export function BulkSelectAll({
  selectedIds,
  totalIds,
  onSelectAll,
  onDeselectAll,
}: {
  selectedIds: Set<string>;
  totalIds: string[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  const allSelected = selectedIds.size === totalIds.length && totalIds.length > 0;
  const someSelected = selectedIds.size > 0 && selectedIds.size < totalIds.length;

  const handleToggle = () => {
    if (allSelected || someSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  return (
    <label className="flex items-center cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={handleToggle}
          className="sr-only"
        />
        <motion.div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center
            transition-colors duration-200
            ${allSelected || someSelected
              ? 'bg-blue-600 border-blue-600'
              : 'bg-white border-gray-300 group-hover:border-blue-400'
            }
          `}
          whileTap={{ scale: 0.9 }}
        >
          <AnimatePresence mode="wait">
            {allSelected && (
              <motion.div
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}
            {someSelected && !allSelected && (
              <motion.div
                key="minus"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="w-2 h-0.5 bg-white"
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <span className="ml-2 text-sm font-medium text-gray-700">
        {allSelected ? 'Deselect all' : someSelected ? `${selectedIds.size} selected` : 'Select all'}
      </span>
    </label>
  );
}

/**
 * Common bulk action presets
 */
export const CommonBulkActions = {
  delete: (onDelete: (ids: Set<string>) => void | Promise<void>): BulkAction => ({
    label: 'Delete',
    icon: <Trash2 className="w-4 h-4" />,
    onClick: onDelete,
    variant: 'danger',
    requiresConfirmation: true,
  }),

  archive: (onArchive: (ids: Set<string>) => void | Promise<void>): BulkAction => ({
    label: 'Archive',
    icon: <Archive className="w-4 h-4" />,
    onClick: onArchive,
    variant: 'default',
  }),

  assign: (onAssign: (ids: Set<string>) => void | Promise<void>): BulkAction => ({
    label: 'Assign',
    icon: <Edit className="w-4 h-4" />,
    onClick: onAssign,
    variant: 'default',
  }),

  tag: (onTag: (ids: Set<string>) => void | Promise<void>): BulkAction => ({
    label: 'Add Tags',
    icon: <Tag className="w-4 h-4" />,
    onClick: onTag,
    variant: 'default',
  }),

  email: (onEmail: (ids: Set<string>) => void | Promise<void>): BulkAction => ({
    label: 'Send Email',
    icon: <Mail className="w-4 h-4" />,
    onClick: onEmail,
    variant: 'default',
  }),
};
