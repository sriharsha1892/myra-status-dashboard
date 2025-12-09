/**
 * useConversation - State management for the conversational Command Center
 * Replaces 12+ useState hooks with a single useReducer
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';
import type { CommandAction, ResolvedCommand, ExecutionResult } from '@/lib/command/types';
import type { ClarificationQuestion, ClarificationOption } from '@/lib/command/clarificationEngine';

// ============ TYPES ============

export interface ExtractedAction {
  id: string;
  action: CommandAction;
  summary: string;
  confidence: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'executed' | 'undone' | 'needs_clarification';
  resolvedCommand?: ResolvedCommand;
  executionResult?: ExecutionResult;
  undoExpiresAt?: Date;
  // Clarification support
  clarificationQuestions?: ClarificationQuestion[];
}

export interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  // For AI messages
  actions?: ExtractedAction[];
  status?: 'thinking' | 'ready' | 'confirmed' | 'rejected';
}

export interface SessionContext {
  recentOrgs: string[];
  recentUsers: string[];
  lastActionTime?: Date;
  focusedOrgId: string | null;
  focusedOrgName: string | null;
}

export interface SessionAction {
  id: string;
  timestamp: Date;
  command: string;
  action: CommandAction;
  summary: string;
  orgName: string | null;
  status: 'executed' | 'undone';
}

export interface ConversationState {
  messages: Message[];
  input: string;
  isProcessing: boolean;
  sessionContext: SessionContext;
  undoableActions: ExtractedAction[];
  sessionActions: SessionAction[];
}

// ============ ACTIONS ============

export type ConversationAction =
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'SEND_MESSAGE'; payload: { content: string; aiMessageId: string } }
  | { type: 'AI_THINKING'; messageId: string }
  | { type: 'AI_RESPONSE'; messageId: string; payload: { actions: ExtractedAction[]; content?: string } }
  | { type: 'AI_ERROR'; messageId: string; error: string }
  | { type: 'CONFIRM_ACTION'; messageId: string; actionId: string }
  | { type: 'REJECT_ACTION'; messageId: string; actionId: string }
  | { type: 'EXECUTE_ACTION'; messageId: string; actionId: string; result: ExecutionResult }
  | { type: 'CHANGE_ACTION_TYPE'; messageId: string; actionId: string; newActionType: CommandAction }
  | { type: 'ANSWER_CLARIFICATION'; messageId: string; actionId: string; answers: Record<string, string | ClarificationOption>; refinedAction: CommandAction; refinedFields: Record<string, any> }
  | { type: 'ADD_UNDOABLE'; action: ExtractedAction }
  | { type: 'REMOVE_UNDOABLE'; actionId: string }
  | { type: 'UNDO_ACTION'; actionId: string }
  | { type: 'UPDATE_SESSION_CONTEXT'; payload: Partial<SessionContext> }
  | { type: 'SET_FOCUSED_ORG'; orgId: string | null; orgName: string | null }
  | { type: 'ADD_SESSION_ACTION'; action: SessionAction }
  | { type: 'MARK_SESSION_ACTION_UNDONE'; actionId: string }
  | { type: 'CLEAR_SESSION_HISTORY' }
  | { type: 'CLEAR_CONVERSATION' }
  | { type: 'ADD_SYSTEM_MESSAGE'; content: string };

// ============ INITIAL STATE ============

const initialState: ConversationState = {
  messages: [],
  input: '',
  isProcessing: false,
  sessionContext: {
    recentOrgs: [],
    recentUsers: [],
    focusedOrgId: null,
    focusedOrgName: null,
  },
  undoableActions: [],
  sessionActions: [],
};

// ============ HELPERS ============

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function updateMessageActions(
  messages: Message[],
  messageId: string,
  actionId: string,
  updater: (action: ExtractedAction) => ExtractedAction
): Message[] {
  return messages.map((msg) => {
    if (msg.id !== messageId || !msg.actions) return msg;
    return {
      ...msg,
      actions: msg.actions.map((a) => (a.id === actionId ? updater(a) : a)),
    };
  });
}

/**
 * Generate a human-readable summary for an action based on type and fields
 */
function generateActionSummary(actionType: CommandAction, fields?: Record<string, any>): string {
  if (!fields) return actionType.replace(/_/g, ' ').toLowerCase();

  const orgName = fields.org_name || 'organization';

  switch (actionType) {
    case 'UPDATE_DEAL': {
      const parts: string[] = ['Update deal'];
      if (fields.deal_status) parts.push(`to ${fields.deal_status}`);
      if (fields.deal_value) parts.push(`($${fields.deal_value.toLocaleString()})`);
      if (fields.org_name) parts.push(`for ${fields.org_name}`);
      return parts.join(' ');
    }
    case 'UPDATE_STAGE': {
      const stage = fields.lifecycle_stage || fields.trial_status || 'new stage';
      return `Update ${orgName} stage to ${stage}`;
    }
    case 'ADD_NOTE':
      return `Add note to ${orgName}`;
    case 'LOG_ACTIVITY': {
      const activity = fields.activity_type || 'activity';
      return `Log ${activity} for ${orgName}`;
    }
    case 'DELETE_ORG':
      return `Delete ${orgName}`;
    case 'DELETE_USER':
      return `Delete user ${fields.user_name || ''}`.trim();
    case 'CREATE_ORG':
      return `Create organization ${fields.org_name || ''}`.trim();
    case 'CREATE_USER':
      return `Create user ${fields.user_name || ''}`.trim();
    case 'SCHEDULE_FOLLOWUP':
      return `Schedule follow-up for ${orgName}`;
    default:
      return actionType.replace(/_/g, ' ').toLowerCase();
  }
}

// ============ REDUCER ============

function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: action.payload };

    case 'SEND_MESSAGE': {
      const userMessage: Message = {
        id: generateId(),
        type: 'user',
        content: action.payload.content,
        timestamp: new Date(),
      };
      const aiMessage: Message = {
        id: action.payload.aiMessageId, // Use the ID passed in
        type: 'ai',
        content: '',
        timestamp: new Date(),
        status: 'thinking',
        actions: [],
      };
      return {
        ...state,
        messages: [...state.messages, userMessage, aiMessage],
        input: '',
        isProcessing: true,
      };
    }

    case 'AI_THINKING':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.messageId ? { ...msg, status: 'thinking' as const } : msg
        ),
        isProcessing: true,
      };

    case 'AI_RESPONSE':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.messageId
            ? {
                ...msg,
                status: 'ready' as const,
                actions: action.payload.actions,
                content: action.payload.content || msg.content,
              }
            : msg
        ),
        isProcessing: false,
      };

    case 'AI_ERROR':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.messageId
            ? {
                ...msg,
                status: 'rejected' as const,
                content: action.error,
              }
            : msg
        ),
        isProcessing: false,
      };

    case 'CONFIRM_ACTION':
      return {
        ...state,
        messages: updateMessageActions(
          state.messages,
          action.messageId,
          action.actionId,
          (a) => ({ ...a, status: 'confirmed' })
        ),
      };

    case 'REJECT_ACTION':
      return {
        ...state,
        messages: updateMessageActions(
          state.messages,
          action.messageId,
          action.actionId,
          (a) => ({ ...a, status: 'rejected' })
        ),
      };

    case 'EXECUTE_ACTION':
      return {
        ...state,
        messages: updateMessageActions(
          state.messages,
          action.messageId,
          action.actionId,
          (a) => ({
            ...a,
            status: action.result.success ? 'executed' : 'rejected',
            executionResult: action.result,
            undoExpiresAt: action.result.undo_expires_at
              ? new Date(action.result.undo_expires_at)
              : undefined,
          })
        ),
      };

    case 'CHANGE_ACTION_TYPE':
      return {
        ...state,
        messages: updateMessageActions(
          state.messages,
          action.messageId,
          action.actionId,
          (a) => ({
            ...a,
            action: action.newActionType,
            summary: generateActionSummary(action.newActionType, a.resolvedCommand?.parsed.fields),
            // Reset status to pending so user can re-confirm
            status: 'pending',
          })
        ),
      };

    case 'ANSWER_CLARIFICATION':
      return {
        ...state,
        messages: updateMessageActions(
          state.messages,
          action.messageId,
          action.actionId,
          (a) => ({
            ...a,
            action: action.refinedAction,
            summary: generateActionSummary(action.refinedAction, action.refinedFields),
            // Clear clarification questions and set to pending for confirmation
            clarificationQuestions: undefined,
            status: 'pending',
            confidence: Math.min(0.95, (a.confidence || 0.5) + 0.2), // Boost confidence after clarification
            // Update resolved command with refined fields
            resolvedCommand: a.resolvedCommand ? {
              ...a.resolvedCommand,
              parsed: {
                ...a.resolvedCommand.parsed,
                action: action.refinedAction,
                fields: { ...a.resolvedCommand.parsed.fields, ...action.refinedFields },
              },
            } : undefined,
          })
        ),
      };

    case 'ADD_UNDOABLE':
      return {
        ...state,
        undoableActions: [...state.undoableActions, action.action],
      };

    case 'REMOVE_UNDOABLE':
      return {
        ...state,
        undoableActions: state.undoableActions.filter((a) => a.id !== action.actionId),
      };

    case 'UNDO_ACTION': {
      // Find and mark as undone in messages
      let updatedMessages = state.messages;
      for (const msg of state.messages) {
        if (msg.actions?.some((a) => a.id === action.actionId)) {
          updatedMessages = updateMessageActions(
            updatedMessages,
            msg.id,
            action.actionId,
            (a) => ({ ...a, status: 'undone' })
          );
          break;
        }
      }
      return {
        ...state,
        messages: updatedMessages,
        undoableActions: state.undoableActions.filter((a) => a.id !== action.actionId),
      };
    }

    case 'UPDATE_SESSION_CONTEXT':
      return {
        ...state,
        sessionContext: { ...state.sessionContext, ...action.payload },
      };

    case 'CLEAR_CONVERSATION':
      return {
        ...initialState,
        sessionContext: state.sessionContext, // Preserve context
        sessionActions: state.sessionActions, // Preserve session history
      };

    case 'ADD_SYSTEM_MESSAGE': {
      const systemMessage: Message = {
        id: generateId(),
        type: 'system',
        content: action.content,
        timestamp: new Date(),
      };
      return {
        ...state,
        messages: [...state.messages, systemMessage],
      };
    }

    case 'SET_FOCUSED_ORG':
      return {
        ...state,
        sessionContext: {
          ...state.sessionContext,
          focusedOrgId: action.orgId,
          focusedOrgName: action.orgName,
        },
      };

    case 'ADD_SESSION_ACTION':
      return {
        ...state,
        sessionActions: [...state.sessionActions, action.action],
      };

    case 'MARK_SESSION_ACTION_UNDONE':
      return {
        ...state,
        sessionActions: state.sessionActions.map((a) =>
          a.id === action.actionId ? { ...a, status: 'undone' as const } : a
        ),
      };

    case 'CLEAR_SESSION_HISTORY':
      return {
        ...state,
        sessionActions: [],
      };

    default:
      return state;
  }
}

// ============ HOOK ============

export interface UseConversationReturn {
  // State
  state: ConversationState;
  messages: Message[];
  input: string;
  isProcessing: boolean;
  undoableActions: ExtractedAction[];
  sessionContext: SessionContext;
  sessionActions: SessionAction[];

  // Actions
  setInput: (value: string) => void;
  sendMessage: (content: string) => string; // Returns AI message ID
  setAIResponse: (messageId: string, actions: ExtractedAction[], content?: string) => void;
  setAIError: (messageId: string, error: string) => void;
  confirmAction: (messageId: string, actionId: string) => void;
  rejectAction: (messageId: string, actionId: string) => void;
  executeAction: (messageId: string, actionId: string, result: ExecutionResult) => void;
  changeActionType: (messageId: string, actionId: string, newActionType: CommandAction) => void;
  answerClarification: (messageId: string, actionId: string, answers: Record<string, string | ClarificationOption>, refinedAction: CommandAction, refinedFields: Record<string, any>) => void;
  addUndoable: (action: ExtractedAction) => void;
  removeUndoable: (actionId: string) => void;
  undoAction: (actionId: string) => void;
  updateSessionContext: (context: Partial<SessionContext>) => void;
  setFocusedOrg: (orgId: string | null, orgName: string | null) => void;
  addSessionAction: (action: SessionAction) => void;
  markSessionActionUndone: (actionId: string) => void;
  clearSessionHistory: () => void;
  clearConversation: () => void;
  addSystemMessage: (content: string) => void;

  // Refs
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function useConversation(): UseConversationReturn {
  const [state, dispatch] = useReducer(conversationReducer, initialState);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAIMessageIdRef = useRef<string>('');

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  // Undo timer management - remove expired undoables
  useEffect(() => {
    if (state.undoableActions.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      state.undoableActions.forEach((action) => {
        if (action.undoExpiresAt && action.undoExpiresAt < now) {
          dispatch({ type: 'REMOVE_UNDOABLE', actionId: action.id });
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.undoableActions]);

  // Memoized action creators
  const setInput = useCallback((value: string) => {
    dispatch({ type: 'SET_INPUT', payload: value });
  }, []);

  const sendMessage = useCallback((content: string): string => {
    // Generate AI message ID FIRST, pass it to reducer so they match
    const aiMessageId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    dispatch({ type: 'SEND_MESSAGE', payload: { content, aiMessageId } });
    lastAIMessageIdRef.current = aiMessageId;
    return aiMessageId;
  }, []);

  const setAIResponse = useCallback(
    (messageId: string, actions: ExtractedAction[], content?: string) => {
      dispatch({ type: 'AI_RESPONSE', messageId, payload: { actions, content } });
    },
    []
  );

  const setAIError = useCallback((messageId: string, error: string) => {
    dispatch({ type: 'AI_ERROR', messageId, error });
  }, []);

  const confirmAction = useCallback((messageId: string, actionId: string) => {
    dispatch({ type: 'CONFIRM_ACTION', messageId, actionId });
  }, []);

  const rejectAction = useCallback((messageId: string, actionId: string) => {
    dispatch({ type: 'REJECT_ACTION', messageId, actionId });
  }, []);

  const executeAction = useCallback(
    (messageId: string, actionId: string, result: ExecutionResult) => {
      dispatch({ type: 'EXECUTE_ACTION', messageId, actionId, result });
    },
    []
  );

  const changeActionType = useCallback(
    (messageId: string, actionId: string, newActionType: CommandAction) => {
      dispatch({ type: 'CHANGE_ACTION_TYPE', messageId, actionId, newActionType });
    },
    []
  );

  const answerClarification = useCallback(
    (
      messageId: string,
      actionId: string,
      answers: Record<string, string | ClarificationOption>,
      refinedAction: CommandAction,
      refinedFields: Record<string, any>
    ) => {
      dispatch({ type: 'ANSWER_CLARIFICATION', messageId, actionId, answers, refinedAction, refinedFields });
    },
    []
  );

  const addUndoable = useCallback((action: ExtractedAction) => {
    dispatch({ type: 'ADD_UNDOABLE', action });
  }, []);

  const removeUndoable = useCallback((actionId: string) => {
    dispatch({ type: 'REMOVE_UNDOABLE', actionId });
  }, []);

  const undoAction = useCallback((actionId: string) => {
    dispatch({ type: 'UNDO_ACTION', actionId });
  }, []);

  const updateSessionContext = useCallback((context: Partial<SessionContext>) => {
    dispatch({ type: 'UPDATE_SESSION_CONTEXT', payload: context });
  }, []);

  const clearConversation = useCallback(() => {
    dispatch({ type: 'CLEAR_CONVERSATION' });
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    dispatch({ type: 'ADD_SYSTEM_MESSAGE', content });
  }, []);

  const setFocusedOrg = useCallback((orgId: string | null, orgName: string | null) => {
    dispatch({ type: 'SET_FOCUSED_ORG', orgId, orgName });
  }, []);

  const addSessionAction = useCallback((action: SessionAction) => {
    dispatch({ type: 'ADD_SESSION_ACTION', action });
  }, []);

  const markSessionActionUndone = useCallback((actionId: string) => {
    dispatch({ type: 'MARK_SESSION_ACTION_UNDONE', actionId });
  }, []);

  const clearSessionHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_SESSION_HISTORY' });
  }, []);

  return {
    state,
    messages: state.messages,
    input: state.input,
    isProcessing: state.isProcessing,
    undoableActions: state.undoableActions,
    sessionContext: state.sessionContext,
    sessionActions: state.sessionActions,
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
    addSystemMessage,
    messagesEndRef,
  };
}

export default useConversation;
