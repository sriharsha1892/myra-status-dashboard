'use client';

/**
 * EditableCell Component - Glassmorphism Edition
 *
 * Click-to-edit cell for inline editing in staged rows table.
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: string | number | null | undefined;
  fieldKey: string;
  stagingId: string;
  onSave: (stagingId: string, fieldKey: string, newValue: unknown) => Promise<void>;
  type?: 'text' | 'number';
  className?: string;
}

export function EditableCell({
  value,
  fieldKey,
  stagingId,
  onSave,
  type = 'text',
  className,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ''));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update editValue when value prop changes
  useEffect(() => {
    setEditValue(String(value ?? ''));
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === String(value ?? '')) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const newValue = type === 'number' ? parseFloat(editValue) || 0 : editValue;
      await onSave(stagingId, fieldKey, newValue);
      setIsEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(String(value ?? ''));
      setIsEditing(false);
      setError(null);
    }
  };

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className={cn(
            'w-full px-2 py-1 text-sm rounded-lg transition-all',
            'bg-white/10 border border-purple-500/50 text-white',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:bg-white/15',
            error && 'border-red-500/50 bg-red-500/10',
            isSaving && 'opacity-50',
            className
          )}
        />
        {isSaving && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute left-0 top-full mt-1 z-10 px-2 py-1 text-xs text-white bg-red-600/90 backdrop-blur-sm rounded-lg shadow-lg whitespace-nowrap">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        'px-2 py-1 cursor-pointer rounded-lg min-h-[28px] text-sm',
        'transition-all duration-200 truncate',
        'hover:bg-white/10 text-white/80 hover:text-white',
        !value && 'text-white/30 italic',
        className
      )}
      title={String(value ?? '')}
    >
      {value ?? '-'}
    </div>
  );
}
