/**
 * ActionPreview - Single action with confirm/reject buttons
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Activity,
  Building2,
  User,
  FileText,
  DollarSign,
  AlertCircle,
  Sparkles,
  Calendar,
  Undo2,
  Trash2,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import type { ExtractedAction } from './useConversation';
import type { CommandAction } from '@/lib/command/types';
import { ReasoningPanel } from './ReasoningPanel';

// Action icons mapping
const actionIcons: Record<string, typeof Activity> = {
  LOG_ACTIVITY: Activity,
  UPDATE_DEAL: DollarSign,
  UPDATE_STAGE: Building2,
  ADD_NOTE: FileText,
  CREATE_ORG: Building2,
  CREATE_USER: User,
  CREATE_TICKET: AlertCircle,
  CREATE_FEATURE_REQUEST: Sparkles,
  SCHEDULE_FOLLOWUP: Calendar,
  QUICK_STATUS_UPDATE: Activity,
  // Delete actions
  DELETE_ORG: Trash2,
  DELETE_USER: Trash2,
  DELETE_TICKET: Trash2,
  DELETE_FEATURE_REQUEST: Trash2,
  DELETE_ROADMAP_ITEM: Trash2,
  DELETE_TIMELINE_EVENT: Trash2,
  DELETE_NOTE: Trash2,
  DELETE_FOLLOWUP: Trash2,
};

// Action display names
const actionDisplayNames: Record<string, string> = {
  LOG_ACTIVITY: 'Log Activity',
  UPDATE_DEAL: 'Update Deal',
  UPDATE_STAGE: 'Update Stage',
  ADD_NOTE: 'Add Note',
  CREATE_ORG: 'Create Organization',
  CREATE_USER: 'Create User',
  CREATE_TICKET: 'Create Ticket',
  CREATE_FEATURE_REQUEST: 'Feature Request',
  SCHEDULE_FOLLOWUP: 'Schedule Follow-up',
  QUICK_STATUS_UPDATE: 'Quick Status',
  // Delete actions
  DELETE_ORG: 'Delete Organization',
  DELETE_USER: 'Delete User',
  DELETE_TICKET: 'Delete Ticket',
  DELETE_FEATURE_REQUEST: 'Delete Feature Request',
  DELETE_ROADMAP_ITEM: 'Delete Roadmap Item',
  DELETE_TIMELINE_EVENT: 'Delete Event',
  DELETE_NOTE: 'Delete Note',
  DELETE_FOLLOWUP: 'Delete Follow-up',
};

// Confidence bar color
function getConfidenceBarColor(confidence: number) {
  if (confidence >= 0.9) return 'bg-green-500';
  if (confidence >= 0.7) return 'bg-amber-500';
  return 'bg-red-500';
}

// Status colors - light theme with semantic tinting
function getStatusStyles(status: ExtractedAction['status']) {
  switch (status) {
    case 'executed':
      return 'bg-green-50 border-green-200 shadow-sm';
    case 'confirmed':
      return 'bg-accent-50 border-accent-200 shadow-sm';
    case 'rejected':
      return 'bg-gray-50 border-gray-200 opacity-60';
    case 'undone':
      return 'bg-gray-50 border-gray-200 opacity-50';
    default:
      return 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-accent-300';
  }
}

// Common action alternatives for quick switching
const ACTION_ALTERNATIVES: Record<string, { action: string; label: string }[]> = {
  UPDATE_DEAL: [
    { action: 'UPDATE_STAGE', label: 'Update Stage instead' },
    { action: 'ADD_NOTE', label: 'Just add a note' },
  ],
  UPDATE_STAGE: [
    { action: 'UPDATE_DEAL', label: 'Update Deal instead' },
    { action: 'ADD_NOTE', label: 'Just add a note' },
  ],
  DELETE_ORG: [
    { action: 'UPDATE_STAGE', label: 'Mark as Lost instead' },
    { action: 'ADD_NOTE', label: 'Just add a note' },
  ],
  LOG_ACTIVITY: [
    { action: 'ADD_NOTE', label: 'Add Note instead' },
    { action: 'UPDATE_DEAL', label: 'Update Deal instead' },
  ],
  ADD_NOTE: [
    { action: 'LOG_ACTIVITY', label: 'Log Activity instead' },
  ],
};

interface ActionPreviewProps {
  action: ExtractedAction;
  onConfirm: () => void;
  onReject: () => void;
  onUndo?: () => void;
  onChangeAction?: (newAction: string) => void;
  showDetails?: boolean;
}

export function ActionPreview({
  action,
  onConfirm,
  onReject,
  onUndo,
  onChangeAction,
  showDetails: initialShowDetails = false,
}: ActionPreviewProps) {
  const [showDetails, setShowDetails] = useState(initialShowDetails);
  const [showActionPicker, setShowActionPicker] = useState(false);
  const Icon = actionIcons[action.action] || Activity;
  const displayName = actionDisplayNames[action.action] || action.action.replace(/_/g, ' ');
  const confidencePercent = Math.round(action.confidence * 100);

  const isPending = action.status === 'pending';
  const isExecuted = action.status === 'executed';
  const isUndone = action.status === 'undone';
  const canUndo = isExecuted && action.undoExpiresAt && new Date() < action.undoExpiresAt;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className={`rounded-2xl border transition-all duration-200 ${getStatusStyles(action.status)}`}
    >
      {/* Status feedback strip - shown when executed or rejected */}
      {isExecuted && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-green-200 bg-green-50">
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700 font-medium">Completed</span>
        </div>
      )}
      {action.status === 'rejected' && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
          <X className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-500">Skipped</span>
        </div>
      )}
      {isUndone && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
          <Undo2 className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-500">Undone</span>
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer group"
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Status indicator - larger with shadow */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105 ${
            isExecuted
              ? 'bg-green-100'
              : action.status === 'rejected'
              ? 'bg-gray-200'
              : 'bg-accent-100'
          }`}
        >
          {isExecuted ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : action.status === 'rejected' ? (
            <X className="w-5 h-5 text-gray-500" />
          ) : isUndone ? (
            <Undo2 className="w-5 h-5 text-gray-500" />
          ) : (
            <Icon className="w-5 h-5 text-accent-600" />
          )}
        </div>

        {/* Content - two rows: summary + confidence meter */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <span className={`text-base font-medium block ${isUndone ? 'line-through text-gray-500' : 'text-gray-900'}`}>
            {action.summary}
          </span>
          <div className="flex items-center gap-3">
            {/* Confidence meter */}
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidencePercent}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`h-full rounded-full ${getConfidenceBarColor(action.confidence)}`}
                />
              </div>
              <span className="text-xs text-gray-500">{confidencePercent}%</span>
            </div>
            <span className="text-xs text-gray-500">{displayName}</span>
          </div>
        </div>

        {/* Actions - tactile buttons with shadows */}
        <div className="flex items-center gap-2.5">
          {isPending && (
            <>
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm();
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-600 text-white
                  shadow-sm hover:bg-green-500 hover:shadow-md
                  transition-all duration-200 font-medium text-sm"
              >
                <Check className="w-4 h-4" />
                <span>Confirm</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onReject();
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700
                  border border-gray-200 hover:bg-gray-200 hover:text-gray-900
                  transition-all duration-200 font-medium text-sm"
              >
                <X className="w-4 h-4" />
                <span>Skip</span>
              </motion.button>
              {/* Wrong action button */}
              {onChangeAction && ACTION_ALTERNATIVES[action.action] && (
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowActionPicker(!showActionPicker);
                    }}
                    className="flex items-center gap-1 px-2 py-2.5 rounded-xl text-gray-500
                      hover:bg-gray-100 hover:text-gray-700
                      transition-all duration-200 text-xs"
                    title="Wrong action? Click to change"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </motion.button>
                  {/* Action picker dropdown */}
                  <AnimatePresence>
                    {showActionPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl
                          shadow-lg border border-gray-200 py-1 min-w-[180px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                          Wrong action? Try:
                        </div>
                        {ACTION_ALTERNATIVES[action.action]?.map((alt) => (
                          <button
                            key={alt.action}
                            onClick={() => {
                              onChangeAction(alt.action);
                              setShowActionPicker(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700
                              hover:bg-gray-50 transition-colors text-left"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                            {alt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
          {canUndo && onUndo && (
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                onUndo();
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 text-white
                shadow-sm hover:bg-amber-500 hover:shadow-md
                transition-all duration-200 font-medium text-sm"
            >
              <Undo2 className="w-4 h-4" />
              <span>Undo</span>
            </motion.button>
          )}
          <div className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            {showDetails ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>
      </div>

      {/* Details - polished panel */}
      <AnimatePresence>
        {showDetails && action.resolvedCommand && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-200">
              {/* Extracted entities and fields */}
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
                  Extracted Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {action.resolvedCommand.entities.org && (
                    <div className="space-y-0.5">
                      <span className="text-xs text-gray-500 block">Organization</span>
                      <span className="font-medium text-gray-800">{action.resolvedCommand.entities.org.name}</span>
                    </div>
                  )}
                  {action.resolvedCommand.entities.user && (
                    <div className="space-y-0.5">
                      <span className="text-xs text-gray-500 block">User</span>
                      <span className="font-medium text-gray-800">{action.resolvedCommand.entities.user.name}</span>
                    </div>
                  )}
                  {action.resolvedCommand.parsed.fields.activity_type && (
                    <div className="space-y-0.5">
                      <span className="text-xs text-gray-500 block">Activity</span>
                      <span className="font-medium text-gray-800">{action.resolvedCommand.parsed.fields.activity_type}</span>
                    </div>
                  )}
                  {action.resolvedCommand.parsed.fields.deal_value && (
                    <div className="space-y-0.5">
                      <span className="text-xs text-gray-500 block">Deal Value</span>
                      <span className="font-medium text-gray-800">
                        ${action.resolvedCommand.parsed.fields.deal_value.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {action.resolvedCommand.parsed.fields.lifecycle_stage && (
                    <div className="space-y-0.5">
                      <span className="text-xs text-gray-500 block">Stage</span>
                      <span className="font-medium text-gray-800">{action.resolvedCommand.parsed.fields.lifecycle_stage}</span>
                    </div>
                  )}
                  {action.resolvedCommand.parsed.fields.note_text && (
                    <div className="col-span-2 space-y-0.5">
                      <span className="text-xs text-gray-500 block">Note</span>
                      <span className="font-medium text-gray-800">{action.resolvedCommand.parsed.fields.note_text}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reasoning panel - shows AI's understanding */}
              <ReasoningPanel
                reasoning={action.resolvedCommand.parsed.reasoning}
                extractedSpans={action.resolvedCommand.parsed.extractedSpans}
                confidenceBreakdown={action.resolvedCommand.confidenceBreakdown}
                defaultExpanded={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ActionPreview;
