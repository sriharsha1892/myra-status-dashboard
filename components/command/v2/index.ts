/**
 * Command Center V2 - Conversational AI Experience
 * Barrel exports for all v2 components
 */

// Main component
export { CommandCenterV2 } from './CommandCenterV2';

// State management
export { useConversation, type ExtractedAction, type Message, type SessionContext, type SessionAction, type ConversationState } from './useConversation';

// UI Components
export { ConversationStream } from './ConversationStream';
export { MessageBubble, CompactMessageBubble } from './MessageBubble';
export { AIResponse, AIResponseSummary } from './AIResponse';
export { ActionPreview } from './ActionPreview';
export { CommandInput } from './CommandInput';
export { SmartSuggestions } from './SmartSuggestions';
export { UndoRail, InlineUndoButton } from './UndoRail';
export { ThinkingIndicator, ThinkingDots } from './ThinkingIndicator';
export { ReasoningPanel } from './ReasoningPanel';
export { ActionChips } from './ActionChips';
export { ClarificationCard, type ClarificationRequest, type ClarificationOption } from './ClarificationCard';
export { TypingHints } from './TypingHints';

// V2 Power User Components
export { ContextSidebar } from './ContextSidebar';
export { SessionHistoryPanel } from './SessionHistoryPanel';
export { SmartSuggestionsV2 } from './SmartSuggestionsV2';
