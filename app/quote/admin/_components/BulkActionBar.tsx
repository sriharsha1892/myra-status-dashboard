'use client';

import React, { useState } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import type { OrgStatus } from '@/lib/quote/pipeline-types';
import { ORG_STATUS_LABELS, ORG_STATUS_COLORS } from '@/lib/quote/pipeline-types';
import { ORG_STATUSES } from '@/lib/quote/utils';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStatusChange: (status: OrgStatus) => Promise<void>;
  isLoading?: boolean;
}

export default function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkStatusChange,
  isLoading = false,
}: BulkActionBarProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  if (selectedCount === 0) return null;

  const handleStatusChange = async (status: OrgStatus) => {
    setChangingStatus(true);
    try {
      await onBulkStatusChange(status);
      setShowStatusMenu(false);
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-3 px-4 py-3 bg-violet-600 text-white rounded-2xl shadow-xl shadow-violet-500/25">
        {/* Selection Count */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <span className="font-medium">{selectedCount} selected</span>
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Status Change Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            disabled={changingStatus || isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50"
          >
            <span className="text-sm">Change Status</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
          </button>

          {showStatusMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden">
              {ORG_STATUSES.map((status) => (
                <button
                  key={status.id}
                  onClick={() => handleStatusChange(status.id)}
                  disabled={changingStatus}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-neutral-50 text-left transition-colors disabled:opacity-50"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm text-neutral-700">{status.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          disabled={changingStatus || isLoading}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Loading indicator */}
        {(changingStatus || isLoading) && (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
