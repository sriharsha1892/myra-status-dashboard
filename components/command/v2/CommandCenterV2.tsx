/**
 * CommandCenterV2 - Conversational AI Command Center
 * Main container component that orchestrates the chat-like experience
 * Enhanced with Context Sidebar and Session History for power users
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, HelpCircle, Settings, Trash2, Clock, PanelRightClose, PanelRightOpen } from 'lucide-react';
// Toasts removed - feedback is shown within action cards

import { useConversation, type ExtractedAction, type SessionAction } from './useConversation';
import { ConversationStream } from './ConversationStream';
import { CommandInput } from './CommandInput';
import { SmartSuggestionsV2 } from './SmartSuggestionsV2';
import { UndoRail } from './UndoRail';
import { ContextSidebar } from './ContextSidebar';
import { SessionHistoryPanel } from './SessionHistoryPanel';
import { ActionChips } from './ActionChips';
import { TypingHints } from './TypingHints';
import { isConfirmation, isRejection, detectFollowUp } from '@/lib/command/contextInference';
import { detectQuery, isDefinitelyQuery } from '@/lib/command/queryDetector';
import { applyClarification, type ClarificationOption } from '@/lib/command/clarificationEngine';
import type { BatchCommandResponse, ExecutionResult, ResolvedCommand, CommandAction } from '@/lib/command/types';

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.90,    // Auto-execute
  MEDIUM: 0.70,  // Show for confirmation
};

interface CommandCenterV2Props {
  onHelpClick?: () => void;
  onSettingsClick?: () => void;
}

export function CommandCenterV2({ onHelpClick, onSettingsClick }: CommandCenterV2Props) {
  const {
    messages,
    input,
    isProcessing,
    undoableActions,
    sessionContext,
    sessionActions,
    setInput,
    sendMessage,
    setAIResponse,
    setAIError,
    confirmAction,
    rejectAction,
    executeAction,
    changeActionType,
    answerClarification,
    addUndoable,
    removeUndoable,
    undoAction,
    updateSessionContext,
    setFocusedOrg,
    addSessionAction,
    markSessionActionUndone,
    clearSessionHistory,
    clearConversation,
    messagesEndRef,
  } = useConversation();

  // UI state
  const [showSidebar, setShowSidebar] = useState(true);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // Track recent actions for smart suggestions
  const recentActions = useMemo(() => {
    const actions: string[] = [];
    messages.forEach((msg) => {
      if (msg.type === 'ai' && msg.actions) {
        msg.actions.forEach((a) => {
          if (a.status === 'executed' && !actions.includes(a.action)) {
            actions.push(a.action);
          }
        });
      }
    });
    return actions.slice(-5) as any[]; // Last 5 unique actions
  }, [messages]);

  // Get pending actions from most recent AI message
  const pendingActions = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.type === 'ai' && msg.actions) {
        const pending = msg.actions.filter(a => a.status === 'pending');
        if (pending.length > 0) {
          return { messageId: msg.id, actions: pending };
        }
      }
    }
    return null;
  }, [messages]);

  // Process user message through AI
  const processMessage = useCallback(async () => {
    if (!input.trim() || isProcessing) return;

    const userInput = input.trim();

    // Check for natural confirmation - confirm all pending actions
    if (isConfirmation(userInput) && pendingActions) {
      setInput('');
      for (const action of pendingActions.actions) {
        await handleConfirmAction(pendingActions.messageId, action.id);
      }
      return;
    }

    // Check for natural rejection - reject all pending actions
    if (isRejection(userInput) && pendingActions) {
      setInput('');
      for (const action of pendingActions.actions) {
        rejectAction(pendingActions.messageId, action.id);
      }
      // Feedback shown in card status
      return;
    }

    // Check for follow-up patterns
    const followUp = detectFollowUp(userInput, {
      focusedOrgId: sessionContext.focusedOrgId,
      focusedOrgName: sessionContext.focusedOrgName,
      recentOrgs: sessionContext.recentOrgs.map(name => ({ id: '', name })),
      recentUsers: [],
      conversationTopics: [],
    });

    // If "same for X", modify the command to use the new org
    let processedInput = userInput;
    if (followUp.isFollowUp && followUp.type === 'different_org' && followUp.targetOrg) {
      // Find last executed action and create similar command for new org
      const lastExecuted = sessionActions.find(a => a.status === 'executed');
      if (lastExecuted) {
        processedInput = lastExecuted.command.replace(
          new RegExp(lastExecuted.orgName || '', 'gi'),
          followUp.targetOrg
        );
      }
    }

    // Check if this is a query (question) rather than an action
    if (isDefinitelyQuery(processedInput)) {
      const aiMessageId = sendMessage(processedInput);
      try {
        const queryResponse = await fetch('/api/command/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: processedInput,
            session_context: {
              focused_org_id: sessionContext.focusedOrgId,
              focused_org_name: sessionContext.focusedOrgName,
              recent_orgs: sessionContext.recentOrgs,
            },
          }),
        });

        const queryData = await queryResponse.json();

        if (queryData.success) {
          // Show query answer as a system message-like response
          setAIResponse(aiMessageId, [], queryData.answer);

          // If query returned suggestions, we could show them
          if (queryData.suggestions?.length > 0) {
            // Suggestions are embedded in the answer
          }
        } else {
          setAIError(aiMessageId, queryData.error || 'Could not answer that question');
        }
      } catch (error: any) {
        setAIError(aiMessageId, error.message || 'Failed to process question');
      }
      return;
    }

    // Create user message and get AI message ID
    // sendMessage returns the AI message ID that will be created
    const aiMessageId = sendMessage(processedInput);

    try {
      // Call the API with session context for inference
      const response = await fetch('/api/command/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [processedInput],
          auto_execute_high_confidence: true,
          // Pass session context for smart inference
          session_context: {
            focused_org_id: sessionContext.focusedOrgId,
            focused_org_name: sessionContext.focusedOrgName,
            recent_orgs: sessionContext.recentOrgs,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process command');
      }

      const data: BatchCommandResponse = await response.json();

      // Transform results to ExtractedActions
      const extractedActions: ExtractedAction[] = data.results.map((result) => ({
        id: result.id,
        action: result.parsed.action,
        summary: generateActionSummary(result),
        confidence: result.parsed.confidence,
        status: determineInitialStatus(result),
        resolvedCommand: result,
        executionResult: (result as any).executionResult,
        undoExpiresAt: (result as any).executionResult?.undo_expires_at
          ? new Date((result as any).executionResult.undo_expires_at)
          : undefined,
      }));

      // Update AI response with actions using the ID returned from sendMessage
      setAIResponse(aiMessageId, extractedActions, generateResponseContent(data.summary));

      // Add auto-executed actions to undo rail and session history
      extractedActions
        .filter((a) => a.status === 'executed')
        .forEach((action) => {
          // Add to undo rail if undoable
          if (action.undoExpiresAt) {
            addUndoable(action);
          }

          // Add to session history
          const sessionAction: SessionAction = {
            id: action.id,
            timestamp: new Date(),
            command: userInput,
            action: action.action,
            summary: action.summary,
            orgName: action.resolvedCommand?.entities.org?.name || null,
            status: 'executed',
          };
          addSessionAction(sessionAction);
        });

      // Update session context and focused org
      const orgData = extractedActions
        .filter((a) => a.resolvedCommand?.entities.org)
        .map((a) => ({
          id: a.resolvedCommand!.entities.org!.id,
          name: a.resolvedCommand!.entities.org!.name,
        }));

      if (orgData.length > 0) {
        const orgNames = orgData.map((o) => o.name);
        updateSessionContext({
          recentOrgs: [...new Set([...orgNames, ...sessionContext.recentOrgs])].slice(0, 5),
          lastActionTime: new Date(),
        });

        // Set focused org to most recently mentioned
        setFocusedOrg(orgData[0].id, orgData[0].name);
      }

      // Auto-executed actions show status in card
    } catch (error: any) {
      console.error('Command processing error:', error);
      // Use the aiMessageId we got from sendMessage
      setAIError(aiMessageId, error.message || 'Failed to process your request');
    }
  }, [input, isProcessing, messages, sendMessage, setAIResponse, setAIError, addUndoable, addSessionAction, updateSessionContext, setFocusedOrg, sessionContext, pendingActions, sessionActions, setInput, rejectAction]);

  // Handle action confirmation
  const handleConfirmAction = useCallback(
    async (messageId: string, actionId: string) => {
      // Find the action
      const message = messages.find((m) => m.id === messageId);
      const action = message?.actions?.find((a) => a.id === actionId);

      if (!action || !action.resolvedCommand) {
        return;
      }

      confirmAction(messageId, actionId);

      try {
        // Execute the action
        const response = await fetch('/api/command/process', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: action.resolvedCommand }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to execute action');
        }

        const result: ExecutionResult = await response.json();

        executeAction(messageId, actionId, result);

        if (result.success) {
          // Add to undo rail if undoable
          if (result.undo_id && result.undo_expires_at) {
            addUndoable({
              ...action,
              status: 'executed',
              executionResult: result,
              undoExpiresAt: new Date(result.undo_expires_at),
            });
          }

          // Add to session history
          const sessionAction: SessionAction = {
            id: action.id,
            timestamp: new Date(),
            command: action.summary,
            action: action.action,
            summary: action.summary,
            orgName: action.resolvedCommand?.entities.org?.name || null,
            status: 'executed',
          };
          addSessionAction(sessionAction);
        }
        // Feedback shown in card status
      } catch (error: any) {
        rejectAction(messageId, actionId);
      }
    },
    [messages, confirmAction, executeAction, addUndoable, addSessionAction, rejectAction]
  );

  // Handle action rejection
  const handleRejectAction = useCallback(
    (messageId: string, actionId: string) => {
      rejectAction(messageId, actionId);
    },
    [rejectAction]
  );

  // Handle action type change (when user clicks "Wrong action?")
  const handleChangeAction = useCallback(
    (messageId: string, actionId: string, newActionType: string) => {
      changeActionType(messageId, actionId, newActionType as any);
    },
    [changeActionType]
  );

  // Handle clarification answers
  const handleAnswerClarification = useCallback(
    (messageId: string, actionId: string, answers: Record<string, string | ClarificationOption>) => {
      // Find the action to get its current fields
      const message = messages.find((m) => m.id === messageId);
      const action = message?.actions?.find((a) => a.id === actionId);

      if (!action?.resolvedCommand) {
        return;
      }

      // Apply clarification to get refined action and fields
      const refined = applyClarification(
        {
          action: action.action,
          confidence: action.confidence,
          fields: action.resolvedCommand.parsed.fields,
          org_name: action.resolvedCommand.parsed.org_name,
          user_name: action.resolvedCommand.parsed.user_name,
        },
        answers
      );

      // Update the action with refined values
      answerClarification(
        messageId,
        actionId,
        answers,
        refined.action as CommandAction,
        refined.fields
      );
    },
    [messages, answerClarification]
  );

  // Handle undo
  const handleUndo = useCallback(
    async (actionId: string) => {
      // Find the action in undoableActions
      const action = undoableActions.find((a) => a.id === actionId);
      if (!action?.executionResult?.undo_id) {
        return;
      }

      try {
        const response = await fetch('/api/command/undo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ undo_id: action.executionResult.undo_id }),
        });

        if (!response.ok) {
          return;
        }

        undoAction(actionId);
        removeUndoable(actionId);
        markSessionActionUndone(actionId);
        // Card updates to show undone status
      } catch (error: any) {
        // Silent fail - undo rail will be removed anyway
      }
    },
    [undoableActions, undoAction, removeUndoable, markSessionActionUndone]
  );

  // Handle quick action from sidebar
  const handleQuickAction = useCallback(
    (template: string) => {
      setInput(template);
    },
    [setInput]
  );

  // Handle re-run from session history
  const handleRerun = useCallback(
    (command: string) => {
      setInput(command);
      setShowHistoryPanel(false);
    },
    [setInput]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Z: Undo most recent
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && undoableActions.length > 0) {
        e.preventDefault();
        const mostRecent = undoableActions[undoableActions.length - 1];
        if (mostRecent) {
          handleUndo(mostRecent.id);
        }
      }

      // Cmd/Ctrl + H: Toggle history panel
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        setShowHistoryPanel((prev) => !prev);
      }

      // Cmd/Ctrl + B: Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setShowSidebar((prev) => !prev);
      }

      // Escape: Clear conversation (if not in history panel)
      if (e.key === 'Escape') {
        if (showHistoryPanel) {
          setShowHistoryPanel(false);
        } else if (messages.length > 0 && confirm('Clear conversation?')) {
          clearConversation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoableActions, messages.length, handleUndo, clearConversation, showHistoryPanel]);

  // Map undoable actions to UndoRail format
  const undoRailActions = useMemo(
    () =>
      undoableActions.map((action) => ({
        id: action.id,
        summary: action.summary,
        expiresAt: action.undoExpiresAt || new Date(Date.now() + 10000),
        onUndo: () => handleUndo(action.id),
      })),
    [undoableActions, handleUndo]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Command Center</h1>
              <p className="text-xs text-gray-500">Type naturally to update trial data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* History Toggle */}
            <button
              onClick={() => setShowHistoryPanel(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 hover:text-accent-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Session history (⌘H)"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
              {sessionActions.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium text-accent-600 bg-accent-100 rounded-full">
                  {sessionActions.filter((a) => a.status === 'executed').length}
                </span>
              )}
            </button>

            {messages.length > 0 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={clearConversation}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            )}
            {onHelpClick && (
              <button
                onClick={onHelpClick}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Help"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
            {onSettingsClick && (
              <button
                onClick={onSettingsClick}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            {/* Sidebar Toggle */}
            <button
              onClick={() => setShowSidebar((prev) => !prev)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              title={showSidebar ? 'Hide sidebar (⌘B)' : 'Show sidebar (⌘B)'}
            >
              {showSidebar ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Conversation Stream */}
        <ConversationStream
          messages={messages}
          onConfirmAction={handleConfirmAction}
          onRejectAction={handleRejectAction}
          onUndoAction={handleUndo}
          onChangeAction={handleChangeAction}
          onAnswerClarification={handleAnswerClarification}
          messagesEndRef={messagesEndRef}
        />

        {/* Action Chips - Show prominently when no messages */}
        {messages.length === 0 && (
          <div className="px-4 py-3 border-t border-gray-200">
            <ActionChips
              onSelect={(template) => setInput(template)}
              focusedOrgName={sessionContext.focusedOrgName}
            />
          </div>
        )}

        {/* Smart Suggestions - Show after conversation started */}
        {messages.length > 0 && (
          <div className="px-4 py-2">
            <SmartSuggestionsV2
              recentOrgs={sessionContext.recentOrgs}
              recentActions={recentActions}
              lastActionTime={sessionContext.lastActionTime}
              focusedOrgId={sessionContext.focusedOrgId}
              onSelect={(template) => setInput(template)}
            />
          </div>
        )}

        {/* Typing Hints - Real-time suggestions as user types */}
        {input.length >= 2 && (
          <div className="px-4 pb-2">
            <TypingHints
              input={input}
              focusedOrgName={sessionContext.focusedOrgName}
              recentOrgs={sessionContext.recentOrgs}
              onComplete={(completion) => setInput(completion)}
            />
          </div>
        )}

        {/* Pending Action Hint */}
        {pendingActions && pendingActions.actions.length > 0 && (
          <div className="px-4 pb-2">
            <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              {pendingActions.actions.length} action{pendingActions.actions.length > 1 ? 's' : ''} waiting for confirmation.
              Type <span className="font-medium">&quot;yes&quot;</span> to confirm or <span className="font-medium">&quot;no&quot;</span> to skip.
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-4 pb-4 border-t border-gray-200 pt-4">
          <CommandInput
            value={input}
            onChange={setInput}
            onSubmit={processMessage}
            isProcessing={isProcessing}
          />
        </div>

        {/* Undo Rail */}
        <AnimatePresence>
          {undoRailActions.length > 0 && (
            <UndoRail
              undoableActions={undoRailActions}
              onDismiss={(id) => removeUndoable(id)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Context Sidebar - Desktop */}
      <AnimatePresence>
        {showSidebar && sessionContext.focusedOrgId && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 320 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden lg:block"
          >
            <ContextSidebar
              orgId={sessionContext.focusedOrgId}
              onClose={() => setFocusedOrg(null, null)}
              onQuickAction={handleQuickAction}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session History Panel */}
      <SessionHistoryPanel
        isOpen={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
        sessionActions={sessionActions}
        onRerun={handleRerun}
        onClearHistory={clearSessionHistory}
      />
    </div>
  );
}

// Helper: Generate action summary
function generateActionSummary(result: ResolvedCommand): string {
  const action = result.parsed.action;
  const org = result.entities.org?.name;
  const user = result.entities.user?.name;

  switch (action) {
    case 'LOG_ACTIVITY':
      return `Log ${result.parsed.fields.activity_type || 'activity'} at ${org || 'unknown'}`;
    case 'UPDATE_DEAL':
      return `Update deal ${result.parsed.fields.deal_value ? `to $${result.parsed.fields.deal_value.toLocaleString()}` : ''} for ${org || 'unknown'}`;
    case 'UPDATE_STAGE':
      return `Update ${org || 'unknown'} to ${result.parsed.fields.lifecycle_stage || 'new stage'}`;
    case 'ADD_NOTE':
      return `Add note to ${org || 'unknown'}`;
    case 'CREATE_ORG':
      return `Create organization "${result.parsed.org_name}"`;
    case 'CREATE_TICKET':
      return `Create ticket "${result.parsed.fields.ticket_title}"`;
    case 'QUICK_STATUS_UPDATE':
      return `Quick status update for ${org || 'unknown'}`;
    default:
      return `${action.replace(/_/g, ' ')} for ${org || user || 'unknown'}`;
  }
}

// Helper: Determine initial status based on confidence
function determineInitialStatus(result: ResolvedCommand): ExtractedAction['status'] {
  // Already executed by API
  if (result.status === 'success') return 'executed';
  if (result.status === 'failed') return 'rejected';

  // Determine by confidence
  if (result.parsed.confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return (result as any).executionResult ? 'executed' : 'pending';
  }

  return 'pending';
}

// Helper: Generate response content
function generateResponseContent(summary: BatchCommandResponse['summary']): string {
  const parts: string[] = [];

  if (summary.auto_executed > 0) {
    parts.push(`${summary.auto_executed} action${summary.auto_executed > 1 ? 's' : ''} executed automatically.`);
  }
  if (summary.needs_confirmation > 0) {
    parts.push(`${summary.needs_confirmation} need${summary.needs_confirmation > 1 ? '' : 's'} your confirmation.`);
  }
  if (summary.failed > 0) {
    parts.push(`${summary.failed} failed to process.`);
  }

  return parts.join(' ') || '';
}

export default CommandCenterV2;
