/**
 * ConversationStream - Message list with auto-scroll
 */

'use client';

import { useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Message, ExtractedAction } from './useConversation';
import { MessageBubble } from './MessageBubble';
import { AIResponse } from './AIResponse';
import type { ClarificationOption } from '@/lib/command/clarificationEngine';

interface ConversationStreamProps {
  messages: Message[];
  onConfirmAction: (messageId: string, actionId: string) => void;
  onRejectAction: (messageId: string, actionId: string) => void;
  onUndoAction?: (actionId: string) => void;
  onChangeAction?: (messageId: string, actionId: string, newActionType: string) => void;
  onAnswerClarification?: (messageId: string, actionId: string, answers: Record<string, string | ClarificationOption>) => void;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
}

export function ConversationStream({
  messages,
  onConfirmAction,
  onRejectAction,
  onUndoAction,
  onChangeAction,
  onAnswerClarification,
  messagesEndRef,
}: ConversationStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const localEndRef = useRef<HTMLDivElement>(null);
  const endRef = messagesEndRef || localEndRef;

  // Auto-scroll on new messages
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, endRef]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-6 py-8 space-y-6"
    >
      <AnimatePresence mode="popLayout">
        {messages.map((message, index) => {
          const isLatest = index === messages.length - 1;

          // For AI messages with actions, render AIResponse inside
          if (message.type === 'ai' && message.actions && message.actions.length > 0) {
            const handleConfirmAll = () => {
              message.actions?.filter(a => a.status === 'pending').forEach(a => {
                onConfirmAction(message.id, a.id);
              });
            };

            const handleRejectAll = () => {
              message.actions?.filter(a => a.status === 'pending').forEach(a => {
                onRejectAction(message.id, a.id);
              });
            };

            return (
              <MessageBubble key={message.id} message={message} isLatest={isLatest}>
                <AIResponse
                  actions={message.actions}
                  onConfirm={(actionId) => onConfirmAction(message.id, actionId)}
                  onReject={(actionId) => onRejectAction(message.id, actionId)}
                  onConfirmAll={handleConfirmAll}
                  onRejectAll={handleRejectAll}
                  onUndo={onUndoAction}
                  onChangeAction={onChangeAction ? (actionId, newType) => onChangeAction(message.id, actionId, newType) : undefined}
                  onAnswerClarification={onAnswerClarification ? (actionId, answers) => onAnswerClarification(message.id, actionId, answers) : undefined}
                />
              </MessageBubble>
            );
          }

          return (
            <MessageBubble key={message.id} message={message} isLatest={isLatest} />
          );
        })}
      </AnimatePresence>

      {/* Scroll anchor */}
      <div ref={endRef} />
    </div>
  );
}

// Empty state for when there are no messages
function EmptyState() {
  return (
    <div className="text-center px-6 max-w-lg">
      <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-accent-50 to-accent-100
        border border-accent-200 flex items-center justify-center shadow-md">
        <svg
          className="w-10 h-10 text-accent-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        What would you like to do?
      </h3>
      <p className="text-sm text-gray-500 mb-8">
        Type naturally - I'll understand.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <ExampleChip text="Log activity" />
        <ExampleChip text="Update deal" />
        <ExampleChip text="Add note" />
      </div>
    </div>
  );
}

function ExampleChip({ text }: { text: string }) {
  return (
    <button className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl
      text-sm text-gray-700 shadow-sm
      hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 hover:shadow-md
      active:scale-[0.98] transition-all duration-200 cursor-pointer">
      {text}
    </button>
  );
}

export default ConversationStream;
