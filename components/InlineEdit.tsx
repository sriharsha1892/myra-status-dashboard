'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Edit2 } from 'lucide-react';
import { useOptimisticUpdate } from '@/hooks/useOptimisticUpdate';

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  className?: string;
  displayClassName?: string;
  inputClassName?: string;
  successMessage?: string;
  autoSaveDelay?: number; // milliseconds, default 1000
  allowEmpty?: boolean;
}

/**
 * Inline editable text with auto-save
 *
 * Usage:
 * <InlineEdit
 *   value={title}
 *   onSave={async (newValue) => {
 *     await supabase.from('table').update({ title: newValue })
 *   }}
 *   successMessage="Title updated"
 * />
 */
export default function InlineEdit({
  value: initialValue,
  onSave,
  placeholder = 'Click to edit...',
  multiline = false,
  maxLength,
  className = '',
  displayClassName = '',
  inputClassName = '',
  successMessage,
  autoSaveDelay = 1000,
  allowEmpty = false,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isSaved, setIsSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  const { update, isUpdating } = useOptimisticUpdate({
    onUpdate: onSave,
    successMessage,
    onSuccess: () => {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    },
    onError: () => {
      setValue(initialValue); // Rollback
    },
  });

  // Auto-save after delay
  useEffect(() => {
    if (isEditing && value !== initialValue) {
      // Clear previous timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new timer
      autoSaveTimerRef.current = setTimeout(() => {
        handleSave();
      }, autoSaveDelay);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [value, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmedValue = value.trim();

    // Validate
    if (!allowEmpty && !trimmedValue) {
      setValue(initialValue);
      setIsEditing(false);
      return;
    }

    // No change
    if (trimmedValue === initialValue) {
      setIsEditing(false);
      return;
    }

    // Save
    await update(trimmedValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Auto-save on blur if there are changes
    if (value !== initialValue) {
      handleSave();
    } else {
      setIsEditing(false);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      {!isEditing ? (
        // Display mode
        <div
          onClick={() => setIsEditing(true)}
          className={`
            cursor-pointer rounded px-2 py-1 -mx-2 -my-1
            hover:bg-gray-100 transition-colors
            flex items-center justify-between
            ${displayClassName}
          `}
        >
          <span className={!value ? 'text-gray-400 italic' : ''}>
            {value || placeholder}
          </span>

          {/* Edit icon on hover */}
          <Edit2 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />

          {/* Saved indicator */}
          <AnimatePresence>
            {isSaved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute -right-8 flex items-center space-x-1 text-green-600"
              >
                <Check className="w-4 h-4" />
                <span className="text-xs font-medium">Saved</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        // Edit mode
        <div className="relative">
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              maxLength={maxLength}
              disabled={isUpdating}
              className={`
                w-full px-2 py-1 border-2 border-blue-500 rounded
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:opacity-60 disabled:cursor-not-allowed
                ${inputClassName}
              `}
              rows={3}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              maxLength={maxLength}
              disabled={isUpdating}
              className={`
                w-full px-2 py-1 border-2 border-blue-500 rounded
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:opacity-60 disabled:cursor-not-allowed
                ${inputClassName}
              `}
            />
          )}

          {/* Character count */}
          {maxLength && (
            <div className="absolute -bottom-5 right-0 text-xs text-gray-500">
              {value.length}/{maxLength}
            </div>
          )}

          {/* Action buttons */}
          <div className="absolute -right-20 top-0 flex items-center space-x-1">
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded transition-colors disabled:opacity-60"
              title="Save (Enter)"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="p-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-60"
              title="Cancel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Loading indicator */}
          {isUpdating && (
            <div className="absolute -right-28 top-1">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Inline edit for numbers
 */
export function InlineEditNumber({
  value,
  onSave,
  min,
  max,
  step = 1,
  ...props
}: Omit<InlineEditProps, 'value' | 'onSave' | 'multiline'> & {
  value: number;
  onSave: (newValue: number) => Promise<void>;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <InlineEdit
      value={String(value)}
      onSave={async (newValue) => {
        const num = parseFloat(newValue);
        if (isNaN(num)) return;
        if (min !== undefined && num < min) return;
        if (max !== undefined && num > max) return;
        await onSave(num);
      }}
      {...props}
    />
  );
}
