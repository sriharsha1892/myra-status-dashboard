'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface InlineStatusSelectProps {
  value: string;
  ticketId: string;
  onChange: (ticketId: string, newStatus: string) => Promise<void>;
  onCancel?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'New', label: 'New', color: 'bg-blue-50 text-blue-700' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-amber-50 text-amber-700' },
  { value: 'Waiting on User', label: 'Waiting on User', color: 'bg-orange-50 text-orange-700' },
  { value: 'Resolved', label: 'Resolved', color: 'bg-green-50 text-green-700' },
  { value: 'Closed', label: 'Closed', color: 'bg-neutral-50 text-neutral-700' },
];

export default function InlineStatusSelect({
  value,
  ticketId,
  onChange,
  onCancel,
}: InlineStatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentOption = STATUS_OPTIONS.find((opt) => opt.value === selectedStatus);

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
        setSelectedStatus(value);
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

  const handleStatusSelect = async (newStatus: string) => {
    if (newStatus === value) {
      setIsOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await onChange(ticketId, newStatus);
      setSelectedStatus(newStatus);
      setIsOpen(false);
      // Show success checkmark briefly
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    } catch (error) {
      // Rollback on error
      setSelectedStatus(value);
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
          currentOption?.color || 'bg-neutral-50 text-neutral-700'
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
            {selectedStatus}
          </>
        ) : (
          selectedStatus
        )}
      </button>

      {isOpen && !isSaving && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 overflow-hidden"
        >
          <div className="py-1">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusSelect(option.value);
                }}
                className={`w-full flex items-center px-3 py-2 text-sm text-left transition-colors ${
                  option.value === selectedStatus
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full mr-2.5 ${
                  option.value === 'New' ? 'bg-blue-600' :
                  option.value === 'In Progress' ? 'bg-amber-600' :
                  option.value === 'Waiting on User' ? 'bg-orange-600' :
                  option.value === 'Resolved' ? 'bg-green-600' :
                  'bg-slate-600'
                }`} />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
