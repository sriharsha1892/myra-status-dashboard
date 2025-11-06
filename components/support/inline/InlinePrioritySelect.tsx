'use client';

import { useState, useRef, useEffect } from 'react';
import { Flag, Loader2, CheckCircle2 } from 'lucide-react';

interface InlinePrioritySelectProps {
  value: string;
  ticketId: string;
  onChange: (ticketId: string, newPriority: string) => Promise<void>;
  onCancel?: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical', color: 'bg-red-50 text-red-700', dot: 'bg-red-600' },
  { value: 'High', label: 'High', color: 'bg-orange-50 text-orange-700', dot: 'bg-orange-600' },
  { value: 'Medium', label: 'Medium', color: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-600' },
  { value: 'Low', label: 'Low', color: 'bg-slate-50 text-slate-700', dot: 'bg-slate-600' },
];

export default function InlinePrioritySelect({
  value,
  ticketId,
  onChange,
  onCancel,
}: InlinePrioritySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentOption = PRIORITY_OPTIONS.find((opt) => opt.value === selectedPriority);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        if (onCancel) onCancel();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSelectedPriority(value);
        if (onCancel) onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, value, onCancel]);

  const handlePrioritySelect = async (newPriority: string) => {
    if (newPriority === value) {
      setIsOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await onChange(ticketId, newPriority);
      setSelectedPriority(newPriority);
      setIsOpen(false);
      // Show success checkmark briefly
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    } catch (error) {
      // Rollback on error
      setSelectedPriority(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        disabled={isSaving}
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all ${
          currentOption?.color || 'bg-slate-50 text-slate-700'
        } ${
          isOpen ? 'ring-2 ring-blue-600/20' : 'hover:opacity-80'
        } ${
          isSaving ? 'opacity-50 cursor-wait' : 'cursor-pointer'
        }`}
      >
        {isSaving ? (
          <>
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" strokeWidth={2} />
            Saving...
          </>
        ) : showSaved ? (
          <>
            <CheckCircle2 className="w-3 h-3 mr-1.5 text-green-600" strokeWidth={2} />
            {selectedPriority}
          </>
        ) : (
          <>
            {selectedPriority === 'Critical' && (
              <Flag className="w-3 h-3 mr-1" strokeWidth={2} />
            )}
            {selectedPriority}
          </>
        )}
      </button>

      {isOpen && !isSaving && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden"
        >
          <div className="py-1">
            {PRIORITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrioritySelect(option.value);
                }}
                className={`w-full flex items-center px-3 py-2 text-sm text-left transition-colors ${
                  option.value === selectedPriority
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {option.value === 'Critical' ? (
                  <Flag className="w-3 h-3 mr-2.5 text-red-600" strokeWidth={2} />
                ) : (
                  <span className={`w-2 h-2 rounded-full mr-2.5 ${option.dot}`} />
                )}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
