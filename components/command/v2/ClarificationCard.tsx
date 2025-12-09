/**
 * ClarificationCard - "Did you mean?" disambiguation UI
 *
 * Shows when an entity isn't found but close matches exist.
 * Allows user to select from alternatives or create new.
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  HelpCircle,
  Building2,
  User,
  Plus,
  Check,
  X,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

export interface ClarificationOption {
  id: string;
  label: string;
  sublabel?: string;
  confidence: number;
  isCreateNew?: boolean;
}

export interface ClarificationRequest {
  type: 'org_disambiguation' | 'user_disambiguation' | 'confirm_destructive';
  searchTerm: string;
  question: string;
  options: ClarificationOption[];
  allowCustom: boolean;
  allowCreate?: boolean;
  originalActionId?: string;
}

interface ClarificationCardProps {
  request: ClarificationRequest;
  onSelect: (optionId: string, isCreateNew?: boolean) => void;
  onSkip: () => void;
  onCustomInput?: (value: string) => void;
  className?: string;
}

export function ClarificationCard({
  request,
  onSelect,
  onSkip,
  onCustomInput,
  className
}: ClarificationCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const isDestructive = request.type === 'confirm_destructive';

  const getIcon = () => {
    switch (request.type) {
      case 'org_disambiguation':
        return <Building2 className="w-5 h-5" />;
      case 'user_disambiguation':
        return <User className="w-5 h-5" />;
      case 'confirm_destructive':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <HelpCircle className="w-5 h-5" />;
    }
  };

  const handleSelect = (option: ClarificationOption) => {
    setSelectedId(option.id);
    // Small delay for visual feedback
    setTimeout(() => {
      onSelect(option.id, option.isCreateNew);
    }, 150);
  };

  const handleCustomSubmit = () => {
    if (customValue.trim() && onCustomInput) {
      onCustomInput(customValue.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "rounded-xl border overflow-hidden",
        isDestructive
          ? "bg-red-50 border-red-200"
          : "bg-amber-50 border-amber-200",
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        "px-4 py-3 flex items-center gap-3",
        isDestructive
          ? "bg-red-100/50 border-b border-red-200"
          : "bg-amber-100/50 border-b border-amber-200"
      )}>
        <div className={cn(
          "p-2 rounded-lg",
          isDestructive
            ? "bg-red-200 text-red-700"
            : "bg-amber-200 text-amber-700"
        )}>
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className={cn(
            "font-medium text-sm",
            isDestructive ? "text-red-900" : "text-amber-900"
          )}>
            {request.question}
          </p>
          {request.searchTerm && (
            <p className={cn(
              "text-xs mt-0.5",
              isDestructive ? "text-red-600" : "text-amber-600"
            )}>
              Searching for: &quot;{request.searchTerm}&quot;
            </p>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="p-2">
        {request.options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option)}
            disabled={selectedId !== null}
            className={cn(
              "w-full p-3 rounded-lg flex items-center gap-3 transition-all text-left",
              "hover:bg-white hover:shadow-sm",
              selectedId === option.id && "bg-white shadow-sm ring-2 ring-violet-500",
              selectedId !== null && selectedId !== option.id && "opacity-50",
              option.isCreateNew && "border border-dashed border-gray-300"
            )}
          >
            {/* Selection indicator */}
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
              selectedId === option.id
                ? "bg-violet-600 border-violet-600"
                : "border-gray-300"
            )}>
              {selectedId === option.id && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>

            {/* Icon for create new */}
            {option.isCreateNew && (
              <div className="p-1.5 rounded-md bg-violet-100 text-violet-600">
                <Plus className="w-4 h-4" />
              </div>
            )}

            {/* Label */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium text-sm",
                option.isCreateNew ? "text-violet-700" : "text-gray-900"
              )}>
                {option.label}
              </p>
              {option.sublabel && (
                <p className="text-xs text-gray-500 truncate">{option.sublabel}</p>
              )}
            </div>

            {/* Confidence badge */}
            {!option.isCreateNew && option.confidence > 0 && (
              <span className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full",
                option.confidence >= 0.9
                  ? "bg-green-100 text-green-700"
                  : option.confidence >= 0.7
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
              )}>
                {Math.round(option.confidence * 100)}%
              </span>
            )}

            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        ))}

        {/* Create new option if allowed */}
        {request.allowCreate && !request.options.some(o => o.isCreateNew) && (
          <button
            onClick={() => {
              const createOption: ClarificationOption = {
                id: 'create_new',
                label: `Create "${request.searchTerm}"`,
                confidence: 1,
                isCreateNew: true
              };
              handleSelect(createOption);
            }}
            disabled={selectedId !== null}
            className={cn(
              "w-full p-3 rounded-lg flex items-center gap-3 transition-all text-left",
              "hover:bg-white hover:shadow-sm border border-dashed border-gray-300",
              selectedId !== null && "opacity-50"
            )}
          >
            <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
            <div className="p-1.5 rounded-md bg-violet-100 text-violet-600">
              <Plus className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-violet-700">
                Create new &quot;{request.searchTerm}&quot;
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        )}

        {/* Custom input option */}
        {request.allowCustom && (
          <>
            {showCustomInput ? (
              <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="Enter custom value..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customValue.trim()) {
                      handleCustomSubmit();
                    }
                    if (e.key === 'Escape') {
                      setShowCustomInput(false);
                      setCustomValue('');
                    }
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCustomSubmit}
                    disabled={!customValue.trim()}
                    className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:opacity-50"
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomValue('');
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomInput(true)}
                className="w-full mt-2 p-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Or enter a custom value...
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
        <button
          onClick={onSkip}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Skip
        </button>
      </div>
    </motion.div>
  );
}

export default ClarificationCard;
